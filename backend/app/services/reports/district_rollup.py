"""District-level plantation rollups for government audience dashboards."""

from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tree import Tree
from app.services.planting_projects.service import project_summary
from app.services.planting_projects.survival_survey import survey_interval_days
from app.services.reports.plantation_extended_reports import _filter_projects
from app.services.reports.plantation_reports import _load_accessible_projects, project_location_meta
from app.services.schemes.kpis import compute_scheme_kpis

GroupBy = Literal["district", "block"]


def _empty_bucket() -> dict[str, Any]:
    return {
        "project_count": 0,
        "target_trees": 0,
        "registered_trees": 0,
        "survival_due": 0,
        "open_violations": 0,
        "scheme_on_track": 0,
        "scheme_at_risk": 0,
        "scheme_off_track": 0,
        "survival_pct_sum": 0.0,
        "survival_pct_weight": 0,
        "geo_tagged_pct_sum": 0.0,
        "geo_tagged_pct_weight": 0,
        "by_scheme": {},
        "by_site_type": {},
    }


def _bucket_key(loc: dict[str, str], *, group_by: GroupBy) -> str:
    parts = [
        loc.get("state_code") or "",
        loc.get("state_name") or "",
        loc.get("district_code") or "",
        loc.get("district_name") or "",
    ]
    if group_by == "block":
        parts.append(loc.get("block_name") or "")
    return "|".join(parts)


def _finalize_bucket(bucket: dict[str, Any]) -> dict[str, Any]:
    target = bucket["target_trees"]
    registered = bucket["registered_trees"]
    bucket["gap"] = max(target - registered, 0)
    bucket["achievement_pct"] = round(100 * registered / target, 1) if target else None
    if bucket["survival_pct_weight"]:
        bucket["avg_survival_pct"] = round(
            bucket["survival_pct_sum"] / bucket["survival_pct_weight"],
            1,
        )
    else:
        bucket["avg_survival_pct"] = None
    if bucket["geo_tagged_pct_weight"]:
        bucket["avg_geo_tagged_pct"] = round(
            bucket["geo_tagged_pct_sum"] / bucket["geo_tagged_pct_weight"],
            1,
        )
    else:
        bucket["avg_geo_tagged_pct"] = None
    for transient in ("survival_pct_sum", "survival_pct_weight", "geo_tagged_pct_sum", "geo_tagged_pct_weight"):
        bucket.pop(transient, None)
    return bucket


async def build_district_rollup(
    db: AsyncSession,
    user,
    *,
    state_code: str | None = None,
    district_code: str | None = None,
    financial_year: str | None = None,
    scheme_code: str | None = None,
    group_by: GroupBy = "district",
) -> dict[str, Any]:
    projects = _filter_projects(
        await _load_accessible_projects(db, user),
        state_code=state_code,
        district_code=district_code,
        financial_year=financial_year,
        scheme_code=scheme_code,
    )

    buckets: dict[str, dict[str, Any]] = defaultdict(_empty_bucket)
    portfolio_by_scheme: dict[str, dict[str, int]] = defaultdict(
        lambda: {"project_count": 0, "registered_trees": 0, "on_track": 0, "at_risk": 0}
    )

    totals = _empty_bucket()

    for project in projects:
        loc = project_location_meta(project)
        key = _bucket_key(loc, group_by=group_by)
        bucket = buckets[key]
        bucket["state_code"] = loc.get("state_code") or ""
        bucket["state_name"] = loc.get("state_name") or ""
        bucket["district_code"] = loc.get("district_code") or ""
        bucket["district_name"] = loc.get("district_name") or ""
        if group_by == "block":
            bucket["block_name"] = loc.get("block_name") or ""

        tree_count = int(
            (
                await db.execute(
                    select(func.count()).where(
                        Tree.project_id == project.id,
                        Tree.status != "removed",
                    )
                )
            ).scalar_one()
            or 0
        )

        interval = survey_interval_days(project)
        cutoff = datetime.now(UTC) - timedelta(days=interval)
        survival_due = int(
            (
                await db.execute(
                    select(func.count()).where(
                        Tree.project_id == project.id,
                        Tree.status != "removed",
                        func.coalesce(Tree.last_geotag_at, Tree.registered_at) <= cutoff,
                    )
                )
            ).scalar_one()
            or 0
        )

        summary = await project_summary(db, project)
        open_violations = int(summary.get("open_violations") or 0)
        kpis = await compute_scheme_kpis(db, project)
        metrics = kpis.get("metrics") or {}
        status = str(kpis.get("status") or "not_applicable")
        scheme = project.scheme_code or "unassigned"

        bucket["project_count"] += 1
        bucket["target_trees"] += int(project.target_tree_count or 0)
        bucket["registered_trees"] += tree_count
        bucket["survival_due"] += survival_due
        bucket["open_violations"] += open_violations

        if status == "on_track":
            bucket["scheme_on_track"] += 1
        elif status == "at_risk":
            bucket["scheme_at_risk"] += 1
        elif status == "off_track":
            bucket["scheme_off_track"] += 1

        survival_pct = metrics.get("survival_pct")
        if survival_pct is not None and tree_count:
            bucket["survival_pct_sum"] += float(survival_pct) * tree_count
            bucket["survival_pct_weight"] += tree_count
        geo_pct = metrics.get("geo_tagged_pct")
        if geo_pct is not None and tree_count:
            bucket["geo_tagged_pct_sum"] += float(geo_pct) * tree_count
            bucket["geo_tagged_pct_weight"] += tree_count

        scheme_bucket = bucket["by_scheme"].setdefault(
            scheme,
            {"project_count": 0, "registered_trees": 0, "on_track": 0, "at_risk": 0},
        )
        scheme_bucket["project_count"] += 1
        scheme_bucket["registered_trees"] += tree_count
        if status == "on_track":
            scheme_bucket["on_track"] += 1
        elif status in {"at_risk", "off_track"}:
            scheme_bucket["at_risk"] += 1

        refs = (project.metadata_ or {}).get("scheme_refs") or {}
        site_type = refs.get("site_type")
        if site_type:
            bucket["by_site_type"][str(site_type)] = bucket["by_site_type"].get(str(site_type), 0) + 1

        totals["project_count"] += 1
        totals["target_trees"] += int(project.target_tree_count or 0)
        totals["registered_trees"] += tree_count
        totals["survival_due"] += survival_due
        totals["open_violations"] += open_violations
        if status == "on_track":
            totals["scheme_on_track"] += 1
        elif status == "at_risk":
            totals["scheme_at_risk"] += 1
        elif status == "off_track":
            totals["scheme_off_track"] += 1
        if survival_pct is not None and tree_count:
            totals["survival_pct_sum"] += float(survival_pct) * tree_count
            totals["survival_pct_weight"] += tree_count
        if geo_pct is not None and tree_count:
            totals["geo_tagged_pct_sum"] += float(geo_pct) * tree_count
            totals["geo_tagged_pct_weight"] += tree_count

        p_scheme = portfolio_by_scheme[scheme]
        p_scheme["project_count"] += 1
        p_scheme["registered_trees"] += tree_count
        if status == "on_track":
            p_scheme["on_track"] += 1
        elif status in {"at_risk", "off_track"}:
            p_scheme["at_risk"] += 1

    items = [_finalize_bucket(b) for b in buckets.values()]
    items.sort(
        key=lambda r: (
            r.get("state_name") or "",
            r.get("district_name") or "",
            r.get("block_name") or "",
        )
    )

    return {
        "report": "district_rollup",
        "generated_at": datetime.now(UTC).isoformat(),
        "filters": {
            "state_code": state_code,
            "district_code": district_code,
            "financial_year": financial_year,
            "scheme_code": scheme_code,
            "group_by": group_by,
        },
        "totals": _finalize_bucket(totals),
        "by_scheme": dict(portfolio_by_scheme),
        "items": items,
        "total": len(items),
    }
