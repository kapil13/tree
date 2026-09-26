"""Paginated portfolio sweep job runners (SAR + optical satellite)."""

from __future__ import annotations

import time
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.services.monitoring.boundary_validation import try_fence_boundary_geojson
from app.services.monitoring.monitoring_read_cache import invalidate_threat_watch_for_owners
from app.services.monitoring.prometheus_metrics import (
    observe_sweep_page_duration,
    observe_sweep_page_result,
)
from app.services.monitoring.sar_portfolio import list_at_risk_fence_ids
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
WEEKLY_INTEGRITY_CANDIDATE_LIMIT = 20


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


def _provider_mode(*, live_scans: int, stub_scans: int, scanned: int) -> str:
    if scanned == 0:
        return "none"
    if live_scans > 0 and stub_scans == 0:
        return "live"
    if live_scans == 0 and stub_scans > 0:
        return "stub_only"
    return "degraded"


def _collect_owner_ids(fences: list) -> set[uuid.UUID]:
    return {fence.owner_user_id for fence in fences if fence.owner_user_id}


async def _invalidate_threat_watch_for_fences(fences: list) -> None:
    await invalidate_threat_watch_for_owners(_collect_owner_ids(fences))


async def run_sar_sweep_page(
    db: AsyncSession,
    *,
    cursor: str | None = None,
    batch_size: int | None = None,
    job_name: str = "monthly_sar_sweep",
) -> dict[str, Any]:
    """Process one page of SAR fence scans. Returns next_cursor when more work remains."""
    started = time.perf_counter()
    page_size = batch_size or settings.monitoring_sweep_batch_size
    fences = await fetch_satellite_watch_fences(db)
    due = _sar_due_fences(fences)
    batch, next_cursor, start = slice_batch(due, cursor, page_size)

    scanned = failed = stub_scans = live_scans = boundary_invalid = 0
    touched_projects: set = set()
    batch_ctx = await build_fence_sar_batch_context(db, batch)

    for fence in batch:
        if try_fence_boundary_geojson(fence) is None:
            boundary_invalid += 1
            failed += 1
            continue
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
    if scanned > 0:
        await _invalidate_threat_watch_for_fences(batch)
    await db.commit()

    result = {
        **outcome,
        "provider_mode": _provider_mode(
            live_scans=live_scans,
            stub_scans=stub_scans,
            scanned=scanned,
        ),
        "boundary_invalid": boundary_invalid,
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
    observe_sweep_page_result(job_name, result)
    observe_sweep_page_duration(job_name, time.perf_counter() - started)
    log.info("sar_sweep_page.complete", job_name=job_name, **result)
    return result


async def run_weekly_sar_integrity_watch_page(
    db: AsyncSession,
    *,
    cursor: str | None = None,
    batch_size: int | None = None,
) -> dict[str, Any]:
    """Process one page of at-risk SAR integrity rescans."""
    started = time.perf_counter()
    job_name = "weekly_sar_integrity_watch"
    page_size = batch_size or settings.monitoring_sweep_batch_size
    fences = await fetch_satellite_watch_fences(db)
    at_risk_ids = await list_at_risk_fence_ids(
        db,
        [f.id for f in fences],
        limit=WEEKLY_INTEGRITY_CANDIDATE_LIMIT,
    )
    fence_by_id = {f.id: f for f in fences}
    to_scan = [fence_by_id[fid] for fid in at_risk_ids if fid in fence_by_id]
    batch, next_cursor, start = slice_batch(to_scan, cursor, page_size)

    scanned = failed = stub_scans = live_scans = boundary_invalid = 0
    touched_projects: set = set()
    batch_ctx = await build_fence_sar_batch_context(db, batch)

    for fence in batch:
        if try_fence_boundary_geojson(fence) is None:
            boundary_invalid += 1
            failed += 1
            continue
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
            job_name="weekly_sar_integrity_watch",
            outcome=outcome,
        )
    if scanned > 0:
        await _invalidate_threat_watch_for_fences(batch)
    await db.commit()

    result = {
        **outcome,
        "provider_mode": _provider_mode(
            live_scans=live_scans,
            stub_scans=stub_scans,
            scanned=scanned,
        ),
        "boundary_invalid": boundary_invalid,
        "candidates": len(at_risk_ids),
        "batch_size": page_size,
        "batch_start": start,
        "batch_processed": len(batch),
        "cursor": cursor,
        "next_cursor": next_cursor,
        "watch_gated": True,
    }
    observe_sweep_page_result(job_name, result)
    observe_sweep_page_duration(job_name, time.perf_counter() - started)
    log.info("weekly_sar_integrity_watch_page.complete", **result)
    return result


async def run_satellite_sweep_page(
    db: AsyncSession,
    *,
    cursor: str | None = None,
    batch_size: int | None = None,
) -> dict[str, Any]:
    """Process one page of optical satellite fence scans."""
    started = time.perf_counter()
    job_name = "monthly_satellite_sweep"
    page_size = batch_size or settings.monitoring_sweep_batch_size
    fences = await fetch_satellite_watch_fences(db)
    due = _satellite_due_fences(fences)
    batch, next_cursor, start = slice_batch(due, cursor, page_size)
    batch_ctx = await build_fence_satellite_batch_context(db, batch)

    scanned = failed = boundary_invalid = 0
    for fence in batch:
        if try_fence_boundary_geojson(fence) is None:
            boundary_invalid += 1
            failed += 1
            continue
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

    if scanned > 0:
        await _invalidate_threat_watch_for_fences(batch)
    await db.commit()
    result = {
        "scanned": scanned,
        "failed": failed,
        "boundary_invalid": boundary_invalid,
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
    observe_sweep_page_result(job_name, result)
    observe_sweep_page_duration(job_name, time.perf_counter() - started)
    log.info("satellite_sweep_page.complete", **result)
    return result
