"""Leakage worksheet and related carbon integrity exports (Phase B)."""

from __future__ import annotations

import io
from datetime import UTC, datetime
from typing import Any

from openpyxl import Workbook
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.planting_project import PlantingProject
from app.services.reports.carbon_integrity_context import build_carbon_integrity_envelope

DISCLAIMER = (
    "Leakage assessment worksheet for VM0047, REDD+, and Gold Standard prep. "
    "Not a certified leakage determination."
)


async def build_leakage_worksheet_context(
    db: AsyncSession, project: PlantingProject
) -> dict[str, Any]:
    envelope = await build_carbon_integrity_envelope(db, project)
    return {
        "export_type": "leakage_worksheet",
        "generated_at": datetime.now(UTC).isoformat(),
        "disclaimer": DISCLAIMER,
        "project": {
            "code": project.code,
            "name": project.name,
            "scheme_code": project.scheme_code,
            "segment": project.segment,
        },
        "leakage": envelope["leakage"],
        "permanence": envelope["permanence"],
    }


def render_leakage_worksheet_xlsx(ctx: dict[str, Any]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Leakage worksheet"
    project = ctx.get("project") or {}
    leakage = ctx.get("leakage") or {}
    permanence = ctx.get("permanence") or {}

    ws.append(["Leakage assessment worksheet"])
    ws.append(["Disclaimer", ctx.get("disclaimer", "")])
    ws.append(["Generated", ctx.get("generated_at", "")])
    ws.append([])
    ws.append(["Project code", project.get("code", "")])
    ws.append(["Project name", project.get("name", "")])
    ws.append(["Scheme", project.get("scheme_code", "")])
    ws.append([])
    ws.append(["Total net leakage (tCO₂e)", leakage.get("total_net_leakage_tco2e", 0)])
    ws.append(["Leakage entries", leakage.get("entry_count", 0)])
    ws.append(["NPRT score", permanence.get("nprt_score", "—")])
    ws.append(["Buffer %", permanence.get("buffer_pct", "—")])
    ws.append(["SAR avg integrity", permanence.get("sar_avg_forest_integrity", "—")])
    ws.append(["SAR ground-risk sites", permanence.get("sar_ground_risk_sites", 0)])
    ws.append([])
    ws.append(
        [
            "Type",
            "Estimated (tCO₂e)",
            "Mitigation (tCO₂e)",
            "Net (tCO₂e)",
            "Notes",
            "Period start",
            "Period end",
        ]
    )
    for entry in leakage.get("entries") or []:
        ws.append(
            [
                entry.get("leakage_type", ""),
                entry.get("estimated_leakage_tco2e", 0),
                entry.get("mitigation_tco2e", 0),
                entry.get("net_leakage_tco2e", 0),
                entry.get("notes", ""),
                entry.get("period_start", ""),
                entry.get("period_end", ""),
            ]
        )

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
