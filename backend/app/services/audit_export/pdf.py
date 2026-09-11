"""Human-readable Estate Watch audit report PDF."""

from __future__ import annotations

import io
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def render_audit_engagement_pdf(ctx: dict[str, Any]) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm)
    styles = getSampleStyleSheet()
    story: list[Any] = []

    project = ctx.get("project") or {}
    engagement = ctx.get("engagement") or {}
    story.append(Paragraph("Estate Watch — Audit Evidence Report", styles["Title"]))
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            f"Project: {project.get('name', '')} ({project.get('code', '')})", styles["Normal"]
        )
    )
    story.append(Paragraph(f"Engagement status: {engagement.get('status', '')}", styles["Normal"]))
    story.append(Spacer(1, 12))
    story.append(Paragraph(str(ctx.get("epistemic_disclaimer", "")), styles["Italic"]))
    story.append(Spacer(1, 16))

    confidence = ctx.get("confidence") or {}
    grade_counts = confidence.get("grade_counts") or {}
    story.append(Paragraph("Confidence map", styles["Heading2"]))
    conf_rows = [["Grade", "Blocks"]]
    for grade in ("green", "amber", "red", "grey"):
        if grade_counts.get(grade):
            conf_rows.append([grade, str(grade_counts[grade])])
    if len(conf_rows) > 1:
        t = Table(conf_rows, colWidths=[80 * mm, 40 * mm])
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e7e5e4")),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ]
            )
        )
        story.append(t)
    story.append(Spacer(1, 12))

    risk = ctx.get("risk") or {}
    queue = risk.get("queue") or {}
    story.append(Paragraph("Auditor priority queue (top blocks)", styles["Heading2"]))
    risk_rows = [["Rank", "Block", "Risk", "Score", "Anomalies"]]
    for block in (queue.get("queue") or [])[:10]:
        risk_rows.append(
            [
                str(block.get("priority_rank", "")),
                str(block.get("boundary_name", ""))[:28],
                str(block.get("risk_level", "")),
                str(block.get("risk_score", "")),
                str(block.get("anomaly_count", "")),
            ]
        )
    if len(risk_rows) > 1:
        t = Table(risk_rows, colWidths=[15 * mm, 55 * mm, 25 * mm, 20 * mm, 25 * mm])
        t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, colors.grey)]))
        story.append(t)
    story.append(Spacer(1, 12))

    sampling = ctx.get("sampling") or {}
    visit_stats = sampling.get("visit_stats") or {}
    story.append(Paragraph("Field sampling & verification", styles["Heading2"]))
    story.append(
        Paragraph(
            f"Plots: {visit_stats.get('visited', 0)}/{visit_stats.get('total', 0)} visited",
            styles["Normal"],
        )
    )
    field_rows = [["Plot", "Block", "Presence", "Outcome", "Trees", "Inside", "Visited"]]
    for plot in sampling.get("plots") or []:
        visit = plot.get("latest_visit") or {}
        if not visit:
            continue
        field_rows.append(
            [
                str(plot.get("plot_code", ""))[:16],
                str(plot.get("boundary_name", ""))[:20],
                str(visit.get("tree_presence") or "—"),
                str(visit.get("verification_outcome") or "—"),
                str(visit.get("trees_observed") or "—"),
                "yes"
                if visit.get("inside_boundary") is True
                else ("no" if visit.get("inside_boundary") is False else "—"),
                str(visit.get("visited_at", ""))[:19],
            ]
        )
    if len(field_rows) > 1:
        t = Table(
            field_rows,
            colWidths=[22 * mm, 32 * mm, 20 * mm, 24 * mm, 14 * mm, 14 * mm, 28 * mm],
            repeatRows=1,
        )
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e7e5e4")),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                ]
            )
        )
        story.append(t)
    story.append(Spacer(1, 12))

    satellite = ctx.get("satellite") or {}
    story.append(Paragraph("Satellite timeline", styles["Heading2"]))
    story.append(
        Paragraph(
            f"Blocks: {satellite.get('block_count', 0)} · "
            f"T0 baselines found: {satellite.get('t0_baselines_found', 0)}",
            styles["Normal"],
        )
    )

    doc.build(story)
    return buf.getvalue()
