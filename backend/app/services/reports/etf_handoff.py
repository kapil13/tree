"""Enhanced Transparency Framework (ETF) / BTR national inventory handoff (Phase B)."""

from __future__ import annotations

import csv
import io
from datetime import UTC, datetime
from typing import Any

from openpyxl import Workbook
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.services.carbon.engine import ENGINE_VERSION
from app.services.reports.carbon_integrity_context import build_carbon_integrity_envelope

DISCLAIMER = (
    "IPCC-aligned activity table for national inventory handoff and BTR preparation. "
    "Not an official UNFCCC submission."
)

ETF_COLUMNS = [
    "project_code",
    "project_name",
    "activity_class",
    "reporting_year",
    "tree_count",
    "removals_tco2e",
    "leakage_tco2e",
    "net_removals_tco2e",
    "buffer_pct",
    "uncertainty_flag",
    "qa_qc_notes",
    "engine_version",
    "sar_integrity_score",
    "open_violations",
]


async def build_org_inventory_handoff(
    db: AsyncSession,
    organization_id: Any,
) -> dict[str, Any]:
    projects_res = await db.execute(
        select(PlantingProject).where(
            PlantingProject.organization_id == organization_id,
            PlantingProject.status != "archived",
        )
    )
    projects = list(projects_res.scalars().all())
    reporting_year = datetime.now(UTC).year
    rows: list[dict[str, Any]] = []

    for project in projects:
        trees_res = await db.execute(
            select(Tree).where(Tree.project_id == project.id, Tree.status != "removed")
        )
        trees = list(trees_res.scalars().all())
        total_carbon_kg = sum(float(t.current_carbon_kg or 0) for t in trees)
        removals_tco2e = round(total_carbon_kg * 44 / 12 / 1000, 4)

        envelope = await build_carbon_integrity_envelope(db, project)
        leakage_tco2e = envelope["leakage"]["total_net_leakage_tco2e"]
        buffer_pct = envelope["permanence"].get("buffer_pct")
        net_removals = max(0.0, round(removals_tco2e - leakage_tco2e, 4))

        uncertainty = "tier1_default"
        if envelope["permanence"].get("nprt_score") is not None:
            uncertainty = "nprt_buffer_applied"
        if envelope["permanence"].get("sar_avg_forest_integrity") is not None:
            uncertainty = "satellite_corroborated"

        rows.append(
            {
                "project_code": project.code,
                "project_name": project.name,
                "activity_class": "ARR",
                "reporting_year": reporting_year,
                "tree_count": len(trees),
                "removals_tco2e": removals_tco2e,
                "leakage_tco2e": leakage_tco2e,
                "net_removals_tco2e": net_removals,
                "buffer_pct": buffer_pct,
                "uncertainty_flag": uncertainty,
                "qa_qc_notes": "Field geotag + survival monitoring; see project MRV export",
                "engine_version": ENGINE_VERSION,
                "sar_integrity_score": envelope["permanence"].get("sar_avg_forest_integrity"),
                "open_violations": envelope["permanence"].get("open_violations", 0),
            }
        )

    totals = {
        "project_count": len(rows),
        "total_removals_tco2e": round(sum(r["removals_tco2e"] for r in rows), 4),
        "total_leakage_tco2e": round(sum(r["leakage_tco2e"] for r in rows), 4),
        "total_net_removals_tco2e": round(sum(r["net_removals_tco2e"] for r in rows), 4),
    }

    return {
        "export_type": "etf_btr_handoff",
        "generated_at": datetime.now(UTC).isoformat(),
        "disclaimer": DISCLAIMER,
        "reporting_year": reporting_year,
        "organization_id": str(organization_id),
        "columns": ETF_COLUMNS,
        "rows": rows,
        "totals": totals,
    }


def render_etf_handoff_csv(ctx: dict[str, Any]) -> bytes:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=ETF_COLUMNS, extrasaction="ignore")
    writer.writeheader()
    for row in ctx.get("rows") or []:
        writer.writerow(row)
    return buf.getvalue().encode("utf-8")


def render_etf_handoff_xlsx(ctx: dict[str, Any]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "ETF handoff"
    ws.append(["ETF / BTR national inventory handoff"])
    ws.append(["Disclaimer", ctx.get("disclaimer", "")])
    ws.append(["Reporting year", ctx.get("reporting_year", "")])
    ws.append(["Generated", ctx.get("generated_at", "")])
    totals = ctx.get("totals") or {}
    ws.append(["Projects", totals.get("project_count", 0)])
    ws.append(["Total net removals (tCO₂e)", totals.get("total_net_removals_tco2e", 0)])
    ws.append([])
    ws.append(ETF_COLUMNS)
    for row in ctx.get("rows") or []:
        ws.append([row.get(col, "") for col in ETF_COLUMNS])

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
