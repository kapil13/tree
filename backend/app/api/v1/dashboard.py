"""Dashboard aggregation endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Query
from sqlalchemy import case, func, select

from app.api.v1.deps import DB, CurrentUser
from app.models.bioacoustic_recording import BioacousticRecording
from app.models.plantation_fence import PlantationFence
from app.models.tree import Tree
from app.schemas.dashboard import KPI, BioacousticDashboardKpi, DashboardResponse, SeriesPoint
from app.schemas.threat_watch import ThreatWatchResponse
from app.services.dashboard.carbon_series import build_carbon_growth_series
from app.services.dashboard.kpi_uncertainty import portfolio_co2e_uncertainty
from app.services.data_scope import apply_owner_org_scope, apply_tree_scope
from app.services.planting_projects.access import load_project
from app.services.threats.watch import build_portfolio_threat_watch

router = APIRouter(tags=["dashboard"])


async def _scoped_tree_stmt(stmt, user, db, project_id: uuid.UUID | None):
    stmt = await apply_tree_scope(stmt, user, db)
    if project_id is not None:
        stmt = stmt.where(Tree.project_id == project_id)
    return stmt


@router.get("/dashboard", response_model=DashboardResponse)
async def dashboard(
    user: CurrentUser,
    db: DB,
    project_id: uuid.UUID | None = Query(None),
) -> DashboardResponse:
    if project_id is not None:
        await load_project(project_id, user, db)

    base = select(
        func.count(Tree.id).label("total_trees"),
        func.coalesce(func.sum(Tree.current_carbon_kg), 0).label("total_carbon_kg"),
        func.coalesce(
            func.sum(
                case((Tree.current_health == "healthy", 1), else_=0)
            ),
            0,
        ).label("healthy"),
        func.coalesce(
            func.sum(case((Tree.satellite_verified.is_(True), 1), else_=0)),
            0,
        ).label("sat_verified"),
    )
    row = (await db.execute(await _scoped_tree_stmt(base, user, db, project_id))).one()

    total_trees = int(row.total_trees)
    total_carbon = float(row.total_carbon_kg or 0)
    # Heuristic projection
    total_biomass = total_carbon / 0.47 if total_carbon else 0.0
    total_co2e = total_carbon * (44.0 / 12.0)
    annual_seq = total_co2e * 0.07  # ~7% growth per year heuristic
    lifetime_credits = (total_co2e * 5) / 1000.0
    revenue = lifetime_credits * 12.0 * 0.55
    uncertainty = portfolio_co2e_uncertainty(total_co2e, total_trees)

    kpi = KPI(
        total_trees=total_trees,
        total_biomass_kg=round(total_biomass, 2),
        total_carbon_kg=round(total_carbon, 2),
        total_co2e_kg=round(total_co2e, 2),
        co2e_kg_lower_90=uncertainty.get("co2e_kg_lower_90"),
        co2e_kg_upper_90=uncertainty.get("co2e_kg_upper_90"),
        uncertainty_pct=uncertainty.get("uncertainty_pct"),
        annual_sequestration_kg=round(annual_seq, 2),
        lifetime_credits_tco2e=round(lifetime_credits, 3),
        estimated_revenue_usd=round(revenue, 2),
        pct_healthy=round((row.healthy / total_trees * 100) if total_trees else 0, 1),
        pct_satellite_verified=round(
            (row.sat_verified / total_trees * 100) if total_trees else 0, 1
        ),
    )

    health_stmt = select(
        Tree.current_health, func.count(Tree.id)
    ).group_by(Tree.current_health)
    health_rows = (
        await db.execute(await _scoped_tree_stmt(health_stmt, user, db, project_id))
    ).all()

    species_stmt = (
        select(Tree.species_text, func.count(Tree.id))
        .group_by(Tree.species_text)
        .order_by(func.count(Tree.id).desc())
        .limit(8)
    )
    species_rows = (
        await db.execute(await _scoped_tree_stmt(species_stmt, user, db, project_id))
    ).all()

    carbon_growth = await build_carbon_growth_series(db, user, project_id=project_id)

    all_bio_stmt = apply_owner_org_scope(
        select(BioacousticRecording),
        user,
        owner_col=BioacousticRecording.owner_user_id,
        org_col=BioacousticRecording.organization_id,
    )
    if project_id is not None:
        fence_ids = [
            row[0]
            for row in (
                await db.execute(
                    select(PlantationFence.id).where(PlantationFence.project_id == project_id)
                )
            ).all()
        ]
        if fence_ids:
            all_bio_stmt = all_bio_stmt.where(
                BioacousticRecording.plantation_fence_id.in_(fence_ids)
            )
        else:
            all_bio_stmt = all_bio_stmt.where(BioacousticRecording.id.is_(None))
    all_bio = (await db.execute(all_bio_stmt)).scalars().all()
    bio_analyzed = [r for r in all_bio if r.status == "analyzed"]
    bio_kpi = BioacousticDashboardKpi(
        total_recordings=len(all_bio),
        avg_health_score=round(
            sum(float(r.bioacoustic_health_score or 0) for r in bio_analyzed) / len(bio_analyzed), 2
        )
        if bio_analyzed
        else 0.0,
        avg_shannon_index=round(
            sum(float(r.shannon_diversity_index or 0) for r in bio_analyzed) / len(bio_analyzed), 4
        )
        if bio_analyzed
        else 0.0,
        avg_simpson_index=round(
            sum(float(r.simpson_diversity_index or 0) for r in bio_analyzed) / len(bio_analyzed), 4
        )
        if bio_analyzed
        else 0.0,
        total_species_detected=len(
            {
                d.get("scientific_name")
                for r in bio_analyzed
                for d in (r.species_detections or [])
                if d.get("scientific_name")
            }
        ),
    )

    return DashboardResponse(
        kpi=kpi,
        carbon_growth=carbon_growth,
        health_distribution=[
            SeriesPoint(label=h or "unknown", value=float(c)) for h, c in health_rows
        ],
        species_distribution=[
            SeriesPoint(label=s or "unknown", value=float(c)) for s, c in species_rows
        ],
        bioacoustic=bio_kpi,
    )


@router.get("/dashboard/threat-watch", response_model=ThreatWatchResponse)
async def threat_watch(user: CurrentUser, db: DB, limit: int = 12) -> ThreatWatchResponse:
    """Location-specific weather, pest/disease, and locust early warnings."""
    data = await build_portfolio_threat_watch(db, user=user, limit=min(limit, 20))
    return ThreatWatchResponse.model_validate(data)
