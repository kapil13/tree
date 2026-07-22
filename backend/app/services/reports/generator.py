"""Generate report bytes and persist to object storage."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.plantation_fences import _load_fence
from app.models.bioacoustic_recording import BioacousticRecording
from app.models.report import Report
from app.models.tree import Tree
from app.models.user import User
from app.services.bioacoustic.correlation import correlate_fence_ecosystem
from app.services.reports import (
    render_bioacoustic_report_pdf,
    render_bioacoustic_report_xlsx,
    render_carbon_report_pdf,
    render_esg_report_pdf,
    render_trees_report_xlsx,
)
from app.services.storage import get_storage


async def _tree_rows(user: User, db: AsyncSession) -> tuple[list[dict], dict]:
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


async def generate_report_bytes(
    rpt: Report,
    *,
    user: User,
    db: AsyncSession,
) -> tuple[bytes, str, str]:
    """Return (data, media_type, file_extension)."""
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
            raise ValueError("plantation_fence_id_required")
        if rpt.format == "xlsx":
            return (
                render_bioacoustic_report_xlsx(ecosystem),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "xlsx",
            )
        return (
            render_bioacoustic_report_pdf(org_name, ecosystem, recordings),
            "application/pdf",
            "pdf",
        )
    if rpt.kind == "esg":
        if rpt.format != "pdf":
            raise ValueError("esg_pdf_only")
        return (
            render_esg_report_pdf(org_name, carbon_summary, ecosystem, tree_rows),
            "application/pdf",
            "pdf",
        )
    if rpt.format == "xlsx":
        return (
            render_trees_report_xlsx(tree_rows),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "xlsx",
        )
    return (
        render_carbon_report_pdf(org_name, carbon_summary, tree_rows),
        "application/pdf",
        "pdf",
    )


async def build_and_store_report(rpt: Report, *, user: User, db: AsyncSession) -> Report:
    """Generate report synchronously, upload to S3 when available, mark ready."""
    try:
        data, media_type, ext = await generate_report_bytes(rpt, user=user, db=db)
        storage = get_storage()
        key = f"reports/{user.organization_id or user.id}/{rpt.id}.{ext}"
        if storage.is_available():
            storage.put_bytes(key, data, content_type=media_type)
            rpt.s3_key = key
        rpt.status = "ready"
        rpt.completed_at = datetime.now(UTC)
        rpt.error = None
    except Exception as exc:
        rpt.status = "failed"
        rpt.error = str(exc)[:2000]
        rpt.completed_at = None
    return rpt
