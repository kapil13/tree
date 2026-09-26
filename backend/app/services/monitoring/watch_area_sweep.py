"""Daily optical sweep for manually satellite-watch-enabled work areas."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.monitoring_scan_target import MonitoringScanTarget
from app.services.monitoring.satellite_sweep import scan_and_persist_work_area
from app.services.monitoring.scan_policy import DAILY_WATCH_OPTICAL_SKIP_DAYS
from app.services.monitoring.scan_targets import mark_target_scanned
from app.services.monitoring.watch_scope import fetch_satellite_watch_fences

log = get_logger("monitoring.watch_area_sweep")


async def run_daily_satellite_watch_sweep(db: AsyncSession) -> dict[str, Any]:
    """Scan watch-enabled work areas when due (shorter skip than monthly job)."""
    now = datetime.now(UTC)
    scanned = failed = skipped_recent = 0
    fences = await fetch_satellite_watch_fences(db)

    for fence in fences:
        if fence.last_satellite_at:
            age_days = (now - fence.last_satellite_at).days
            if age_days < DAILY_WATCH_OPTICAL_SKIP_DAYS:
                skipped_recent += 1
                continue

        rec = await scan_and_persist_work_area(
            db,
            fence,
            require_sentinel=False,
            notify_user_id=fence.owner_user_id,
        )
        if rec:
            scanned += 1
            target = (
                await db.execute(
                    select(MonitoringScanTarget).where(
                        MonitoringScanTarget.fence_id == fence.id
                    )
                )
            ).scalar_one_or_none()
            if target:
                await mark_target_scanned(db, target)
        else:
            failed += 1

    await db.commit()
    result = {
        "scanned": scanned,
        "failed": failed,
        "skipped_recent": skipped_recent,
        "total_watch_fences": len(fences),
        "watch_gated": True,
    }
    log.info("daily_satellite_watch_sweep.complete", **result)
    return result
