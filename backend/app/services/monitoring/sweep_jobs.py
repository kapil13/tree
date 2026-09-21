"""Paginated portfolio sweep job runners (SAR + optical satellite)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.services.monitoring.sar_sweep import scan_and_persist_fence_sar
from app.services.monitoring.sar_sweep_health import (
    classify_sar_provider,
    notify_project_owners_sweep_health,
    summarize_sweep_counts,
)
from app.services.monitoring.satellite_sweep import scan_and_persist_work_area
from app.services.monitoring.sweep_batch_context import (
    build_fence_sar_batch_context,
    build_fence_satellite_batch_context,
)
from app.services.monitoring.sweep_pagination import slice_batch
from app.services.monitoring.watch_scope import fetch_satellite_watch_fences

log = get_logger("monitoring.sweep_jobs")

SAR_MIN_AGE_DAYS = 20
SATELLITE_MIN_AGE_DAYS = 25


def _sar_due_fences(fences: list) -> list:
    now = datetime.now(UTC)
    due = []
    for fence in fences:
        if not fence.last_satellite_at:
            due.append(fence)
            continue
        if (now - fence.last_satellite_at).days >= SAR_MIN_AGE_DAYS:
            due.append(fence)
    return due


def _satellite_due_fences(fences: list) -> list:
    now = datetime.now(UTC)
    due = []
    for fence in fences:
        if not fence.last_satellite_at:
            due.append(fence)
            continue
        if (now - fence.last_satellite_at).days >= SATELLITE_MIN_AGE_DAYS:
            due.append(fence)
    return due


async def run_sar_sweep_page(
    db: AsyncSession,
    *,
    cursor: str | None = None,
    batch_size: int | None = None,
    job_name: str = "monthly_sar_sweep",
) -> dict[str, Any]:
    """Process one page of SAR fence scans. Returns next_cursor when more work remains."""
    page_size = batch_size or settings.monitoring_sweep_batch_size
    fences = await fetch_satellite_watch_fences(db)
    due = _sar_due_fences(fences)
    batch, next_cursor, start = slice_batch(due, cursor, page_size)

    scanned = failed = stub_scans = live_scans = 0
    touched_projects: set = set()
    batch_ctx = await build_fence_sar_batch_context(db, batch)

    for fence in batch:
        result = await scan_and_persist_fence_sar(db, fence, batch_ctx=batch_ctx)
        if result:
            rec, _analysis = result
            scanned += 1
            if fence.project_id:
                touched_projects.add(fence.project_id)
            kind = classify_sar_provider(rec.provider)
            if kind == "live":
                live_scans += 1
            elif kind == "stub":
                stub_scans += 1
        else:
            failed += 1

    outcome = summarize_sweep_counts(
        scanned=scanned,
        failed=failed,
        stub_scans=stub_scans,
        live_scans=live_scans,
    )
    if touched_projects:
        await notify_project_owners_sweep_health(
            db,
            project_ids=touched_projects,
            job_name=job_name,
            outcome=outcome,
        )
    await db.commit()

    result = {
        **outcome,
        "skipped": len(fences) - len(due),
        "due_total": len(due),
        "total_fences": len(fences),
        "batch_size": page_size,
        "batch_start": start,
        "batch_processed": len(batch),
        "cursor": cursor,
        "next_cursor": next_cursor,
        "watch_gated": True,
    }
    log.info("sar_sweep_page.complete", job_name=job_name, **result)
    return result


async def run_satellite_sweep_page(
    db: AsyncSession,
    *,
    cursor: str | None = None,
    batch_size: int | None = None,
) -> dict[str, Any]:
    """Process one page of optical satellite fence scans."""
    page_size = batch_size or settings.monitoring_sweep_batch_size
    fences = await fetch_satellite_watch_fences(db)
    due = _satellite_due_fences(fences)
    batch, next_cursor, start = slice_batch(due, cursor, page_size)
    batch_ctx = await build_fence_satellite_batch_context(db, batch)

    scanned = failed = 0
    for fence in batch:
        rec = await scan_and_persist_work_area(
            db,
            fence,
            require_sentinel=False,
            batch_ctx=batch_ctx,
        )
        if rec:
            scanned += 1
        else:
            failed += 1

    await db.commit()
    result = {
        "scanned": scanned,
        "failed": failed,
        "skipped": len(fences) - len(due),
        "due_total": len(due),
        "total": len(fences),
        "batch_size": page_size,
        "batch_start": start,
        "batch_processed": len(batch),
        "cursor": cursor,
        "next_cursor": next_cursor,
        "watch_gated": True,
    }
    log.info("satellite_sweep_page.complete", **result)
    return result
