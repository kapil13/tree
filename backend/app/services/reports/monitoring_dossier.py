"""Single-site / project monitoring dossier PDF — scan history, health, alerts."""

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

from app.models.alert import Alert
from app.models.plantation_fence import PlantationFence
from app.models.planting_project import PlantingProject
from app.models.satellite_health_analysis import SatelliteHealthAnalysis
from app.services.monitoring.scan_history import build_project_scan_history
from app.services.schemes.monitoring import is_satellite_watch_enabled
from app.services.schemes.registry import get_scheme


async def build_monitoring_dossier_context(
    db: AsyncSession,
    project: PlantingProject,
    *,
    owner_user_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    scheme = get_scheme(project.scheme_code) if project.scheme_code else None
    fences = list(
        (
            await db.execute(
                select(PlantationFence)
                .where(PlantationFence.project_id == project.id)
                .order_by(PlantationFence.name.asc())
            )
        ).scalars().all()
    )

    scan_rows = await build_project_scan_history(db, project, limit=60)
    work_area_snapshots: list[dict[str, Any]] = []
    for fence in fences:
        health_res = await db.execute(
            select(SatelliteHealthAnalysis)
            .where(SatelliteHealthAnalysis.fence_id == fence.id)
            .order_by(SatelliteHealthAnalysis.created_at.desc())
            .limit(1)
        )
        health = health_res.scalar_one_or_none()
        llm = None
        if health and health.raw_output:
            llm = health.raw_output.get("llm_narrative")
        latest_ndvi = health.ndvi_current if health and health.ndvi_current is not None else None
        work_area_snapshots.append(
            {
                "id": str(fence.id),
                "name": fence.name,
                "area_ha": float(fence.area_ha) if fence.area_ha is not None else None,
                "last_satellite_at": fence.last_satellite_at.isoformat()
                if fence.last_satellite_at
                else None,
                "latest_ndvi": float(latest_ndvi) if latest_ndvi is not None else None,
                "health_status": health.health_status if health else None,
                "risk_level": health.risk_level if health else None,
                "health_summary": health.summary if health else None,
                "llm_narrative": llm,
            }
        )

    alert_rows: list[dict[str, Any]] = []
    if owner_user_id:
        alert_res = await db.execute(
            select(Alert)
            .where(Alert.user_id == owner_user_id)
            .order_by(Alert.created_at.desc())
            .limit(40)
        )
        monitoring_kinds = {
            "ndvi_degradation",
            "satellite_health",
            "satellite_health_digest",
            "sar_integrity_drop",
            "sar_optical_divergent",
            "sar_integrity_at_risk",
            "sar_monsoon_gap_fill",
            "sar_hidden_moisture",
            "sar_wetland_detected",
            "sar_flood_risk",
            "sar_ground_moisture",
            "sar_ground_instability",
        }
        project_id_str = str(project.id)
        for alert in alert_res.scalars().all():
            if alert.kind not in monitoring_kinds:
                continue
            payload = alert.payload or {}
            if payload.get("project_id") not in (None, project_id_str):
                continue
            alert_rows.append(
                {
                    "created_at": alert.created_at.isoformat() if alert.created_at else None,
                    "kind": alert.kind,
                    "severity": alert.severity,
                    "title": alert.title,
                    "message": alert.message[:280],
                }
            )
            if len(alert_rows) >= 12:
                break

    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "project": {
            "id": str(project.id),
            "code": project.code,
            "name": project.name,
            "scheme_code": project.scheme_code,
            "scheme_label": scheme.label if scheme else project.scheme_code,
            "segment": project.segment,
            "status": project.status,
            "satellite_watch": is_satellite_watch_enabled(project),
        },
        "work_areas": work_area_snapshots,
        "scan_history": [r.as_dict() for r in scan_rows],
        "alerts": alert_rows,
    }


def render_monitoring_dossier_pdf(ctx: dict[str, Any]) -> bytes:
    project = ctx.get("project") or {}
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        title=f"Monitoring Dossier — {project.get('name', 'Site')}",
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
    story.append(Paragraph("Site Monitoring Dossier", h1))
    story.append(
        Paragraph(
            f"<b>{project.get('name', 'Project')}</b> ({project.get('code', '')}) · "
            f"{project.get('scheme_label') or 'Planting programme'} · "
            f"generated {datetime.now(UTC).strftime('%Y-%m-%d %H:%M UTC')}",
            body,
        )
    )
    story.append(
        Paragraph(
            "<i>Optical NDVI, SAR ground intelligence, Forest Integrity scores, and monitoring alerts "
            "for audit and field review.</i>",
            small,
        )
    )
    story.append(Spacer(1, 4 * mm))

    meta_rows = [
        ["Segment", project.get("segment") or "—"],
        ["Status", project.get("status") or "—"],
        ["Satellite watch", "Enabled" if project.get("satellite_watch") else "Off"],
        ["Work areas", str(len(ctx.get("work_areas") or []))],
        ["Scan history rows", str(len(ctx.get("scan_history") or []))],
        ["Recent alerts", str(len(ctx.get("alerts") or []))],
    ]
    meta_table = Table(meta_rows, colWidths=[45 * mm, 120 * mm])
    meta_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#DCFCE7")),
                ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.grey),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(meta_table)
    story.append(Spacer(1, 6 * mm))

    story.append(Paragraph("Work area snapshot", h2))
    wa_header = ["Work area", "Area (ha)", "Last scan", "NDVI", "Health", "Risk"]
    wa_data = [wa_header]
    for wa in ctx.get("work_areas") or []:
        last = wa.get("last_satellite_at") or "—"
        if last != "—" and "T" in last:
            last = last.split("T")[0]
        wa_data.append(
            [
                wa.get("name") or "—",
                f"{wa.get('area_ha'):.2f}" if wa.get("area_ha") is not None else "—",
                last,
                f"{wa.get('latest_ndvi'):.2f}" if wa.get("latest_ndvi") is not None else "—",
                wa.get("health_status") or "—",
                wa.get("risk_level") or "—",
            ]
        )
    if len(wa_data) == 1:
        wa_data.append(["—", "—", "—", "—", "—", "—"])
    wa_table = Table(wa_data, colWidths=[42 * mm, 22 * mm, 28 * mm, 18 * mm, 28 * mm, 22 * mm])
    wa_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#15803D")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(wa_table)
    story.append(Spacer(1, 6 * mm))

    for wa in ctx.get("work_areas") or []:
        narrative = wa.get("llm_narrative") or wa.get("health_summary")
        if not narrative:
            continue
        story.append(Paragraph(f"{wa.get('name')} — health narrative", h2))
        story.append(Paragraph(str(narrative).replace("\n", "<br/>")[:1200], body))
        story.append(Spacer(1, 4 * mm))

    story.append(Paragraph("Scan history (date × NDVI × SAR × integrity)", h2))
    hist_header = ["Date", "Work area", "NDVI", "Δ baseline", "Integrity", "Grade", "SAR mode"]
    hist_data = [hist_header]
    for row in (ctx.get("scan_history") or [])[:35]:
        hist_data.append(
            [
                row.get("scan_date") or "—",
                (row.get("fence_name") or "—")[:24],
                f"{row.get('ndvi_mean'):.2f}" if row.get("ndvi_mean") is not None else "—",
                f"{row.get('ndvi_change_vs_baseline'):+.2f}"
                if row.get("ndvi_change_vs_baseline") is not None
                else "—",
                str(row.get("forest_integrity_score"))
                if row.get("forest_integrity_score") is not None
                else "—",
                row.get("integrity_grade") or "—",
                row.get("sar_monitoring_mode") or "—",
            ]
        )
    if len(hist_data) == 1:
        hist_data.append(["—", "—", "—", "—", "—", "—", "—"])
    hist_table = Table(
        hist_data,
        colWidths=[24 * mm, 38 * mm, 16 * mm, 20 * mm, 18 * mm, 22 * mm, 32 * mm],
    )
    hist_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 7),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0EA5E9")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    story.append(hist_table)
    story.append(Spacer(1, 6 * mm))

    story.append(Paragraph("Recent monitoring alerts", h2))
    alert_header = ["Date", "Kind", "Severity", "Title"]
    alert_data = [alert_header]
    for alert in ctx.get("alerts") or []:
        created = alert.get("created_at") or "—"
        if created != "—" and "T" in created:
            created = created.split("T")[0]
        alert_data.append(
            [
                created,
                alert.get("kind") or "—",
                alert.get("severity") or "—",
                (alert.get("title") or "—")[:48],
            ]
        )
    if len(alert_data) == 1:
        alert_data.append(["—", "—", "—", "No recent monitoring alerts"])
    alert_table = Table(alert_data, colWidths=[24 * mm, 38 * mm, 22 * mm, 81 * mm])
    alert_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F59E0B")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(alert_table)

    doc.build(story)
    return buf.getvalue()
