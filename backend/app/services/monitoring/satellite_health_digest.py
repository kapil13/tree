"""Daily satellite health email/SMS digest — aggregates recent NDVI alerts."""

from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.alert import Alert
from app.models.user import User
from app.services.alerts.service import satellite_health_prefs
from app.services.monitoring.alert_engine import create_monitoring_alert

log = get_logger("monitoring.satellite_digest")

DIGEST_WINDOW_HOURS = 24
DIGEST_KIND = "satellite_health_digest"
SEVERITY_ORDER = {"info": 0, "medium": 1, "warning": 2, "high": 2, "critical": 3}


def is_satellite_health_alert(kind: str) -> bool:
    """Return True for satellite-related alert kinds (excluding digest itself)."""
    if kind == DIGEST_KIND:
        return False
    if kind == "ndvi_degradation":
        return True
    return kind.startswith("satellite_health_")


def digest_severity(alerts: list[Alert]) -> str:
    """Pick digest severity from the worst source alert."""
    worst = 0
    for alert in alerts:
        kind = alert.kind or ""
        sev = alert.severity or "medium"
        if kind.endswith("_critical") or sev == "critical":
            worst = max(worst, SEVERITY_ORDER["critical"])
        elif kind.endswith("_high") or sev in ("high", "warning"):
            worst = max(worst, SEVERITY_ORDER["high"])
        else:
            worst = max(worst, SEVERITY_ORDER.get(sev, 1))
    if worst >= SEVERITY_ORDER["critical"]:
        return "critical"
    if worst >= SEVERITY_ORDER["high"]:
        return "high"
    return "medium"


def build_digest_content(
    alerts: list[Alert], *, digest_date: str
) -> tuple[str, str, dict[str, Any]]:
    """Build title, message, and summary payload for a user's digest."""
    by_kind: dict[str, int] = defaultdict(int)
    critical = 0
    high = 0
    for alert in alerts:
        by_kind[alert.kind] += 1
        sev = alert.severity or ""
        if sev == "critical" or (alert.kind or "").endswith("_critical"):
            critical += 1
        elif sev in ("high", "warning") or (alert.kind or "").endswith("_high"):
            high += 1

    total = len(alerts)
    title = f"Satellite health digest — {total} alert{'s' if total != 1 else ''} ({digest_date})"

    parts = [
        f"In the last {DIGEST_WINDOW_HOURS} hours you had {total} satellite health alert(s).",
    ]
    if critical:
        parts.append(f"{critical} critical.")
    if high:
        parts.append(f"{high} high priority.")
    if by_kind.get("ndvi_degradation"):
        parts.append(f"NDVI drops: {by_kind['ndvi_degradation']}.")
    sat_health = sum(v for k, v in by_kind.items() if k.startswith("satellite_health_"))
    if sat_health:
        parts.append(f"Satellite health analyses: {sat_health}.")

    top_titles = [a.title for a in alerts[:5]]
    if top_titles:
        parts.append("Top items: " + "; ".join(top_titles) + ".")
    parts.append("Review details on the Monitoring dashboard.")

    message = " ".join(parts)[:4000]
    payload = {
        "digest_date": digest_date,
        "alert_count": total,
        "critical_count": critical,
        "high_count": high,
        "by_kind": dict(by_kind),
        "source_alert_ids": [str(a.id) for a in alerts[:50]],
    }
    return title, message, payload


async def run_daily_satellite_health_digest(db: AsyncSession) -> dict[str, Any]:
    """Aggregate last-24h satellite alerts per user and send one digest each."""
    since = datetime.now(UTC) - timedelta(hours=DIGEST_WINDOW_HOURS)
    digest_date = datetime.now(UTC).strftime("%Y-%m-%d")

    res = await db.execute(
        select(Alert)
        .where(Alert.created_at >= since)
        .order_by(Alert.created_at.desc())
        .limit(5000)
    )
    rows = [a for a in res.scalars().all() if is_satellite_health_alert(a.kind)]

    by_user: dict[uuid.UUID, list[Alert]] = defaultdict(list)
    for alert in rows:
        by_user[alert.user_id].append(alert)

    digests_sent = 0
    users_skipped = 0
    for user_id, user_alerts in by_user.items():
        user = await db.get(User, user_id)
        if user is None:
            continue

        prefs = satellite_health_prefs(user)
        if not prefs.get("enabled", True):
            users_skipped += 1
            continue
        if not prefs.get("daily_digest", True):
            users_skipped += 1
            continue

        severity = digest_severity(user_alerts)
        title, message, payload = build_digest_content(user_alerts, digest_date=digest_date)

        alert = await create_monitoring_alert(
            db,
            user=user,
            kind=DIGEST_KIND,
            severity=severity,
            title=title,
            message=message,
            payload=payload,
            prefs_key="satellite_health",
            dedupe_hours=20,
            dedupe_keys=("digest_date",),
        )
        if alert:
            digests_sent += 1

    await db.commit()
    result = {
        "digests_sent": digests_sent,
        "users_skipped": users_skipped,
        "source_alerts": len(rows),
        "users_with_alerts": len(by_user),
    }
    log.info("satellite_health_digest.complete", **result)
    return result
