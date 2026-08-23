"""SBTi FLAG (Forest, Land & Agriculture) target worksheet (Phase E — E1)."""

from __future__ import annotations

import io
from datetime import UTC, datetime
from typing import Any

from openpyxl import Workbook
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plantation_fence import PlantationFence
from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.services.carbon.engine import ENGINE_VERSION
from app.services.carbon.ghg_protocol import _project_inventory_lines
from app.services.reports.carbon_integrity_context import build_carbon_integrity_envelope

DISCLAIMER = (
    "SBTi FLAG-aligned land-sector removals worksheet for target-setting preparation. "
    "Not an SBTi-validated target or FLAG inventory submission."
)

FLAG_COLUMNS = [
    "project_code",
    "project_name",
    "reporting_year",
    "land_area_ha",
    "tree_count",
    "geo_tagged_pct",
    "gross_removals_tco2e",
    "leakage_tco2e",
    "net_land_removals_tco2e",
    "buffer_pct",
    "flag_category",
    "data_source",
    "engine_version",
]


async def _project_flag_row(db: AsyncSession, project: PlantingProject) -> dict[str, Any]:
    reporting_year = datetime.now(UTC).year

    fences = list(
        (
            await db.execute(
                select(PlantationFence).where(PlantationFence.project_id == project.id)
            )
        ).scalars().all()
    )
    land_area_ha = round(sum(float(f.area_ha or 0) for f in fences), 4)

    trees = list(
        (
            await db.execute(
                select(Tree).where(Tree.project_id == project.id, Tree.status != "removed")
            )
        ).scalars().all()
    )
    geo_tagged = sum(1 for t in trees if t.last_geotag_at is not None)
    geo_pct = round(100.0 * geo_tagged / len(trees), 1) if trees else 0.0

    inventory_lines = await _project_inventory_lines(db, project)
    gross = next(
        (line["amount_tco2e"] for line in inventory_lines if "GROSS" in line["line_id"]),
        0.0,
    )
    net = next(
        (line["amount_tco2e"] for line in inventory_lines if "NET" in line["line_id"]),
        0.0,
    )

    envelope = await build_carbon_integrity_envelope(db, project)
    leakage = envelope["leakage"]["total_net_leakage_tco2e"]
    buffer_pct = envelope["permanence"].get("buffer_pct")
    net_land = max(0.0, round(float(gross) - leakage, 4))

    meta = getattr(project, "metadata_", None) or {}
    flag_category = meta.get("flag_category") or "land_removals_arr"

    return {
        "project_code": project.code,
        "project_name": project.name,
        "reporting_year": reporting_year,
        "land_area_ha": land_area_ha,
        "tree_count": len(trees),
        "geo_tagged_pct": geo_pct,
        "gross_removals_tco2e": gross,
        "leakage_tco2e": leakage,
        "net_land_removals_tco2e": net_land,
        "buffer_pct": buffer_pct,
        "flag_category": flag_category,
        "data_source": "vm0047_ghg_single_source",
        "engine_version": ENGINE_VERSION,
        "inventory_net_tco2e": net,
    }


async def build_sbti_flag_context(
    db: AsyncSession,
    organization_id: Any,
    *,
    project_id: Any | None = None,
) -> dict[str, Any]:
    stmt = select(PlantingProject).where(
        PlantingProject.organization_id == organization_id,
        PlantingProject.status != "archived",
    )
    if project_id is not None:
        stmt = stmt.where(PlantingProject.id == project_id)
    projects = list((await db.execute(stmt.order_by(PlantingProject.code.asc()))).scalars().all())

    rows: list[dict[str, Any]] = []
    for project in projects:
        rows.append(await _project_flag_row(db, project))

    totals = {
        "project_count": len(rows),
        "total_land_area_ha": round(sum(r["land_area_ha"] for r in rows), 4),
        "total_gross_removals_tco2e": round(sum(r["gross_removals_tco2e"] for r in rows), 4),
        "total_leakage_tco2e": round(sum(r["leakage_tco2e"] for r in rows), 4),
        "total_net_land_removals_tco2e": round(sum(r["net_land_removals_tco2e"] for r in rows), 4),
    }

    return {
        "export_type": "sbti_flag_worksheet",
        "generated_at": datetime.now(UTC).isoformat(),
        "disclaimer": DISCLAIMER,
        "standard": "SBTi FLAG (preparation worksheet)",
        "reporting_year": datetime.now(UTC).year,
        "organization_id": str(organization_id),
        "scope": "single_project" if project_id else "organization_portfolio",
        "columns": FLAG_COLUMNS,
        "rows": rows,
        "totals": totals,
        "linked_exports": ["ghg_protocol", "vm0047_ledger", "leakage_worksheet"],
    }


def render_sbti_flag_xlsx(ctx: dict[str, Any]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "SBTi FLAG"
    ws.append(["SBTi FLAG land-sector removals worksheet"])
    ws.append(["Disclaimer", ctx.get("disclaimer", "")])
    ws.append(["Reporting year", ctx.get("reporting_year", "")])
    ws.append(["Generated", ctx.get("generated_at", "")])
    totals = ctx.get("totals") or {}
    ws.append(["Projects", totals.get("project_count", 0)])
    ws.append(["Total net land removals (tCO₂e)", totals.get("total_net_land_removals_tco2e", 0)])
    ws.append([])
    ws.append(FLAG_COLUMNS)
    for row in ctx.get("rows") or []:
        ws.append([row.get(col, "") for col in FLAG_COLUMNS])

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
