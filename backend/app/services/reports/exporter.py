"""PDF and Excel report exporters."""

from __future__ import annotations

import io
from datetime import datetime
from typing import Any

from openpyxl import Workbook
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def render_carbon_report_pdf(
    org_name: str, summary: dict[str, Any], rows: list[dict[str, Any]]
) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        title=f"BYOT Carbon Report - {org_name}",
        author="BYOT",
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )
    styles = getSampleStyleSheet()
    h1 = styles["Heading1"]
    h1.textColor = colors.HexColor("#15803D")
    body = styles["BodyText"]

    story: list = []
    story.append(Paragraph("Carbon Sequestration Report", h1))
    story.append(
        Paragraph(
            f"<b>{org_name}</b> · generated {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
            body,
        )
    )
    story.append(Spacer(1, 6 * mm))

    summary_rows = [
        ["Total trees", summary.get("total_trees", 0)],
        ["Total biomass (kg)", f"{summary.get('total_biomass_kg', 0):,.2f}"],
        ["Total carbon (kg C)", f"{summary.get('total_carbon_kg', 0):,.2f}"],
        ["Total CO2e (kg)", f"{summary.get('total_co2e_kg', 0):,.2f}"],
        ["Annual sequestration (kg CO2e)", f"{summary.get('annual_sequestration_kg', 0):,.2f}"],
        ["Lifetime credits (tCO2e)", f"{summary.get('lifetime_credits_tco2e', 0):,.3f}"],
        ["Estimated revenue (USD)", f"${summary.get('estimated_revenue_usd', 0):,.2f}"],
    ]
    t = Table(summary_rows, colWidths=[80 * mm, 80 * mm])
    t.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#DCFCE7")),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#15803D")),
                ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.grey),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(t)
    story.append(Spacer(1, 8 * mm))

    story.append(Paragraph("Top trees by sequestration", body))
    detail = [["Public code", "Species", "Health", "Carbon (kg)", "CO2e (kg)"]]
    for r in rows[:25]:
        detail.append(
            [
                r.get("public_code", ""),
                r.get("species", ""),
                r.get("health", ""),
                f"{r.get('carbon_kg', 0):.2f}",
                f"{r.get('co2e_kg', 0):.2f}",
            ]
        )
    dt = Table(detail, repeatRows=1)
    dt.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#15803D")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
                ("GRID", (0, 0), (-1, -1), 0.1, colors.grey),
            ]
        )
    )
    story.append(dt)
    doc.build(story)
    return buf.getvalue()


def render_trees_report_xlsx(rows: list[dict[str, Any]]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Trees"
    headers = [
        "public_code",
        "species",
        "health",
        "lat",
        "lon",
        "planted_at",
        "dbh_cm",
        "height_m",
        "carbon_kg",
        "co2e_kg",
        "satellite_verified",
    ]
    ws.append(headers)
    for r in rows:
        ws.append([r.get(h) for h in headers])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
