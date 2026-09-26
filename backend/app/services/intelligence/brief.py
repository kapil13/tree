"""Executive intelligence brief — fast cached summary for dashboards."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.models.alert import Alert
from app.services.cache.redis_cache import cache_delete, cache_get, cache_set
from app.services.intelligence.brief_llm import enrich_executive_brief_llm
from app.services.intelligence.summary import build_intelligence_summary

log = get_logger("intelligence.brief")


def _brief_cache_key(user_id: uuid.UUID) -> str:
    return f"intel:brief:{user_id}"


def _summary_cache_key(user_id: uuid.UUID) -> str:
    return f"intel:summary:{user_id}"


def build_executive_brief_rules(
    *,
    summary: dict[str, Any],
    alerts: list[Alert],
) -> dict[str, Any]:
    """Derive human-readable brief lines from intelligence summary + recent alerts."""
    lines: list[str] = []
    kpi_trees = summary.get("tree_count") or summary.get("total_trees") or 0
    highest_risk = summary.get("highest_risk", "low")
    weather_count = int(summary.get("weather_alert_count") or 0)
    pest_high = int(summary.get("pest_high_count") or 0)
    pest_hotspots = summary.get("pest_hotspots") or []
    biodiversity = summary.get("biodiversity") or {}
    species = int(biodiversity.get("unique_species_in_latest_snapshots") or 0)

    urgent_alerts = [
        a
        for a in alerts
        if not a.is_read and a.severity in ("critical", "high", "moderate", "warning")
    ]
    inspection_zones = len(
        [s for s in summary.get("threat_sites", []) if s.get("composite_risk") in ("high", "critical")]
    )

    if inspection_zones > 0:
        lines.append(
            f"{inspection_zones} work area{'s' if inspection_zones != 1 else ''} "
            "need inspection based on threat signals."
        )
    elif urgent_alerts:
        lines.append(
            f"{len(urgent_alerts)} unread alert{'s' if len(urgent_alerts) != 1 else ''} "
            "require supervisor attention."
        )
    elif highest_risk in ("high", "critical"):
        lines.append(f"Portfolio composite risk is {highest_risk} — review threat watch.")
    elif kpi_trees == 0:
        lines.append("No trees registered yet — add plantations to begin monitoring.")
    else:
        lines.append("Monitored zones are within expected parameters.")

    if weather_count > 0:
        lines.append(
            f"{weather_count} weather alert{'s' if weather_count != 1 else ''} "
            "across your work areas in the next 48 hours."
        )
    elif pest_high > 0:
        lines.append(f"{pest_high} site{'s' if pest_high != 1 else ''} flagged for elevated pest risk.")

    if species > 0:
        lines.append(
            f"Biodiversity snapshots cover {species} unique species across recent surveys."
        )
    elif kpi_trees > 0 and species == 0:
        lines.append("Run bioacoustic surveys to enrich biodiversity intelligence.")

    priority_alert: dict[str, Any] | None = None
    for alert in alerts:
        if alert.is_read or alert.severity not in ("critical", "high"):
            continue
        payload = alert.payload or {}
        priority_alert = {
            "title": alert.title,
            "severity": alert.severity,
            "kind": getattr(alert, "kind", None),
            "work_area_name": payload.get("fence_name")
            or payload.get("work_area_name")
            or payload.get("zone")
            or "Site",
            "alert_id": str(alert.id),
        }
        break

    if not priority_alert and pest_hotspots:
        hot = pest_hotspots[0]
        priority_alert = {
            "title": f"Pest risk — {hot.get('work_area_name', 'Work area')}",
            "severity": hot.get("composite_risk", "moderate"),
            "kind": "pest_hotspot",
            "work_area_name": hot.get("work_area_name", "Site"),
            "alert_id": None,
        }

    headline = lines[0] if lines else "Portfolio intelligence brief"
    metrics = {
        "highest_risk": highest_risk,
        "weather_alert_count": weather_count,
        "pest_high_count": pest_high,
        "tree_count": kpi_trees,
        "unread_alerts": len([a for a in alerts if not a.is_read]),
    }

    return {
        "headline": headline,
        "lines": lines[:3],
        "priority_alert": priority_alert,
        "metrics": metrics,
    }


async def build_executive_brief(
    db: AsyncSession,
    user,
    *,
    llm: bool = False,
    refresh: bool = False,
) -> dict[str, Any]:
    """Build or return cached executive brief for a user."""
    cache_key = _brief_cache_key(user.id)
    if not refresh:
        cached = await cache_get(cache_key)
        if cached:
            cached["cache_hit"] = True
            return cached

    summary_key = _summary_cache_key(user.id)
    summary: dict[str, Any] | None = None
    if not refresh:
        summary = await cache_get(summary_key)

    if summary is None:
        summary = await build_intelligence_summary(db, user, site_limit=8, fast=True)
        await cache_set(summary_key, summary, ttl_seconds=settings.intelligence_cache_ttl_seconds)

    alert_rows = (
        await db.execute(
            select(Alert)
            .where(Alert.user_id == user.id)
            .order_by(Alert.created_at.desc())
            .limit(30)
        )
    ).scalars().all()

    rules = build_executive_brief_rules(summary=summary, alerts=list(alert_rows))
    llm_enriched = False
    narrative: str | None = None

    if llm and settings.openai_api_key:
        narrative = await enrich_executive_brief_llm(summary=summary, rules=rules)
        if narrative:
            llm_enriched = True
            rules["lines"] = [narrative, *rules["lines"][:2]]

    result = {
        "generated_at": datetime.now(UTC).isoformat(),
        "cache_hit": False,
        "headline": rules["headline"],
        "lines": rules["lines"],
        "priority_alert": rules["priority_alert"],
        "metrics": rules["metrics"],
        "llm_enriched": llm_enriched,
        "highest_risk": summary.get("highest_risk", "low"),
    }
    await cache_set(cache_key, result, ttl_seconds=settings.intelligence_cache_ttl_seconds)
    return result


async def invalidate_user_intelligence_cache(user_id: uuid.UUID) -> None:
    await cache_delete(_brief_cache_key(user_id))
    await cache_delete(_summary_cache_key(user_id))
