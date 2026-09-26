"""BRSR Principle 6 readiness scoring for the disclosure wizard."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.services.reports.brsr import build_brsr_context
from app.services.reports.brsr_profile import BrsrOrgProfile, profile_disclosure_complete


def _kpi_action(kpi_id: str, data_available: bool) -> str:
    actions = {
        "P6.E1": "Add energy consumption from ERP or utility bills.",
        "P6.E2": "Add water withdrawal data or link Jal Shakti riparian projects.",
        "P6.E3": "Add air emissions from facility monitoring or link emissions panel.",
        "P6.E4": "Register trees and run carbon engine on plantation projects.",
        "P6.E5": "Add waste management data from operations ERP.",
        "P6.E6": "Resolve open compliance violations on plantation projects.",
        "P6.E7": "Register trees and complete biodiversity monitoring on projects.",
        "P6.E8": "Add supplier_ref on project scheme metadata for value-chain linkage.",
    }
    if data_available:
        return "Data mapped — review value summary before export."
    return actions.get(kpi_id, "Provide manual disclosure or link platform data.")


def build_readiness_from_context(
    ctx: dict[str, Any],
    profile: BrsrOrgProfile,
) -> dict[str, Any]:
    kpi_rows = list(ctx.get("core_kpi_mapping") or [])
    value_chain = list(ctx.get("value_chain_annex") or [])

    kpis: list[dict[str, Any]] = []
    available_count = 0
    for row in kpi_rows:
        available = bool(row.get("data_available"))
        if available:
            available_count += 1
        kpis.append(
            {
                "kpi_id": row.get("kpi_id"),
                "name": row.get("name"),
                "data_available": available,
                "value_summary": row.get("value_summary"),
                "platform_source": row.get("platform_source"),
                "notes": row.get("notes"),
                "action": _kpi_action(str(row.get("kpi_id")), available),
            }
        )

    missing_supplier = [
        {
            "project_code": row.get("project_code"),
            "project_name": row.get("project_name"),
            "scheme_code": row.get("scheme_code"),
        }
        for row in value_chain
        if not row.get("supplier_ref")
    ]

    disclosure_complete = profile_disclosure_complete(profile)
    kpi_pct = round((available_count / max(len(kpi_rows), 1)) * 100)
    disclosure_pct = 100 if disclosure_complete else (
        25 if profile.reporting_year else 0
    ) + (25 if profile.cin else 0) + (25 if profile.listed_entity else 0) + (
        25 if profile.assurance_level != "none" or profile.boundary_notes else 0
    )
    disclosure_pct = min(100, disclosure_pct)
    value_chain_pct = 100 if value_chain and not missing_supplier else (
        50 if value_chain else 0
    )
    readiness_pct = round((kpi_pct * 0.5) + (disclosure_pct * 0.25) + (value_chain_pct * 0.25))

    blockers: list[str] = []
    if not disclosure_complete:
        blockers.append("Complete org disclosure (CIN, reporting year, listed entity).")
    if available_count < 2:
        blockers.append("Map at least GHG removals (P6.E4) and biodiversity (P6.E7) data.")
    if missing_supplier and value_chain:
        blockers.append(
            f"{len(missing_supplier)} project(s) missing supplier_ref for P6.E8 value chain."
        )

    return {
        "readiness_pct": readiness_pct,
        "kpi_available_count": available_count,
        "kpi_total": len(kpi_rows),
        "disclosure_complete": disclosure_complete,
        "kpis": kpis,
        "value_chain": {
            "project_count": len(value_chain),
            "missing_supplier_count": len(missing_supplier),
            "missing_supplier_projects": missing_supplier,
        },
        "blockers": blockers,
        "export_ready": readiness_pct >= 50 and disclosure_complete,
    }


async def build_brsr_readiness(
    db: AsyncSession,
    *,
    organization: Organization,
    project_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    from app.services.reports.brsr_profile import get_brsr_profile, profile_to_dict

    profile = get_brsr_profile(organization)
    ctx = await build_brsr_context(
        db,
        organization=organization,
        project_id=project_id,
        brsr_profile=profile,
    )
    readiness = build_readiness_from_context(ctx, profile)
    return {
        "profile": profile_to_dict(profile),
        "scope": ctx.get("scope"),
        "project_id": ctx.get("project_id"),
        "reporting_year": ctx.get("reporting_year"),
        "readiness": readiness,
        "preview": {
            "organization": ctx.get("organization"),
            "core_kpi_mapping": ctx.get("core_kpi_mapping"),
            "value_chain_annex": ctx.get("value_chain_annex"),
            "essential_indicator_ids": [
                ind.get("indicator_id") for ind in ctx.get("essential_indicators") or []
            ],
        },
    }
