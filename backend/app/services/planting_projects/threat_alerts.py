"""Create threat-watch alerts (weather, pest, locust) for plantation sites."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.alert import Alert
from app.models.plantation_fence import PlantationFence
from app.models.planting_project import PlantingProject
from app.models.user import User
from app.services.alerts.service import dispatch_alert_channels, threat_watch_prefs
from app.services.threats.watch import build_site_threat_watch

log = get_logger("threat_alerts")

RISK_ORDER = {"low": 0, "moderate": 1, "high": 2, "critical": 3}


async def _recent_fence_alert(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    fence_id: uuid.UUID,
    kind: str,
    within_hours: int = 24,
) -> bool:
    since = datetime.now(UTC) - timedelta(hours=within_hours)
    res = await db.execute(
        select(Alert)
        .where(Alert.user_id == user_id, Alert.kind == kind, Alert.created_at >= since)
        .order_by(Alert.created_at.desc())
        .limit(30)
    )
    fid = str(fence_id)
    for alert in res.scalars().all():
        payload = alert.payload or {}
        if payload.get("fence_id") == fid:
            return True
    return False


async def _create_threat_alert(
    db: AsyncSession,
    *,
    user: User,
    kind: str,
    severity: str,
    title: str,
    message: str,
    payload: dict[str, Any],
) -> Alert | None:
    prefs = threat_watch_prefs(user)
    if not prefs.get("enabled", True):
        return None

    fence_id = payload.get("fence_id")
    if fence_id and await _recent_fence_alert(
        db, user_id=user.id, fence_id=uuid.UUID(fence_id), kind=kind
    ):
        return None

    channels = ["in_app"]
    for ch in prefs.get("channels", ["in_app", "email"]):
        if ch in ("email", "sms", "push") and ch not in channels:
            channels.append(ch)

    if severity == "critical" and prefs.get("sms_on_critical", False) and user.phone:
        if "sms" not in channels:
            channels.append("sms")

    alert = Alert(
        user_id=user.id,
        kind=kind,
        severity=severity,
        title=title,
        message=message[:4000],
        channels=channels,
        delivered={},
        payload=payload,
    )
    db.add(alert)
    await db.flush()
    alert.delivered = await dispatch_alert_channels(user, channels, title=title, message=message)
    return alert


async def create_threat_watch_alerts(db: AsyncSession) -> dict[str, Any]:
    """Daily scan: emit alerts for weather, pest, and locust warnings per work area."""
    created = 0
    fences_res = await db.execute(select(PlantationFence))
    fences = list(fences_res.scalars().all())
    project_cache: dict[uuid.UUID, PlantingProject | None] = {}

    for fence in fences:
        owner_res = await db.execute(select(User).where(User.id == fence.owner_user_id))
        owner = owner_res.scalar_one_or_none()
        if owner is None:
            continue

        project = None
        if fence.project_id:
            if fence.project_id not in project_cache:
                pres = await db.execute(
                    select(PlantingProject).where(PlantingProject.id == fence.project_id)
                )
                project_cache[fence.project_id] = pres.scalar_one_or_none()
            project = project_cache.get(fence.project_id)

        try:
            site = await build_site_threat_watch(db, fence=fence, project=project)
        except Exception as exc:
            log.warning("threat_watch.site_failed", fence_id=str(fence.id), error=str(exc))
            continue

        base_payload = {
            "fence_id": str(fence.id),
            "work_area_name": fence.name,
            "project_id": str(fence.project_id) if fence.project_id else None,
            "latitude": site.get("latitude"),
            "longitude": site.get("longitude"),
            "composite_risk": site.get("composite_risk"),
        }

        for wa in site.get("weather_alerts", []):
            if wa.get("severity") not in ("warning", "critical"):
                continue
            kind = f"weather_{wa['kind']}"
            alert = await _create_threat_alert(
                db,
                user=owner,
                kind=kind,
                severity=wa["severity"],
                title=f"{wa['title']} — {fence.name}",
                message=wa["message"],
                payload={**base_payload, "weather_kind": wa["kind"], "date": wa.get("date")},
            )
            if alert:
                created += 1

        composite = site.get("composite_risk", "low")
        if composite in ("high", "critical"):
            alert = await _create_threat_alert(
                db,
                user=owner,
                kind=f"pest_intel_{composite}",
                severity="critical" if composite == "critical" else "warning",
                title=f"Pest & disease risk — {fence.name}",
                message="; ".join(site.get("recommended_actions", [])[:2])[:500],
                payload=base_payload,
            )
            if alert:
                created += 1

        for ew in site.get("early_warnings", []):
            if ew.get("kind") != "locust":
                continue
            alert = await _create_threat_alert(
                db,
                user=owner,
                kind="locust_watch",
                severity=ew.get("severity", "warning"),
                title=f"Locust watch — {fence.name}",
                message=ew["message"],
                payload={
                    **base_payload,
                    "distance_km": ew.get("distance_km"),
                    "corridor": ew.get("corridor"),
                },
            )
            if alert:
                created += 1

    await db.commit()
    log.info("threat_watch.alerts_created", count=created)
    return {"created": created, "fences_scanned": len(fences)}
