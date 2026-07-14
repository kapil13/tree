"""Dashboard aggregation endpoints."""

from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import case, func, select

from app.api.v1.deps import DB, CurrentUser
from app.models.bioacoustic_recording import BioacousticRecording
from app.models.tree import Tree
from app.schemas.dashboard import KPI, BioacousticDashboardKpi, DashboardResponse, SeriesPoint

router = APIRouter(tags=["dashboard"])


def _scope(stmt, user):
    if user.role == "admin":
        return stmt
    if user.organization_id:
        return stmt.where(
            (Tree.owner_user_id == user.id) | (Tree.organization_id == user.organization_id)
        )
    return stmt.where(Tree.owner_user_id == user.id)


def _bioacoustic_scope(stmt, user):
    if user.role == "admin":
        return stmt
    if user.organization_id:
        return stmt.where(
            (BioacousticRecording.owner_user_id == user.id)
            | (BioacousticRecording.organization_id == user.organization_id)
        )
    return stmt.where(BioacousticRecording.owner_user_id == user.id)


@router.get("/dashboard", response_model=DashboardResponse)
async def dashboard(user: CurrentUser, db: DB) -> DashboardResponse:
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
    row = (await db.execute(_scope(base, user))).one()

    total_trees = int(row.total_trees)
    total_carbon = float(row.total_carbon_kg or 0)
    # Heuristic projection
    total_biomass = total_carbon / 0.47 if total_carbon else 0.0
    total_co2e = total_carbon * (44.0 / 12.0)
    annual_seq = total_co2e * 0.07  # ~7% growth per year heuristic
    lifetime_credits = (total_co2e * 5) / 1000.0
    revenue = lifetime_credits * 12.0 * 0.55

    kpi = KPI(
        total_trees=total_trees,
        total_biomass_kg=round(total_biomass, 2),
        total_carbon_kg=round(total_carbon, 2),
        total_co2e_kg=round(total_co2e, 2),
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
    health_rows = (await db.execute(_scope(health_stmt, user))).all()

    species_stmt = (
        select(Tree.species_text, func.count(Tree.id))
        .group_by(Tree.species_text)
        .order_by(func.count(Tree.id).desc())
        .limit(8)
    )
    species_rows = (await db.execute(_scope(species_stmt, user))).all()

    # Trivial 6-month carbon growth series (front-end can replace with real metrics)
    carbon_growth = [
        SeriesPoint(label=f"M-{i}", value=round(total_carbon * (0.7 + 0.05 * i), 2))
        for i in range(6, 0, -1)
    ]

    all_bio_stmt = _bioacoustic_scope(select(BioacousticRecording), user)
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
