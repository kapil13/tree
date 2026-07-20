"""Report generation endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, Request, Response, status
from sqlalchemy import select

from app.api.v1.deps import DB, CurrentUser
from app.api.v1.plantation_fences import _load_fence
from app.models.bioacoustic_recording import BioacousticRecording
from app.models.report import Report
from app.models.tree import Tree
from app.services.bioacoustic.correlation import correlate_fence_ecosystem
from app.services.reports import (
    render_bioacoustic_report_pdf,
    render_bioacoustic_report_xlsx,
    render_carbon_report_pdf,
    render_esg_report_pdf,
    render_trees_report_xlsx,
)
from app.services.audit import record_audit

router = APIRouter(prefix="/reports", tags=["reports"])


async def _tree_rows(user, db) -> tuple[list[dict], dict]:
    trees_q = select(Tree)
    if user.organization_id and user.role != "admin":
        trees_q = trees_q.where(
            (Tree.owner_user_id == user.id) | (Tree.organization_id == user.organization_id)
        )
    trees = (await db.execute(trees_q.limit(1000))).scalars().all()
    rows = []
    for t in trees:
        from geoalchemy2.shape import to_shape

        pt = to_shape(t.location)
        rows.append(
            {
                "public_code": t.public_code,
                "species": t.species_text or "Unknown",
                "health": t.current_health,
                "carbon_kg": float(t.current_carbon_kg or 0),
                "co2e_kg": float(t.current_carbon_kg or 0) * 44 / 12,
                "lat": pt.y,
                "lon": pt.x,
                "planted_at": t.planted_at.isoformat() if t.planted_at else None,
                "dbh_cm": float(t.current_dbh_cm) if t.current_dbh_cm else None,
                "height_m": float(t.current_height_m) if t.current_height_m else None,
                "satellite_verified": t.satellite_verified,
            }
        )

    summary = {
        "total_trees": len(rows),
        "total_biomass_kg": sum(r["carbon_kg"] / 0.47 for r in rows),
        "total_carbon_kg": sum(r["carbon_kg"] for r in rows),
        "total_co2e_kg": sum(r["co2e_kg"] for r in rows),
        "annual_sequestration_kg": sum(r["co2e_kg"] for r in rows) * 0.07,
        "lifetime_credits_tco2e": sum(r["co2e_kg"] for r in rows) * 5 / 1000.0,
        "estimated_revenue_usd": sum(r["co2e_kg"] for r in rows) * 5 / 1000.0 * 12 * 0.55,
    }
    return rows, summary


@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def queue_report(
    kind: str,
    format: str,
    request: Request,
    user: CurrentUser,
    db: DB,
    plantation_fence_id: uuid.UUID | None = Query(None),
) -> dict:
    if kind not in {"tree", "plantation", "carbon", "esg", "biodiversity"}:
        raise HTTPException(422, detail="invalid_kind")
    if format not in {"pdf", "xlsx"}:
        raise HTTPException(422, detail="invalid_format")
    if kind in {"biodiversity", "plantation"} and plantation_fence_id is None:
        raise HTTPException(422, detail="plantation_fence_id_required")
    filters: dict = {}
    if plantation_fence_id:
        filters["plantation_fence_id"] = str(plantation_fence_id)
    r = Report(
        organization_id=user.organization_id,
        requested_by=user.id,
        kind=kind,
        format=format,
        status="queued",
        filters=filters,
    )
    db.add(r)
    await db.flush()
    await record_audit(
        db,
        actor=user,
        action="report.queue",
        resource_type="report",
        resource_id=r.id,
        request=request,
        diff={"kind": kind, "format": format, "filters": filters},
    )
    await db.commit()
    await db.refresh(r)
    return {"id": str(r.id), "status": r.status, "kind": r.kind, "filters": r.filters}


@router.get("")
async def list_reports(user: CurrentUser, db: DB) -> list[dict]:
    stmt = select(Report).where(Report.requested_by == user.id).order_by(
        Report.created_at.desc()
    )
    rows = (await db.execute(stmt.limit(50))).scalars().all()
    return [
        {
            "id": str(r.id),
            "kind": r.kind,
            "format": r.format,
            "status": r.status,
            "filters": r.filters,
            "s3_key": r.s3_key,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


@router.get("/{report_id}/download")
async def download_report(
    report_id: uuid.UUID, request: Request, user: CurrentUser, db: DB
) -> Response:
    res = await db.execute(
        select(Report).where(Report.id == report_id, Report.requested_by == user.id)
    )
    rpt = res.scalar_one_or_none()
    if rpt is None:
        raise HTTPException(404, detail="not_found")

    tree_rows, carbon_summary = await _tree_rows(user, db)
    org_name = "Your Organization"
    ecosystem: dict | None = None
    recordings: list[dict] = []

    fence_id_raw = (rpt.filters or {}).get("plantation_fence_id")
    if fence_id_raw:
        fence = await _load_fence(uuid.UUID(str(fence_id_raw)), user, db)
        ecosystem = await correlate_fence_ecosystem(db, fence)
        org_name = fence.name
        rec_res = await db.execute(
            select(BioacousticRecording)
            .where(
                BioacousticRecording.plantation_fence_id == fence.id,
                BioacousticRecording.status == "analyzed",
            )
            .order_by(BioacousticRecording.recorded_at.desc())
            .limit(20)
        )
        for rec in rec_res.scalars().all():
            recordings.append(
                {
                    "recorded_at": rec.recorded_at.isoformat(),
                    "duration_seconds": float(rec.duration_seconds),
                    "bioacoustic_health_score": float(rec.bioacoustic_health_score or 0),
                    "total_species_count": rec.total_species_count,
                }
            )

    if rpt.kind == "biodiversity":
        if ecosystem is None:
            raise HTTPException(400, detail="plantation_fence_id_required")
        if rpt.format == "xlsx":
            data = render_bioacoustic_report_xlsx(ecosystem)
            media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ext = "xlsx"
        else:
            data = render_bioacoustic_report_pdf(org_name, ecosystem, recordings)
            media = "application/pdf"
            ext = "pdf"
    elif rpt.kind == "esg":
        if rpt.format != "pdf":
            raise HTTPException(422, detail="esg_pdf_only")
        data = render_esg_report_pdf(org_name, carbon_summary, ecosystem, tree_rows)
        media = "application/pdf"
        ext = "pdf"
    elif rpt.format == "xlsx":
        data = render_trees_report_xlsx(tree_rows)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ext = "xlsx"
    else:
        data = render_carbon_report_pdf(org_name, carbon_summary, tree_rows)
        media = "application/pdf"
        ext = "pdf"

    rpt.status = "done"
    rpt.completed_at = datetime.utcnow()
    await record_audit(
        db,
        actor=user,
        action="report.download",
        resource_type="report",
        resource_id=rpt.id,
        request=request,
        diff={"kind": rpt.kind, "format": rpt.format},
    )
    await db.commit()
    return Response(
        content=data,
        media_type=media,
        headers={
            "Content-Disposition": f'attachment; filename="{rpt.kind}-{rpt.id}.{ext}"'
        },
    )
