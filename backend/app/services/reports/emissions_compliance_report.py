"""GHG / methane compliance PDF export — Phase 5."""

from __future__ import annotations

import io
from datetime import UTC, datetime
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def _fmt(value: Any, suffix: str = "") -> str:
    if value is None:
        return "—"
    if isinstance(value, float):
        return f"{value:.2f}{suffix}"
    return f"{value}{suffix}"


def render_emissions_compliance_pdf(ctx: dict[str, Any]) -> bytes:
    """Render work-area GHG / methane compliance audit PDF."""
    project = ctx.get("project") or {}
    work_area = ctx.get("work_area") or {}
    summary = ctx.get("summary") or {}

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        title=f"GHG Compliance - {project.get('name', 'Project')}",
        author="Aranyix BYOT",
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
    story.append(Paragraph("GHG / Methane Compliance Report", h1))
    story.append(
        Paragraph(
            f"<b>{project.get('name', '')}</b> ({project.get('code', '')}) · "
            f"Work area: <b>{work_area.get('name', '')}</b> · "
            f"generated {datetime.now(UTC).strftime('%Y-%m-%d %H:%M UTC')}",
            body,
        )
    )
    story.append(
        Paragraph(
            "<i>Declared emission registry, Gaussian dispersion plume, TROPOMI CH₄ "
            "satellite screening, and wind-aligned fusion assessment.</i>",
            small,
        )
    )
    story.append(Spacer(1, 5 * mm))

    kpi_rows = [
        ["Registered sources", str(summary.get("source_count", 0))],
        ["Active sources", str(summary.get("active_source_count", 0))],
        ["Total active CH₄ rate (g/s)", _fmt(summary.get("total_active_rate_g_s"))],
        ["Dispersion simulation", "Yes" if summary.get("has_dispersion") else "No"],
        ["TROPOMI CH₄ scan", "Yes" if summary.get("has_satellite_scan") else "No"],
        ["Fusion assessment", "Yes" if summary.get("has_fusion") else "No"],
        ["Fusion verdict", summary.get("fusion_verdict") or "—"],
        ["Fusion alignment score", _fmt(summary.get("fusion_alignment_score"), "/100")],
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

    story.append(Paragraph("Work area", h2))
    wa_rows = [
        ["Name", work_area.get("name", "—")],
        ["Geometry", work_area.get("geometry_type", "—")],
        ["Area (ha)", _fmt(work_area.get("area_ha"))],
        ["Segment code", work_area.get("segment_code") or "—"],
    ]
    story.append(Table(wa_rows, colWidths=[45 * mm, 125 * mm]))
    story.append(Spacer(1, 5 * mm))

    story.append(Paragraph("Emission source registry", h2))
    src_table = [["Name", "Type", "Gas", "Status", "Rate (g/s)", "Height (m)"]]
    for s in ctx.get("sources") or []:
        src_table.append(
            [
                str(s.get("name", ""))[:30],
                str(s.get("source_type", "")),
                str(s.get("gas_type", "")),
                str(s.get("status", "")),
                _fmt(s.get("emission_rate_g_s")),
                _fmt(s.get("release_height_m")),
            ]
        )
    if len(src_table) == 1:
        src_table.append(["—", "—", "—", "No sources registered", "—", "—"])
    st = Table(src_table, repeatRows=1, colWidths=[38 * mm, 22 * mm, 14 * mm, 18 * mm, 22 * mm, 22 * mm])
    st.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#15803D")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.1, colors.grey),
            ]
        )
    )
    story.append(st)
    story.append(Spacer(1, 5 * mm))

    dispersion = ctx.get("dispersion")
    story.append(Paragraph("Latest dispersion simulation", h2))
    if dispersion:
        disp_rows = [
            ["Gas", dispersion.get("gas_type", "CH4")],
            ["Wind", f"{_fmt(dispersion.get('wind_speed_ms'))} m/s from {_fmt(dispersion.get('wind_direction_deg'))}°"],
            ["Stability class", dispersion.get("stability_class", "—")],
            ["Peak concentration", f"{_fmt(dispersion.get('max_concentration_ug_m3'))} µg/m³"],
            ["Downwind reach", f"{_fmt(dispersion.get('downwind_km'))} km"],
            ["Plume extends outside boundary", "Yes" if dispersion.get("extends_outside_work_area") else "No"],
            ["Met provider", dispersion.get("met_provider", "—")],
            ["Run at", dispersion.get("created_at") or "—"],
        ]
        story.append(Table(disp_rows, colWidths=[55 * mm, 115 * mm]))
    else:
        story.append(Paragraph("No dispersion simulation recorded.", body))
    story.append(Spacer(1, 5 * mm))

    scan = ctx.get("satellite_scan")
    story.append(Paragraph("Latest TROPOMI CH₄ satellite scan", h2))
    if scan:
        scan_rows = [
            ["Provider", scan.get("provider", "—")],
            ["ROI buffer", f"{_fmt(scan.get('buffer_km'))} km"],
            ["Latest mean CH₄", f"{_fmt(scan.get('latest_mean_ppb'))} ppb"],
            ["Baseline (median)", f"{_fmt(scan.get('baseline_ppb'))} ppb"],
            ["Anomaly", f"{_fmt(scan.get('anomaly_ppb'))} ppb"],
            ["Months in series", _fmt(scan.get("months"))],
            ["Latest observation", scan.get("latest_time") or "—"],
            ["Scan at", scan.get("created_at") or "—"],
        ]
        story.append(Table(scan_rows, colWidths=[55 * mm, 115 * mm]))
    else:
        story.append(Paragraph("No TROPOMI scan recorded.", body))
    story.append(Spacer(1, 5 * mm))

    fusion = ctx.get("fusion")
    story.append(Paragraph("Latest fusion assessment", h2))
    if fusion:
        story.append(
            Paragraph(
                f"<b>Verdict:</b> {fusion.get('verdict', '—')} · "
                f"<b>Score:</b> {_fmt(fusion.get('alignment_score'), '/100')}",
                body,
            )
        )
        if fusion.get("summary"):
            story.append(Paragraph(str(fusion["summary"]), body))
        fusion_detail = [
            ["TROPOMI anomaly", f"{_fmt(fusion.get('anomaly_ppb'))} ppb"],
            ["Wind", f"{_fmt(fusion.get('wind_speed_ms'))} m/s from {_fmt(fusion.get('wind_direction_deg'))}°"],
            ["Plume outside work area", "Yes" if fusion.get("plume_extends_outside") else "No"],
            ["Pipeline", fusion.get("pipeline") or "—"],
            ["Assessed at", fusion.get("created_at") or "—"],
        ]
        story.append(Table(fusion_detail, colWidths=[55 * mm, 115 * mm]))
        findings = fusion.get("findings") or []
        if findings:
            story.append(Spacer(1, 3 * mm))
            story.append(Paragraph("Findings", body))
            f_table = [["Category", "Severity", "Message"]]
            for f in findings[:15]:
                f_table.append(
                    [
                        str(f.get("category", ""))[:20],
                        str(f.get("severity", "")),
                        str(f.get("message", ""))[:90],
                    ]
                )
            story.append(Table(f_table, repeatRows=1, colWidths=[28 * mm, 22 * mm, 120 * mm]))
    else:
        story.append(Paragraph("No fusion assessment recorded.", body))
    story.append(Spacer(1, 5 * mm))

    story.append(Paragraph("Data sources & methodology", h2))
    for line in ctx.get("data_sources") or []:
        story.append(Paragraph(f"• {line}", body))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph(f"<i>{ctx.get('disclaimer', '')}</i>", small))

    doc.build(story)
    return buf.getvalue()
