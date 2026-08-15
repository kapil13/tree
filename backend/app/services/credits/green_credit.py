"""MoEFCC Green Credit Programme (Rules 2023) — eligibility and credit estimate.

Simplified in-platform calculator aligned with GCP tree plantation / eco-restoration
activities: density (trees/ha), 5-year monitoring vesting, and land bank registration.
Not a substitute for official MoEFCC registry issuance.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Literal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plantation_fence import PlantationFence
from app.models.planting_project import PlantingProject
from app.models.tree import Tree

GCP_VERSION = "Green Credit Rules 2023 (MoEFCC)"
MONITORING_PERIOD_YEARS = 5

# Minimum stocking density for eligibility (indicative — verifier may adjust).
MIN_TREES_PER_HA: dict[str, float] = {
    "tree_plantation": 400.0,
    "eco_restoration": 200.0,
}

# Indicative GC per eligible tree at full vesting (after 5-year monitoring).
GC_PER_TREE: dict[str, float] = {
    "tree_plantation": 0.25,
    "eco_restoration": 0.15,
}

ActivityType = Literal["tree_plantation", "eco_restoration"]


def _vesting_fraction(project_started_at: datetime | None) -> tuple[float, int]:
    """Return (vesting_fraction 0–1, years_elapsed)."""
    if project_started_at is None:
        return 0.0, 0
    now = datetime.now(UTC)
    started = project_started_at
    if started.tzinfo is None:
        started = started.replace(tzinfo=UTC)
    delta_days = max(0, (now - started).days)
    years = delta_days // 365
    fraction = min(1.0, years / MONITORING_PERIOD_YEARS)
    return round(fraction, 4), years


def _scheme_refs(project: PlantingProject) -> dict[str, Any]:
    meta = project.metadata_ or {}
    return meta.get("scheme_refs") or {}


async def _project_area_and_trees(
    db: AsyncSession, project: PlantingProject
) -> tuple[float, int, list[Tree]]:
    trees = list(
        (
            await db.execute(
                select(Tree).where(Tree.project_id == project.id, Tree.status != "removed")
            )
        ).scalars().all()
    )
    area_res = await db.execute(
        select(func.coalesce(func.sum(PlantationFence.area_ha), 0)).where(
            PlantationFence.project_id == project.id
        )
    )
    total_ha = float(area_res.scalar_one() or 0)
    return total_ha, len(trees), trees


def compute_green_credit_estimate(
    *,
    tree_count: int,
    total_area_ha: float,
    activity_type: ActivityType,
    land_bank_id: str | None,
    project_started_at: datetime | None,
    survival_pct: float | None = None,
) -> dict[str, Any]:
    """Pure calculator — no DB access."""
    min_density = MIN_TREES_PER_HA.get(activity_type, MIN_TREES_PER_HA["tree_plantation"])
    gc_per_tree = GC_PER_TREE.get(activity_type, GC_PER_TREE["tree_plantation"])

    trees_per_ha = round(tree_count / total_area_ha, 2) if total_area_ha > 0 else None
    density_ok = trees_per_ha is not None and trees_per_ha >= min_density
    land_bank_ok = bool(land_bank_id and land_bank_id.strip())

    survival = survival_pct if survival_pct is not None else 100.0
    eligible_trees = int(round(tree_count * min(survival, 100.0) / 100.0)) if tree_count else 0

    vesting_fraction, years_elapsed = _vesting_fraction(project_started_at)
    full_gc = round(eligible_trees * gc_per_tree, 3)
    vested_gc = round(full_gc * vesting_fraction, 3)
    provisional_gc = round(full_gc - vested_gc, 3)

    gaps: list[str] = []
    if not land_bank_ok:
        gaps.append("land_bank_id_missing")
    if total_area_ha <= 0:
        gaps.append("site_area_not_mapped")
    elif not density_ok:
        gaps.append("density_below_minimum")
    if tree_count == 0:
        gaps.append("no_trees_registered")
    if years_elapsed < MONITORING_PERIOD_YEARS:
        gaps.append("monitoring_period_incomplete")

    eligibility = "eligible" if not gaps or gaps == ["monitoring_period_incomplete"] else "gaps_identified"
    if not land_bank_ok or tree_count == 0 or total_area_ha <= 0:
        eligibility = "not_eligible"

    return {
        "standard": GCP_VERSION,
        "activity_type": activity_type,
        "land_bank_id": land_bank_id,
        "tree_count": tree_count,
        "eligible_trees": eligible_trees,
        "total_area_ha": round(total_area_ha, 4) if total_area_ha else 0,
        "trees_per_ha": trees_per_ha,
        "min_trees_per_ha": min_density,
        "density_eligible": density_ok,
        "land_bank_registered": land_bank_ok,
        "survival_pct_assumed": survival,
        "monitoring_period_years": MONITORING_PERIOD_YEARS,
        "years_elapsed": years_elapsed,
        "vesting_fraction": vesting_fraction,
        "gc_per_tree_at_full_vesting": gc_per_tree,
        "full_green_credits": full_gc,
        "vested_green_credits": vested_gc,
        "provisional_green_credits": provisional_gc,
        "eligibility_status": eligibility,
        "gaps": gaps,
        "disclaimer": (
            "Indicative estimate for audit preparation only. Official green credit "
            "issuance requires MoEFCC registry registration and ICFRE-approved verification."
        ),
        "computed_at": datetime.now(UTC).isoformat(),
    }


async def build_project_green_credit_summary(
    db: AsyncSession, project: PlantingProject
) -> dict[str, Any]:
    refs = _scheme_refs(project)
    activity_raw = refs.get("gcp_activity_type") or "tree_plantation"
    activity: ActivityType = (
        "eco_restoration" if activity_raw == "eco_restoration" else "tree_plantation"
    )
    total_ha, tree_count, _trees = await _project_area_and_trees(db, project)

    kpis = (project.metadata_ or {}).get("scheme_kpis") or {}
    survival = kpis.get("survival_pct")
    if survival is not None:
        survival = float(survival)

    estimate = compute_green_credit_estimate(
        tree_count=tree_count,
        total_area_ha=total_ha,
        activity_type=activity,
        land_bank_id=refs.get("green_credit_land_bank_id"),
        project_started_at=project.created_at,
        survival_pct=survival,
    )
    estimate["project_id"] = str(project.id)
    estimate["project_code"] = project.code
    estimate["scheme_code"] = project.scheme_code
    estimate["verifier_reference"] = refs.get("verifier_reference")
    return estimate
