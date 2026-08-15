"""VM0047 project accounting — baseline, additionality, leakage, pools, summary."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plantation_fence import PlantationFence
from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.models.vm0047_accounting import (
    AdditionalityAssessment,
    LeakageAccount,
    ProjectBaseline,
    ProjectCarbonPools,
)
from app.services.carbon.pools import compute_carbon_pools
from app.services.carbon.risk_ops import latest_risk_assessment
from app.services.credits.ledger import get_or_create_ledger


def _baseline_dict(row: ProjectBaseline) -> dict[str, Any]:
    net = float(row.baseline_removals_tco2e) - float(row.baseline_emissions_tco2e)
    return {
        "id": str(row.id),
        "project_id": str(row.project_id),
        "scenario": row.scenario,
        "land_cover_class": row.land_cover_class,
        "description": row.description,
        "baseline_emissions_tco2e": float(row.baseline_emissions_tco2e),
        "baseline_removals_tco2e": float(row.baseline_removals_tco2e),
        "net_baseline_tco2e": round(net, 4),
        "effective_from": row.effective_from.isoformat() if row.effective_from else None,
        "created_at": row.created_at.isoformat(),
        "metadata": row.metadata_ or {},
    }


def _additionality_dict(row: AdditionalityAssessment) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "project_id": str(row.project_id),
        "status": row.status,
        "score_pct": float(row.score_pct),
        "narrative": row.narrative,
        "factors": row.factors or {},
        "assessed_at": row.assessed_at.isoformat(),
        "assessor_id": str(row.assessor_id) if row.assessor_id else None,
    }


def _leakage_dict(row: LeakageAccount) -> dict[str, Any]:
    net = max(
        0.0,
        float(row.estimated_leakage_tco2e) - float(row.mitigation_tco2e),
    )
    return {
        "id": str(row.id),
        "project_id": str(row.project_id),
        "leakage_type": row.leakage_type,
        "estimated_leakage_tco2e": float(row.estimated_leakage_tco2e),
        "mitigation_tco2e": float(row.mitigation_tco2e),
        "net_leakage_tco2e": round(net, 4),
        "notes": row.notes,
        "period_start": row.period_start.isoformat() if row.period_start else None,
        "period_end": row.period_end.isoformat() if row.period_end else None,
        "created_at": row.created_at.isoformat(),
    }


def _pools_dict(row: ProjectCarbonPools | None, *, sample_pools: dict[str, float] | None = None) -> dict[str, Any]:
    if row is None:
        return {
            "deadwood_ratio": 0.08,
            "litter_ratio": 0.04,
            "soc_tco2e_per_ha": None,
            "area_ha": None,
            "sample_tree_pools": sample_pools,
        }
    return {
        "deadwood_ratio": float(row.deadwood_ratio),
        "litter_ratio": float(row.litter_ratio),
        "soc_tco2e_per_ha": float(row.soc_tco2e_per_ha) if row.soc_tco2e_per_ha is not None else None,
        "area_ha": float(row.area_ha) if row.area_ha is not None else None,
        "updated_at": row.updated_at.isoformat(),
        "sample_tree_pools": sample_pools,
    }


async def list_baselines(db: AsyncSession, project_id: uuid.UUID) -> list[dict[str, Any]]:
    rows = (
        await db.execute(
            select(ProjectBaseline)
            .where(ProjectBaseline.project_id == project_id)
            .order_by(ProjectBaseline.created_at.desc())
            .limit(20)
        )
    ).scalars().all()
    return [_baseline_dict(r) for r in rows]


async def create_baseline(
    db: AsyncSession,
    *,
    project: PlantingProject,
    scenario: str,
    land_cover_class: str | None,
    description: str | None,
    baseline_emissions_tco2e: float,
    baseline_removals_tco2e: float,
    created_by: uuid.UUID,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    row = ProjectBaseline(
        project_id=project.id,
        scenario=scenario,
        land_cover_class=land_cover_class,
        description=description,
        baseline_emissions_tco2e=baseline_emissions_tco2e,
        baseline_removals_tco2e=baseline_removals_tco2e,
        effective_from=datetime.now(UTC),
        created_by=created_by,
        metadata_=metadata or {},
    )
    db.add(row)
    await db.flush()
    return _baseline_dict(row)


async def list_additionality(db: AsyncSession, project_id: uuid.UUID) -> list[dict[str, Any]]:
    rows = (
        await db.execute(
            select(AdditionalityAssessment)
            .where(AdditionalityAssessment.project_id == project_id)
            .order_by(AdditionalityAssessment.assessed_at.desc())
            .limit(20)
        )
    ).scalars().all()
    return [_additionality_dict(r) for r in rows]


async def create_additionality(
    db: AsyncSession,
    *,
    project: PlantingProject,
    status: str,
    score_pct: float,
    narrative: str | None,
    factors: dict[str, Any],
    assessor_id: uuid.UUID,
) -> dict[str, Any]:
    row = AdditionalityAssessment(
        project_id=project.id,
        status=status,
        score_pct=score_pct,
        narrative=narrative,
        factors=factors,
        assessor_id=assessor_id,
    )
    db.add(row)
    await db.flush()
    return _additionality_dict(row)


async def list_leakage(db: AsyncSession, project_id: uuid.UUID) -> list[dict[str, Any]]:
    rows = (
        await db.execute(
            select(LeakageAccount)
            .where(LeakageAccount.project_id == project_id)
            .order_by(LeakageAccount.created_at.desc())
            .limit(20)
        )
    ).scalars().all()
    return [_leakage_dict(r) for r in rows]


async def create_leakage(
    db: AsyncSession,
    *,
    project: PlantingProject,
    leakage_type: str,
    estimated_leakage_tco2e: float,
    mitigation_tco2e: float,
    notes: str | None,
    created_by: uuid.UUID,
) -> dict[str, Any]:
    row = LeakageAccount(
        project_id=project.id,
        leakage_type=leakage_type,
        estimated_leakage_tco2e=estimated_leakage_tco2e,
        mitigation_tco2e=mitigation_tco2e,
        notes=notes,
        created_by=created_by,
    )
    db.add(row)
    await db.flush()
    return _leakage_dict(row)


async def get_carbon_pools(db: AsyncSession, project_id: uuid.UUID) -> ProjectCarbonPools | None:
    return (
        await db.execute(
            select(ProjectCarbonPools).where(ProjectCarbonPools.project_id == project_id)
        )
    ).scalar_one_or_none()


async def upsert_carbon_pools(
    db: AsyncSession,
    *,
    project: PlantingProject,
    deadwood_ratio: float,
    litter_ratio: float,
    soc_tco2e_per_ha: float | None,
    area_ha: float | None,
    updated_by: uuid.UUID,
) -> dict[str, Any]:
    row = await get_carbon_pools(db, project.id)
    if row is None:
        row = ProjectCarbonPools(project_id=project.id)
        db.add(row)
    row.deadwood_ratio = deadwood_ratio
    row.litter_ratio = litter_ratio
    row.soc_tco2e_per_ha = soc_tco2e_per_ha
    row.area_ha = area_ha
    row.updated_by = updated_by
    row.updated_at = datetime.now(UTC)
    await db.flush()
    return _pools_dict(row)


async def _project_area_ha(db: AsyncSession, project_id: uuid.UUID) -> float:
    res = await db.execute(
        select(func.coalesce(func.sum(PlantationFence.area_ha), 0)).where(
            PlantationFence.project_id == project_id
        )
    )
    return float(res.scalar_one() or 0)


async def _sample_tree_pools(
    db: AsyncSession,
    project: PlantingProject,
    pools_row: ProjectCarbonPools | None,
) -> dict[str, float] | None:
    tree = (
        await db.execute(
            select(Tree)
            .where(Tree.project_id == project.id, Tree.status != "removed", Tree.current_carbon_kg > 0)
            .order_by(Tree.current_carbon_kg.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if tree is None or not tree.current_carbon_kg:
        return None

    carbon_kg = float(tree.current_carbon_kg)
    cf = 0.47
    living_biomass = carbon_kg / cf
    agb = living_biomass * 0.77
    bgb = living_biomass * 0.23
    deadwood_ratio = float(pools_row.deadwood_ratio) if pools_row else 0.08
    litter_ratio = float(pools_row.litter_ratio) if pools_row else 0.04
    area_ha = float(pools_row.area_ha) if pools_row and pools_row.area_ha else None
    if area_ha is None:
        area_ha = await _project_area_ha(db, project.id) or None
    soc = float(pools_row.soc_tco2e_per_ha) if pools_row and pools_row.soc_tco2e_per_ha else None

    breakdown = compute_carbon_pools(
        agb_kg=agb,
        bgb_kg=bgb,
        carbon_fraction=cf,
        deadwood_ratio=deadwood_ratio,
        litter_ratio=litter_ratio,
        soc_tco2e_per_ha=soc,
        area_ha=area_ha,
    )
    return breakdown.to_dict()


async def build_vm0047_summary(db: AsyncSession, project: PlantingProject) -> dict[str, Any]:
    baselines = await list_baselines(db, project.id)
    additionality = await list_additionality(db, project.id)
    leakage_rows = await list_leakage(db, project.id)
    pools_row = await get_carbon_pools(db, project.id)
    sample_pools = await _sample_tree_pools(db, project, pools_row)

    ledger = await get_or_create_ledger(db, project)
    risk = await latest_risk_assessment(db, project.id)

    gross = float(ledger.gross_credits_tco2e) if ledger else 0.0
    buffer = float(ledger.buffer_withheld_tco2e) if ledger else 0.0
    net_ledger = float(ledger.net_credits_tco2e) if ledger else 0.0

    latest_baseline = baselines[0] if baselines else None
    latest_additionality = additionality[0] if additionality else None
    total_leakage = sum(r["net_leakage_tco2e"] for r in leakage_rows)

    incremental_after_baseline = gross
    if latest_baseline:
        incremental_after_baseline = max(0.0, gross - latest_baseline["net_baseline_tco2e"])

    creditable_after_leakage = max(0.0, incremental_after_baseline - total_leakage)

    gaps: list[str] = []
    if not latest_baseline:
        gaps.append("baseline_not_documented")
    if not latest_additionality:
        gaps.append("additionality_not_assessed")
    elif latest_additionality["score_pct"] < 60:
        gaps.append("additionality_score_low")
    if not leakage_rows:
        gaps.append("leakage_not_accounted")
    if risk is None:
        gaps.append("nprt_not_assessed")

    readiness = "ready" if not gaps else "gaps_identified"
    if not latest_baseline or not latest_additionality:
        readiness = "not_started" if not baselines and not additionality else "in_progress"

    return {
        "standard": "Verra VM0047 v1.0",
        "project_id": str(project.id),
        "project_code": project.code,
        "methodology": ledger.methodology if ledger else "VERRA_VM0047",
        "ledger": {
            "gross_credits_tco2e": round(gross, 4),
            "buffer_withheld_tco2e": round(buffer, 4),
            "net_credits_tco2e": round(net_ledger, 4),
            "status": ledger.status if ledger else "draft",
        },
        "baseline": latest_baseline,
        "additionality": latest_additionality,
        "leakage": {
            "entries": leakage_rows,
            "total_net_leakage_tco2e": round(total_leakage, 4),
        },
        "carbon_pools": _pools_dict(pools_row, sample_pools=sample_pools),
        "nprt": {
            "nprt_score": float(risk.nprt_score) if risk else None,
            "buffer_pct": float(risk.buffer_pct) if risk else None,
            "assessed_at": risk.assessed_at.isoformat() if risk else None,
        },
        "quantification": {
            "incremental_after_baseline_tco2e": round(incremental_after_baseline, 4),
            "creditable_after_leakage_tco2e": round(creditable_after_leakage, 4),
            "includes_other_pools": sample_pools is not None,
        },
        "readiness_status": readiness,
        "gaps": gaps,
        "disclaimer": (
            "VM0047 accounting summary for audit preparation. Does not constitute "
            "Verra certification or credit issuance."
        ),
        "computed_at": datetime.now(UTC).isoformat(),
    }
