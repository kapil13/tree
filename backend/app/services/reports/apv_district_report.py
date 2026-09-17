"""Amrit Poshan Vatika district rollup with nutrition outcome aggregates."""

from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.reports.district_rollup import build_district_rollup
from app.services.reports.plantation_extended_reports import _filter_projects
from app.services.reports.plantation_reports import _load_accessible_projects, project_location_meta
from app.services.schemes.nutri_outcomes import nutri_outcome_summary

APV_SCHEME_CODE = "raj_amrit_poshan_vatika"


def _empty_outcome_bucket() -> dict[str, Any]:
    return {
        "beneficiary_households": 0,
        "harvest_log_count": 0,
        "total_harvest_kg": 0.0,
        "sites_with_harvest": 0,
    }


async def build_apv_district_report(
    db: AsyncSession,
    user,
    *,
    state_code: str | None = None,
    district_code: str | None = None,
    financial_year: str | None = None,
    group_by: str = "district",
) -> dict[str, Any]:
    base = await build_district_rollup(
        db,
        user,
        state_code=state_code,
        district_code=district_code,
        financial_year=financial_year,
        scheme_code=APV_SCHEME_CODE,
        group_by=group_by,  # type: ignore[arg-type]
    )

    projects = _filter_projects(
        await _load_accessible_projects(db, user),
        state_code=state_code,
        district_code=district_code,
        financial_year=financial_year,
        scheme_code=APV_SCHEME_CODE,
    )

    outcome_by_key: dict[str, dict[str, Any]] = defaultdict(_empty_outcome_bucket)
    totals = _empty_outcome_bucket()

    for project in projects:
        loc = project_location_meta(project)
        key_parts = [
            loc.get("state_code") or "",
            loc.get("state_name") or "",
            loc.get("district_code") or "",
            loc.get("district_name") or "",
        ]
        if group_by == "block":
            key_parts.append(loc.get("block_name") or "")
        key = "|".join(key_parts)

        summary = nutri_outcome_summary(project.metadata_ or {})
        bucket = outcome_by_key[key]
        households = int(summary.get("beneficiary_households") or 0)
        harvest_count = int(summary.get("harvest_log_count") or 0)
        harvest_kg = float(summary.get("total_harvest_kg") or 0)

        bucket["beneficiary_households"] += households
        bucket["harvest_log_count"] += harvest_count
        bucket["total_harvest_kg"] = round(bucket["total_harvest_kg"] + harvest_kg, 2)
        if harvest_count > 0:
            bucket["sites_with_harvest"] += 1

        totals["beneficiary_households"] += households
        totals["harvest_log_count"] += harvest_count
        totals["total_harvest_kg"] = round(totals["total_harvest_kg"] + harvest_kg, 2)
        if harvest_count > 0:
            totals["sites_with_harvest"] += 1

    for item in base["items"]:
        key_parts = [
            item.get("state_code") or "",
            item.get("state_name") or "",
            item.get("district_code") or "",
            item.get("district_name") or "",
        ]
        if group_by == "block":
            key_parts.append(item.get("block_name") or "")
        key = "|".join(key_parts)
        item["outcomes"] = outcome_by_key.get(key, _empty_outcome_bucket())

    base["report"] = "apv_district"
    base["scheme_code"] = APV_SCHEME_CODE
    base["scheme_label"] = "Amrit Poshan Vatika — Rajasthan Nutri-Garden"
    base["outcome_totals"] = totals
    base["generated_at"] = datetime.now(UTC).isoformat()
    return base
