"""Operational plantation reports with filters and PDF/Excel export."""

from __future__ import annotations

import io
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

from openpyxl import Workbook
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from shapely.geometry import mapping
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plantation_fence import PlantationFence
from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.services.data_scope import apply_tree_scope
from app.services.planting_projects.access import project_list_filter
from app.services.planting_projects.service import project_summary
from app.services.planting_projects.survival_survey import survey_interval_days

ExportFormat = Literal["json", "pdf", "xlsx"]
EXPORT_ROW_CAP = 5000


def project_location_meta(project: PlantingProject) -> dict[str, str]:
    meta = project.metadata_ or {}
    loc = meta.get("location") if isinstance(meta.get("location"), dict) else {}
    return {
        "financial_year": str(loc.get("financial_year") or ""),
        "state_code": str(loc.get("state_code") or ""),
        "state_name": str(loc.get("state_name") or ""),
        "district_code": str(loc.get("district_code") or ""),
        "district_name": str(loc.get("district_name") or ""),
        "block_name": str(loc.get("block_name") or ""),
        "gram_panchayat_name": str(loc.get("gram_panchayat_name") or ""),
        "village_name": str(loc.get("village_name") or ""),
        "area_type": str(loc.get("area_type") or "rural"),
        "city_name": str(loc.get("city_name") or ""),
        "urban_local_body": str(loc.get("urban_local_body") or ""),
    }


def _location_label(loc: dict[str, str]) -> str:
    parts = [loc.get("state_name"), loc.get("district_name"), loc.get("village_name")]
    return " · ".join(p for p in parts if p) or "—"


async def _load_accessible_projects(db: AsyncSession, user) -> list[PlantingProject]:
    stmt = select(PlantingProject).order_by(PlantingProject.created_at.desc())
    stmt = project_list_filter(user, stmt)
    return list((await db.execute(stmt)).scalars().all())


def _match_project_filters(
    project: PlantingProject,
    loc: dict[str, str],
    *,
    financial_year: str | None,
    state_code: str | None,
    district_code: str | None,
    segment: str | None,
    scheme_code: str | None,
    status: str | None,
) -> bool:
    if financial_year and loc.get("financial_year") != financial_year:
        return False
    if state_code and loc.get("state_code") != state_code:
        return False
    if district_code and loc.get("district_code") != district_code:
        return False
    if segment and project.segment != segment:
        return False
    if scheme_code and (project.scheme_code or "") != scheme_code:
        return False
    return not (status and project.status != status)


async def _project_row(db: AsyncSession, project: PlantingProject) -> dict[str, Any]:
    summary = await project_summary(db, project)
    loc = project_location_meta(project)
    interval = survey_interval_days(project)
    cutoff = datetime.now(UTC) - timedelta(days=interval)
    due_count = int(
        (
            await db.execute(
                select(func.count()).where(
                    Tree.project_id == project.id,
                    Tree.status != "removed",
                    func.coalesce(Tree.last_geotag_at, Tree.registered_at) <= cutoff,
                )
            )
        ).scalar_one()
        or 0
    )
    return {
        "project_id": str(project.id),
        "project_code": project.code,
        "project_name": project.name,
        "financial_year": loc["financial_year"] or "Unassigned",
        "state_code": loc["state_code"],
        "state_name": loc["state_name"],
        "district_code": loc["district_code"],
        "district_name": loc["district_name"],
        "location": _location_label(loc),
        "segment": project.segment,
        "scheme_code": project.scheme_code or "",
        "status": project.status,
        "compliance_mode": project.compliance_mode,
        "target_tree_count": project.target_tree_count,
        "registered_trees": int(summary.get("tree_count") or 0),
        "work_area_count": int(summary.get("work_area_count") or 0),
        "progress_pct": summary.get("progress_pct"),
        "survival_due": due_count,
        "open_violations": int(summary.get("open_violations") or 0),
        "survey_interval_days": interval,
    }


async def build_project_wise_report(
    db: AsyncSession,
    user,
    *,
    financial_year: str | None = None,
    state_code: str | None = None,
    district_code: str | None = None,
    segment: str | None = None,
    scheme_code: str | None = None,
    status: str | None = None,
    survival_due_only: bool = False,
    violations_only: bool = False,
) -> dict[str, Any]:
    projects = await _load_accessible_projects(db, user)
    rows: list[dict[str, Any]] = []
    for project in projects:
        loc = project_location_meta(project)
        if not _match_project_filters(
            project,
            loc,
            financial_year=financial_year,
            state_code=state_code,
            district_code=district_code,
            segment=segment,
            scheme_code=scheme_code,
            status=status,
        ):
            continue
        row = await _project_row(db, project)
        if survival_due_only and row["survival_due"] <= 0:
            continue
        if violations_only and row["open_violations"] <= 0:
            continue
        rows.append(row)
    return {
        "report": "project_wise",
        "generated_at": datetime.now(UTC).isoformat(),
        "filters": {
            "financial_year": financial_year,
            "state_code": state_code,
            "district_code": district_code,
            "segment": segment,
            "scheme_code": scheme_code,
            "status": status,
            "survival_due_only": survival_due_only,
            "violations_only": violations_only,
        },
        "items": rows,
        "total": len(rows),
    }


async def build_fy_wise_report(
    db: AsyncSession,
    user,
    *,
    financial_year: str | None = None,
    state_code: str | None = None,
    segment: str | None = None,
    scheme_code: str | None = None,
) -> dict[str, Any]:
    project_report = await build_project_wise_report(
        db,
        user,
        financial_year=financial_year,
        state_code=state_code,
        segment=segment,
        scheme_code=scheme_code,
    )
    grouped: dict[str, dict[str, Any]] = {}
    for row in project_report["items"]:
        fy = row["financial_year"] or "Unassigned"
        bucket = grouped.setdefault(
            fy,
            {
                "financial_year": fy,
                "project_count": 0,
                "target_trees": 0,
                "registered_trees": 0,
                "survival_due": 0,
                "open_violations": 0,
            },
        )
        bucket["project_count"] += 1
        bucket["target_trees"] += int(row.get("target_tree_count") or 0)
        bucket["registered_trees"] += int(row.get("registered_trees") or 0)
        bucket["survival_due"] += int(row.get("survival_due") or 0)
        bucket["open_violations"] += int(row.get("open_violations") or 0)

    items = []
    for fy in sorted(grouped.keys(), reverse=True):
        bucket = grouped[fy]
        target = bucket["target_trees"]
        registered = bucket["registered_trees"]
        bucket["achievement_pct"] = round((registered / target) * 100, 1) if target else None
        items.append(bucket)

    return {
        "report": "fy_wise",
        "generated_at": datetime.now(UTC).isoformat(),
        "filters": {
            "financial_year": financial_year,
            "state_code": state_code,
            "segment": segment,
            "scheme_code": scheme_code,
        },
        "items": items,
        "total": len(items),
    }


async def build_regeotag_report(
    db: AsyncSession,
    user,
    *,
    project_id: uuid.UUID | None = None,
    financial_year: str | None = None,
    state_code: str | None = None,
    segment: str | None = None,
    min_days_overdue: int | None = None,
) -> dict[str, Any]:
    projects = await _load_accessible_projects(db, user)
    items: list[dict[str, Any]] = []
    now = datetime.now(UTC)

    for project in projects:
        if project_id and project.id != project_id:
            continue
        loc = project_location_meta(project)
        if not _match_project_filters(
            project,
            loc,
            financial_year=financial_year,
            state_code=state_code,
            district_code=None,
            segment=segment,
            scheme_code=None,
            status=None,
        ):
            continue
        interval = survey_interval_days(project)
        cutoff = now - timedelta(days=interval)
        trees = list(
            (
                await db.execute(
                    select(Tree).where(
                        Tree.project_id == project.id,
                        Tree.status != "removed",
                    )
                )
            ).scalars().all()
        )
        for tree in trees:
            last_at = tree.last_geotag_at or tree.registered_at
            if last_at is None or last_at > cutoff:
                continue
            days_overdue = (now - last_at).days - interval
            if min_days_overdue is not None and days_overdue < min_days_overdue:
                continue
            meta = tree.metadata_ or {}
            pt = None
            if tree.location is not None:
                pt = mapping(tree.location)["coordinates"]
            items.append(
                {
                    "tree_id": str(tree.id),
                    "public_code": tree.public_code,
                    "project_id": str(project.id),
                    "project_code": project.code,
                    "project_name": project.name,
                    "financial_year": loc["financial_year"] or "Unassigned",
                    "state_name": loc["state_name"],
                    "district_name": loc["district_name"],
                    "segment": project.segment,
                    "species": tree.species_text or "",
                    "survival_status": meta.get("survival_status") if isinstance(meta.get("survival_status"), str) else "",
                    "last_geotag_at": last_at.isoformat() if last_at else "",
                    "days_overdue": max(days_overdue, 0),
                    "survey_interval_days": interval,
                    "latitude": pt[1] if pt else None,
                    "longitude": pt[0] if pt else None,
                    "accuracy_m": float(tree.accuracy_m) if tree.accuracy_m is not None else None,
                }
            )
            if len(items) >= EXPORT_ROW_CAP:
                break
        if len(items) >= EXPORT_ROW_CAP:
            break

    items.sort(key=lambda r: (-int(r.get("days_overdue") or 0), r.get("public_code") or ""))
    return {
        "report": "re_geotag",
        "generated_at": now.isoformat(),
        "filters": {
            "project_id": str(project_id) if project_id else None,
            "financial_year": financial_year,
            "state_code": state_code,
            "segment": segment,
            "min_days_overdue": min_days_overdue,
        },
        "items": items,
        "total": len(items),
        "capped": len(items) >= EXPORT_ROW_CAP,
    }


async def build_total_records_report(
    db: AsyncSession,
    user,
    *,
    project_id: uuid.UUID | None = None,
    work_area_id: uuid.UUID | None = None,
    financial_year: str | None = None,
    state_code: str | None = None,
    health: str | None = None,
    survival_status: str | None = None,
    species: str | None = None,
    satellite_verified: bool | None = None,
    registered_from: datetime | None = None,
    registered_to: datetime | None = None,
    page: int = 1,
    page_size: int = 50,
    export_all: bool = False,
) -> dict[str, Any]:
    project_map: dict[uuid.UUID, PlantingProject] = {}
    loc_map: dict[uuid.UUID, dict[str, str]] = {}
    for project in await _load_accessible_projects(db, user):
        project_map[project.id] = project
        loc_map[project.id] = project_location_meta(project)

    allowed_project_ids = set(project_map.keys())
    if project_id:
        if project_id not in allowed_project_ids:
            return {
                "report": "total_records",
                "items": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
            }
        allowed_project_ids = {project_id}

    if financial_year or state_code:
        filtered: set[uuid.UUID] = set()
        for pid, loc in loc_map.items():
            if pid not in allowed_project_ids:
                continue
            if financial_year and loc.get("financial_year") != financial_year:
                continue
            if state_code and loc.get("state_code") != state_code:
                continue
            filtered.add(pid)
        allowed_project_ids = filtered

    if not allowed_project_ids:
        return {
            "report": "total_records",
            "generated_at": datetime.now(UTC).isoformat(),
            "filters": {},
            "items": [],
            "total": 0,
            "page": page,
            "page_size": page_size,
        }

    stmt = select(Tree).where(Tree.status != "removed", Tree.project_id.in_(allowed_project_ids))
    stmt = await apply_tree_scope(stmt, user, db)
    if work_area_id:
        stmt = stmt.where(Tree.plantation_id == work_area_id)
    if health:
        stmt = stmt.where(Tree.current_health == health)
    if survival_status:
        stmt = stmt.where(Tree.metadata_["survival_status"].astext == survival_status)
    if satellite_verified is not None:
        stmt = stmt.where(Tree.satellite_verified.is_(satellite_verified))
    if registered_from:
        stmt = stmt.where(Tree.registered_at >= registered_from)
    if registered_to:
        stmt = stmt.where(Tree.registered_at <= registered_to)
    if species:
        stmt = stmt.where(Tree.species_text.ilike(f"%{species}%"))

    total_before_survival = (
        await db.execute(select(func.count()).select_from(stmt.subquery()))
    ).scalar_one()

    limit = EXPORT_ROW_CAP if export_all else page_size
    offset = 0 if export_all else (page - 1) * page_size
    stmt = stmt.order_by(Tree.registered_at.desc()).offset(offset).limit(limit)
    trees = list((await db.execute(stmt)).scalars().all())

    work_area_ids = {t.plantation_id for t in trees if t.plantation_id}
    work_area_names: dict[uuid.UUID, str] = {}
    if work_area_ids:
        fence_rows = (
            await db.execute(
                select(PlantationFence.id, PlantationFence.name).where(
                    PlantationFence.id.in_(work_area_ids)
                )
            )
        ).all()
        work_area_names = dict(fence_rows)

    items: list[dict[str, Any]] = []
    for tree in trees:
        meta = tree.metadata_ or {}
        surv = meta.get("survival_status") if isinstance(meta.get("survival_status"), str) else ""
        project = project_map.get(tree.project_id) if tree.project_id else None
        loc = loc_map.get(tree.project_id, {}) if tree.project_id else {}
        pt = None
        if tree.location is not None:
            pt = mapping(tree.location)["coordinates"]
        items.append(
            {
                "tree_id": str(tree.id),
                "public_code": tree.public_code,
                "species": tree.species_text or "",
                "health": tree.current_health or "",
                "survival_status": surv,
                "project_id": str(tree.project_id) if tree.project_id else "",
                "project_code": project.code if project else "",
                "project_name": project.name if project else "",
                "financial_year": loc.get("financial_year") or "",
                "state_name": loc.get("state_name") or "",
                "district_name": loc.get("district_name") or "",
                "village_name": loc.get("village_name") or "",
                "work_area_name": work_area_names.get(tree.plantation_id) if tree.plantation_id else "",
                "latitude": pt[1] if pt else None,
                "longitude": pt[0] if pt else None,
                "accuracy_m": float(tree.accuracy_m) if tree.accuracy_m is not None else None,
                "carbon_kg": float(tree.current_carbon_kg or 0),
                "satellite_verified": bool(tree.satellite_verified),
                "planted_at": tree.planted_at.isoformat() if tree.planted_at else "",
                "registered_at": tree.registered_at.isoformat() if tree.registered_at else "",
                "last_geotag_at": tree.last_geotag_at.isoformat() if tree.last_geotag_at else "",
            }
        )

    total = int(total_before_survival or 0)

    return {
        "report": "total_records",
        "generated_at": datetime.now(UTC).isoformat(),
        "filters": {
            "project_id": str(project_id) if project_id else None,
            "work_area_id": str(work_area_id) if work_area_id else None,
            "financial_year": financial_year,
            "state_code": state_code,
            "health": health,
            "survival_status": survival_status,
            "species": species,
            "satellite_verified": satellite_verified,
            "registered_from": registered_from.isoformat() if registered_from else None,
            "registered_to": registered_to.isoformat() if registered_to else None,
        },
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "capped": export_all and len(items) >= EXPORT_ROW_CAP,
    }


def render_table_xlsx(*, sheet_name: str, headers: list[str], rows: list[list[Any]]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = sheet_name[:31]
    ws.append(headers)
    for row in rows:
        ws.append(row)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def render_table_pdf(
    *,
    title: str,
    subtitle: str,
    headers: list[str],
    rows: list[list[Any]],
    landscape_mode: bool = False,
) -> bytes:
    buf = io.BytesIO()
    page_size = landscape(A4) if landscape_mode or len(headers) > 6 else A4
    doc = SimpleDocTemplate(
        buf,
        pagesize=page_size,
        title=title,
        author="Aranyix",
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
    )
    styles = getSampleStyleSheet()
    h1 = styles["Heading1"]
    h1.textColor = colors.HexColor("#15803D")
    body = styles["BodyText"]
    story: list = [
        Paragraph(title, h1),
        Paragraph(subtitle, body),
        Spacer(1, 4 * mm),
    ]
    table_data = [headers] + [[str(c) if c is not None else "" for c in row] for row in rows]
    table = Table(table_data, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#15803D")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
                ("GRID", (0, 0), (-1, -1), 0.1, colors.grey),
            ]
        )
    )
    story.append(table)
    doc.build(story)
    return buf.getvalue()


def export_project_wise(ctx: dict[str, Any], fmt: ExportFormat) -> tuple[bytes, str, str]:
    headers = [
        "Project code",
        "Project name",
        "Financial year",
        "State",
        "District",
        "Location",
        "Segment",
        "Scheme",
        "Status",
        "Target trees",
        "Registered",
        "Progress %",
        "Re-geotag due",
        "Violations",
    ]
    rows = [
        [
            r["project_code"],
            r["project_name"],
            r["financial_year"],
            r["state_name"],
            r["district_name"],
            r["location"],
            r["segment"],
            r["scheme_code"],
            r["status"],
            r.get("target_tree_count"),
            r["registered_trees"],
            r.get("progress_pct"),
            r["survival_due"],
            r["open_violations"],
        ]
        for r in ctx["items"]
    ]
    subtitle = f"Generated {ctx['generated_at']} · {ctx['total']} projects"
    if fmt == "xlsx":
        return (
            render_table_xlsx(sheet_name="Project wise", headers=headers, rows=rows),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "xlsx",
        )
    return (
        render_table_pdf(title="Project-wise Plantation Report", subtitle=subtitle, headers=headers, rows=rows, landscape_mode=True),
        "application/pdf",
        "pdf",
    )


def export_fy_wise(ctx: dict[str, Any], fmt: ExportFormat) -> tuple[bytes, str, str]:
    headers = [
        "Financial year",
        "Projects",
        "Target trees",
        "Registered",
        "Achievement %",
        "Re-geotag due",
        "Violations",
    ]
    rows = [
        [
            r["financial_year"],
            r["project_count"],
            r["target_trees"],
            r["registered_trees"],
            r.get("achievement_pct"),
            r["survival_due"],
            r["open_violations"],
        ]
        for r in ctx["items"]
    ]
    subtitle = f"Generated {ctx['generated_at']} · {ctx['total']} financial years"
    if fmt == "xlsx":
        return (
            render_table_xlsx(sheet_name="FY wise", headers=headers, rows=rows),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "xlsx",
        )
    return (
        render_table_pdf(title="FY-wise Plantation Report", subtitle=subtitle, headers=headers, rows=rows),
        "application/pdf",
        "pdf",
    )


def export_regeotag(ctx: dict[str, Any], fmt: ExportFormat) -> tuple[bytes, str, str]:
    headers = [
        "Tree code",
        "Project",
        "FY",
        "State",
        "District",
        "Species",
        "Survival",
        "Last geotag",
        "Days overdue",
        "Latitude",
        "Longitude",
    ]
    rows = [
        [
            r["public_code"],
            r["project_name"],
            r["financial_year"],
            r["state_name"],
            r["district_name"],
            r["species"],
            r["survival_status"],
            r["last_geotag_at"],
            r["days_overdue"],
            r.get("latitude"),
            r.get("longitude"),
        ]
        for r in ctx["items"]
    ]
    subtitle = f"Generated {ctx['generated_at']} · {ctx['total']} trees due"
    if fmt == "xlsx":
        return (
            render_table_xlsx(sheet_name="Re-geotag", headers=headers, rows=rows),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "xlsx",
        )
    return (
        render_table_pdf(title="Re-geotag / Survival Survey Report", subtitle=subtitle, headers=headers, rows=rows, landscape_mode=True),
        "application/pdf",
        "pdf",
    )


def export_total_records(ctx: dict[str, Any], fmt: ExportFormat) -> tuple[bytes, str, str]:
    headers = [
        "Tree code",
        "Species",
        "Health",
        "Survival",
        "Project",
        "FY",
        "State",
        "District",
        "Village",
        "Work area",
        "Latitude",
        "Longitude",
        "Carbon kg",
        "Satellite OK",
        "Registered",
        "Last geotag",
    ]
    rows = [
        [
            r["public_code"],
            r["species"],
            r["health"],
            r["survival_status"],
            r["project_name"],
            r["financial_year"],
            r["state_name"],
            r["district_name"],
            r["village_name"],
            r["work_area_name"],
            r.get("latitude"),
            r.get("longitude"),
            r.get("carbon_kg"),
            "Yes" if r.get("satellite_verified") else "No",
            r.get("registered_at"),
            r.get("last_geotag_at"),
        ]
        for r in ctx["items"]
    ]
    subtitle = f"Generated {ctx['generated_at']} · {len(rows)} rows shown"
    if fmt == "xlsx":
        return (
            render_table_xlsx(sheet_name="Plantation records", headers=headers, rows=rows),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "xlsx",
        )
    return (
        render_table_pdf(title="Total Plantation Record", subtitle=subtitle, headers=headers, rows=rows, landscape_mode=True),
        "application/pdf",
        "pdf",
    )
