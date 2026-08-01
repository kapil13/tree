"""Scheme KPI evaluation against registry targets."""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.services.schemes.registry import get_scheme


async def compute_scheme_kpis(db: AsyncSession, project: PlantingProject) -> dict[str, Any]:
    scheme = get_scheme(project.scheme_code) if project.scheme_code else None
    if scheme is None:
        return {"scheme_code": None, "targets": {}, "metrics": {}, "status": "not_applicable"}

    trees_res = await db.execute(
        select(Tree).where(Tree.project_id == project.id, Tree.status != "removed")
    )
    trees = list(trees_res.scalars().all())
    tree_count = len(trees)
    geo_tagged = sum(1 for t in trees if t.last_geotag_at is not None)
    survival_ok = sum(
        1
        for t in trees
        if str((t.metadata_ or {}).get("survival_status", "unknown")).lower()
        in ("alive", "healthy", "surviving")
    )

    survival_pct = round(100 * survival_ok / tree_count, 1) if tree_count else 0.0
    geo_pct = round(100 * geo_tagged / tree_count, 1) if tree_count else 0.0

    targets = dict(scheme.get("kpi_targets") or {})
    metrics = {
        "tree_count": tree_count,
        "survival_pct": survival_pct,
        "geo_tagged_pct": geo_pct,
    }

    checks: dict[str, bool] = {}
    if "survival_pct_min" in targets:
        checks["survival"] = survival_pct >= float(targets["survival_pct_min"])
    if "geo_tagged_pct_min" in targets:
        checks["geo_tagged"] = geo_pct >= float(targets["geo_tagged_pct_min"])
    if "min_trees" in targets:
        checks["min_trees"] = tree_count >= int(targets["min_trees"])

    if not checks:
        overall = "not_configured"
    elif all(checks.values()):
        overall = "on_track"
    elif any(checks.values()):
        overall = "at_risk"
    else:
        overall = "off_track"

    return {
        "scheme_code": scheme["code"],
        "scheme_label": scheme["label"],
        "ministry": scheme["ministry"],
        "targets": targets,
        "metrics": metrics,
        "checks": checks,
        "status": overall,
    }
