"""SAR portfolio Forest Integrity PDF report — Phase 4.6."""

from __future__ import annotations

import io
import uuid
from datetime import UTC, datetime
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plantation_fence import PlantationFence
from app.models.planting_project import PlantingProject
from app.services.monitoring.sar_ops_dashboard import build_sar_ops_summary
from app.services.planting_projects.access import project_list_filter


async def build_sar_portfolio_report_context(db: AsyncSession, user) -> dict[str, Any]:
    stmt = select(PlantingProject)
    stmt = project_list_filter(user, stmt)
    projects = list((await db.execute(stmt)).scalars().all())
    project_by_id = {p.id: p for p in projects}
    fences: list[PlantationFence] = []
    if projects:
        fences = list(
            (
                await db.execute(
                    select(PlantationFence).where(
                        PlantationFence.project_id.in_(project_by_id.keys())
                    )
                )
            ).scalars().all()
        )

    ops = await build_sar_ops_summary(db, fences)
    rows: list[dict[str, Any]] = []
    for row in ops.get("work_areas", []):
        project = (
            project_by_id.get(uuid.UUID(row["project_id"])) if row.get("project_id") else None
        )
        rows.append(
            {
                **row,
                "project_name": project.name if project else "",
                "segment": project.segment if project else "",
            }
        )

    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "organization": getattr(user, "full_name", None) or getattr(user, "email", "Portfolio"),
        "summary": {
            "work_areas_tracked": len(fences),
            "sar_aligned_work_areas": ops.get("sar_aligned_work_areas", 0),
            "sar_divergent_work_areas": ops.get("sar_divergent_work_areas", 0),
            "sar_gap_fill_work_areas": ops.get("sar_gap_fill_work_areas", 0),
            "sar_at_risk_work_areas": ops.get("sar_at_risk_work_areas", 0),
            "stale_sar_work_areas": ops.get("stale_sar_work_areas", 0),
            "sar_avg_forest_integrity": ops.get("sar_avg_forest_integrity"),
            "sar_live_providers": ops.get("sar_live_providers", 0),
            "sar_stub_providers": ops.get("sar_stub_providers", 0),
        },
        "work_areas": rows,
    }


def render_sar_portfolio_pdf(ctx: dict[str, Any]) -> bytes:
    summary = ctx.get("summary") or {}
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        title="SAR Forest Integrity Report",
        author="Aranyix · Axentis Technologies",
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
    )
    styles = getSampleStyleSheet()
    h1 = styles["Heading1"]
    h1.textColor = colors.HexColor("#15803D")
    h2 = styles["Heading2"]
    body = styles["BodyText"]
    small = styles["BodyText"]
    small.fontSize = 8
    small.textColor = colors.grey

    story: list = []
    story.append(Paragraph("SAR Forest Integrity Report", h1))
    story.append(
        Paragraph(
            f"NISAR-inspired ground intelligence · generated "
            f"{datetime.now(UTC).strftime('%Y-%m-%d %H:%M UTC')}",
            body,
        )
    )
    story.append(
        Paragraph(
            "<i>Axentis Technologies — optical NDVI fused with Sentinel-1 SAR for "
            "moisture, wetland risk, and canopy–ground divergence.</i>",
            small,
        )
    )
    story.append(Spacer(1, 5 * mm))

    kpi_rows = [
        ["Work areas tracked", str(summary.get("work_areas_tracked", 0))],
        ["Avg Forest Integrity", str(summary.get("sar_avg_forest_integrity") or "—")],
        ["At risk", str(summary.get("sar_at_risk_work_areas", 0))],
        ["Optical/SAR divergent", str(summary.get("sar_divergent_work_areas", 0))],
        ["Aligned", str(summary.get("sar_aligned_work_areas", 0))],
        ["Monsoon gap-fill", str(summary.get("sar_gap_fill_work_areas", 0))],
        ["Stale SAR scans", str(summary.get("stale_sar_work_areas", 0))],
        ["Live providers", str(summary.get("sar_live_providers", 0))],
    ]
    kt = Table(kpi_rows, colWidths=[75 * mm, 95 * mm])
    kt.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#DCFCE7")),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#15803D")),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(kt)
    story.append(Spacer(1, 6 * mm))

    story.append(Paragraph("Work area detail", h2))
    detail = [
        [
            "Work area",
            "Integrity",
            "Mode",
            "Provider",
            "Stale",
            "Recommended action",
        ]
    ]
    for row in ctx.get("work_areas", [])[:40]:
        detail.append(
            [
                str(row.get("fence_name") or "")[:28],
                str(row.get("sar_forest_integrity") or "—"),
                str(row.get("sar_monitoring_mode") or "—")[:18],
                str(row.get("sar_provider") or "—")[:16],
                "Yes" if row.get("sar_stale") else "No",
                str(row.get("sar_recommended_action") or "")[:60],
            ]
        )
    dt = Table(detail, repeatRows=1, colWidths=[32 * mm, 14 * mm, 22 * mm, 22 * mm, 12 * mm, 58 * mm])
    dt.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#15803D")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 7),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
                ("GRID", (0, 0), (-1, -1), 0.1, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(dt)
    story.append(Spacer(1, 4 * mm))
    story.append(
        Paragraph(
            "<i>Operational report only — not a carbon credit or legal compliance certificate.</i>",
            small,
        )
    )
    doc.build(story)
    return buf.getvalue()
