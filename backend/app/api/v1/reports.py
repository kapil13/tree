"""Report generation endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select

from app.api.v1.deps import DB, CurrentUser
from app.models.report import Report
from app.models.tree import Tree
from app.services.reports import render_carbon_report_pdf, render_trees_report_xlsx

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def queue_report(
    kind: str,
    format: str,
    user: CurrentUser,
    db: DB,
) -> dict:
    if kind not in {"tree", "plantation", "carbon", "esg"}:
        raise HTTPException(422, detail="invalid_kind")
    if format not in {"pdf", "xlsx"}:
        raise HTTPException(422, detail="invalid_format")
    r = Report(
        organization_id=user.organization_id,
        requested_by=user.id,
        kind=kind,
        format=format,
        status="queued",
    )
    db.add(r)
    await db.commit()
    await db.refresh(r)
    return {"id": str(r.id), "status": r.status}


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
            "s3_key": r.s3_key,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


@router.get("/{report_id}/download")
async def download_report(report_id: uuid.UUID, user: CurrentUser, db: DB) -> Response:
    res = await db.execute(
        select(Report).where(Report.id == report_id, Report.requested_by == user.id)
    )
    rpt = res.scalar_one_or_none()
    if rpt is None:
        raise HTTPException(404, detail="not_found")

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

    if rpt.format == "xlsx":
        data = render_trees_report_xlsx(rows)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ext = "xlsx"
    else:
        org_name = "Your Organization"
        data = render_carbon_report_pdf(org_name, summary, rows)
        media = "application/pdf"
        ext = "pdf"

    rpt.status = "done"
    rpt.completed_at = datetime.utcnow()
    await db.commit()
    return Response(
        content=data,
        media_type=media,
        headers={
            "Content-Disposition": f'attachment; filename="{rpt.kind}-{rpt.id}.{ext}"'
        },
    )
