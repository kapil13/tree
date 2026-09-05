"""Weekly scan cycle supervisor digest — registry stats and sweep telemetry."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.user import User
from app.services.alerts.defaults import DEFAULT_SCAN_CYCLE_PREFS
from app.services.monitoring.alert_engine import create_monitoring_alert
from app.services.monitoring.scan_cycle import build_scan_cycle

log = get_logger("monitoring.scan_cycle_digest")

DIGEST_KIND = "scan_cycle_digest"
DIGEST_WINDOW_DAYS = 7


def scan_cycle_prefs(user: User) -> dict[str, Any]:
    prefs = user.notification_preferences or {}
    base = dict(DEFAULT_SCAN_CYCLE_PREFS)
    base.update(prefs.get("scan_cycle") or {})
    return base


def build_digest_content(cycle: dict[str, Any], *, digest_week: str) -> tuple[str, str, dict[str, Any]]:
    registry = cycle.get("registry") or {}
    enrolled = int(registry.get("enrolled_trees") or 0)
    due_now = int(registry.get("due_now") or 0)
    due_week = int(cycle.get("due_within_7_days") or 0)
    watch_areas = int(registry.get("watch_work_areas") or 0)
    tiles = int(registry.get("distinct_scan_tiles") or 0)

    stale_jobs = sum(1 for j in cycle.get("scheduled_jobs") or [] if j.get("stale"))
    recent = cycle.get("recent_runs") or []
    ok_runs = sum(1 for r in recent if r.get("status") == "ok")
    error_runs = sum(1 for r in recent if r.get("status") == "error")

    title = f"Scan cycle digest — week of {digest_week}"
    parts = [
        f"{enrolled} trees enrolled across {tiles} scan tiles.",
        f"{due_now} due now; {due_week} due within 7 days.",
    ]
    if watch_areas:
        parts.append(f"{watch_areas} manual watch work area(s).")
    if recent:
        parts.append(f"Last 7 days: {ok_runs} successful job run(s), {error_runs} error(s).")
    if stale_jobs:
        parts.append(f"{stale_jobs} scheduled job(s) appear stale — check ops.")
    parts.append("Review the Monitoring dashboard for scan cycle details.")

    message = " ".join(parts)[:4000]
    payload = {
        "digest_week": digest_week,
        "enrolled_trees": enrolled,
        "due_now": due_now,
        "due_within_7_days": due_week,
        "watch_work_areas": watch_areas,
        "distinct_scan_tiles": tiles,
        "stale_jobs": stale_jobs,
        "recent_ok_runs": ok_runs,
        "recent_error_runs": error_runs,
    }
    severity = "high" if error_runs > 0 or stale_jobs > 2 else "medium"
    return title, message, payload, severity


async def run_weekly_scan_cycle_digest(db: AsyncSession) -> dict[str, Any]:
    """Send one scan-cycle digest per supervisor with weekly digest enabled."""
    digest_week = datetime.now(UTC).strftime("%Y-%m-%d")
    since = datetime.now(UTC) - timedelta(days=DIGEST_WINDOW_DAYS)

    res = await db.execute(
        select(User).where(User.is_active.is_(True)).limit(5000)
    )
    users = list(res.scalars().all())

    digests_sent = 0
    users_skipped = 0
    for user in users:
        prefs = scan_cycle_prefs(user)
        if not prefs.get("enabled", True):
            users_skipped += 1
            continue
        if not prefs.get("weekly_digest", True):
            users_skipped += 1
            continue
        if user.role not in {"admin", "government", "corporate", "ngo", "field_supervisor"} and (
            not user.is_org_admin and user.org_role not in ("manager", "supervisor")
        ):
            users_skipped += 1
            continue

        cycle = await build_scan_cycle(db, user)
        title, message, payload, severity = build_digest_content(cycle, digest_week=digest_week)

        alert = await create_monitoring_alert(
            db,
            user=user,
            kind=DIGEST_KIND,
            severity=severity,
            title=title,
            message=message,
            payload=payload,
            prefs_key="scan_cycle",
            dedupe_hours=120,
            dedupe_keys=("digest_week",),
        )
        if alert:
            digests_sent += 1

    await db.commit()
    result = {
        "digests_sent": digests_sent,
        "users_skipped": users_skipped,
        "digest_week": digest_week,
        "window_since": since.isoformat(),
    }
    log.info("scan_cycle_digest.complete", **result)
    return result
