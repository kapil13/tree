"""PDF map summary for field verification plots."""

from __future__ import annotations

import io
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def render_field_verification_map_pdf(plots: list[dict[str, Any]]) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), leftMargin=12 * mm, rightMargin=12 * mm)
    styles = getSampleStyleSheet()
    story: list[Any] = []

    story.append(Paragraph("Field verification — sample plot summary", styles["Title"]))
    story.append(
        Paragraph(
            "Plot centers were generated inside audit block boundaries. "
            "This table lists planned GPS points and latest visit outcomes.",
            styles["Normal"],
        )
    )
    story.append(Spacer(1, 8))

    rows = [
        [
            "Plot",
            "Block",
            "Status",
            "Lat",
            "Lon",
            "Presence",
            "Outcome",
            "Inside",
            "Photos",
        ]
    ]
    for plot in plots:
        rows.append(
            [
                str(plot.get("plot_code", ""))[:14],
                str(plot.get("block_name", ""))[:18],
                str(plot.get("status", "")),
                f"{float(plot.get('plot_lat', 0)):.5f}",
                f"{float(plot.get('plot_lon', 0)):.5f}",
                str(plot.get("tree_presence") or "—"),
                str(plot.get("verification_outcome") or "—"),
                "yes"
                if plot.get("inside_boundary") is True
                else ("no" if plot.get("inside_boundary") is False else "—"),
                str(plot.get("photo_count", 0)),
            ]
        )

    table = Table(
        rows,
        colWidths=[22 * mm, 32 * mm, 16 * mm, 22 * mm, 22 * mm, 20 * mm, 24 * mm, 14 * mm, 12 * mm],
        repeatRows=1,
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e7e5e4")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(table)
    doc.build(story)
    return buf.getvalue()
