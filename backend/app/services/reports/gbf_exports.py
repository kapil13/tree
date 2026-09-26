"""Kunming-Montreal Global Biodiversity Framework (GBF) indicator mapping (Phase E — E2)."""

from __future__ import annotations

import io
from datetime import UTC, datetime
from typing import Any

from openpyxl import Workbook
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.plantation_fence import PlantationFence
from app.models.planting_project import PlantingProject
from app.services.planting_projects.mrv_export import build_project_mrv_context
from app.services.reports.tnfd import (
    _fence_bioacoustic_summary,
    _fence_iucn_snapshot,
    _fence_ndvi_summary,
)

DISCLAIMER = (
    "GBF indicator narrative from plantation MRV for Targets 2 (restore) and 3 (protect). "
    "Not a CBD national report or TNFD assurance."
)

GBF_TARGETS = [
    {
        "target_id": "GBF-2",
        "title": "Restore degraded ecosystems",
        "indicators": ["trees_planted", "area_ha", "survival_pct", "native_species_pct"],
    },
    {
        "target_id": "GBF-3",
        "title": "Protect threatened species and habitats",
        "indicators": ["threatened_signals", "species_richness", "canopy_ndvi", "open_violations"],
    },
]


async def build_gbf_context(
    db: AsyncSession,
    *,
    organization: Organization,
    project_id: Any | None = None,
) -> dict[str, Any]:
    stmt = select(PlantingProject).where(PlantingProject.organization_id == organization.id)
    if project_id is not None:
        stmt = stmt.where(PlantingProject.id == project_id)
    projects = list((await db.execute(stmt.order_by(PlantingProject.code.asc()))).scalars().all())

    restore_rows: list[dict[str, Any]] = []
    protect_rows: list[dict[str, Any]] = []
    total_trees = 0
    total_area = 0.0
    total_threatened = 0

    for project in projects:
        mrv = await build_project_mrv_context(db, project)
        summary = mrv.get("summary") or {}
        tree_count = int(summary.get("tree_count") or 0)
        total_trees += tree_count

        fences = list(
            (
                await db.execute(
                    select(PlantationFence).where(PlantationFence.project_id == project.id)
                )
            ).scalars().all()
        )
        area_ha = sum(float(f.area_ha or 0) for f in fences)
        total_area += area_ha

        restore_rows.append(
            {
                "project_code": project.code,
                "trees_planted": tree_count,
                "area_ha": round(area_ha, 4),
                "survival_pct": summary.get("survival_pct"),
                "native_species_pct": summary.get("native_species_pct"),
                "open_violations": summary.get("open_violations", 0),
            }
        )

        for fence in fences:
            ndvi = await _fence_ndvi_summary(db, fence.id)
            bio = await _fence_bioacoustic_summary(db, fence.id)
            iucn = await _fence_iucn_snapshot(db, fence.id)
            threatened = iucn.get("threatened_count", 0) + bio.get("threatened_signals", 0)
            total_threatened += threatened
            protect_rows.append(
                {
                    "project_code": project.code,
                    "work_area": fence.name,
                    "species_richness": max(bio.get("species_richness", 0), iucn.get("species_count", 0)),
                    "threatened_signals": threatened,
                    "ndvi_mean": ndvi.get("ndvi_mean"),
                    "bioacoustic_recordings": bio.get("recording_count", 0),
                }
            )

    return {
        "export_type": "gbf_indicator_mapping",
        "generated_at": datetime.now(UTC).isoformat(),
        "disclaimer": DISCLAIMER,
        "framework": "Kunming-Montreal Global Biodiversity Framework",
        "organization": {
            "id": str(organization.id),
            "name": organization.name,
            "slug": organization.slug,
        },
        "scope": "single_project" if project_id else "organization_portfolio",
        "targets": GBF_TARGETS,
        "target_2_restore": {
            "description": "Ecosystem restoration progress from plantation portfolio",
            "portfolio_totals": {
                "project_count": len(projects),
                "trees_planted": total_trees,
                "area_ha": round(total_area, 4),
            },
            "project_rows": restore_rows,
        },
        "target_3_protect": {
            "description": "Habitat and threatened-species signals from MRV layers",
            "portfolio_threatened_signals": total_threatened,
            "site_rows": protect_rows,
        },
        "tnfd_bridge_note": (
            "GBF metrics align with TNFD LEAP Evaluate/Assess phases — export TNFD report "
            "with gbf_section enabled for combined nature disclosure."
        ),
    }


def build_gbf_tnfd_section(gbf_ctx: dict[str, Any]) -> dict[str, Any]:
    """Bridge GBF indicators into TNFD LEAP exports."""
    t2 = gbf_ctx.get("target_2_restore") or {}
    t3 = gbf_ctx.get("target_3_protect") or {}
    return {
        "framework": "Kunming-Montreal GBF",
        "target_2_restore_summary": t2.get("portfolio_totals"),
        "target_3_protect_summary": {
            "portfolio_threatened_signals": t3.get("portfolio_threatened_signals"),
            "site_count": len(t3.get("site_rows") or []),
        },
        "disclaimer": gbf_ctx.get("disclaimer"),
    }


def render_gbf_xlsx(ctx: dict[str, Any]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "GBF indicators"
    ws.append(["Kunming-Montreal GBF indicator mapping"])
    ws.append(["Disclaimer", ctx.get("disclaimer", "")])
    ws.append(["Generated", ctx.get("generated_at", "")])
    t2 = ctx.get("target_2_restore") or {}
    totals = t2.get("portfolio_totals") or {}
    ws.append(["Projects", totals.get("project_count", 0)])
    ws.append(["Trees planted", totals.get("trees_planted", 0)])
    ws.append(["Area (ha)", totals.get("area_ha", 0)])
    ws.append([])
    ws.append(["Target 2 — Project", "Trees", "Area (ha)", "Survival %", "Native %"])
    for row in t2.get("project_rows") or []:
        ws.append(
            [
                row.get("project_code"),
                row.get("trees_planted"),
                row.get("area_ha"),
                row.get("survival_pct"),
                row.get("native_species_pct"),
            ]
        )
    ws.append([])
    t3 = ctx.get("target_3_protect") or {}
    ws.append(["Target 3 — Site", "Richness", "Threatened signals", "NDVI"])
    for row in t3.get("site_rows") or []:
        ws.append(
            [
                f"{row.get('project_code')} / {row.get('work_area')}",
                row.get("species_richness"),
                row.get("threatened_signals"),
                row.get("ndvi_mean"),
            ]
        )

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
