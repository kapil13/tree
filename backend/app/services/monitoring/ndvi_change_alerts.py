"""NDVI change detection thresholds and alert emission."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.monitoring.alert_engine import create_monitoring_alert

NDVI_ACUTE_DROP_THRESHOLD = -0.12
NDVI_DEGRADATION_THRESHOLD = -0.15
NDVI_LOSS_ABSOLUTE_THRESHOLD = 0.10
MIN_CONSECUTIVE_LOSS_SCENES = 2


def consecutive_low_ndvi_scenes(ndvi_values: list[float]) -> int:
    """Count trailing scenes with NDVI below the loss threshold."""
    count = 0
    for value in reversed(ndvi_values):
        if value < NDVI_LOSS_ABSOLUTE_THRESHOLD:
            count += 1
        else:
            break
    return count


async def emit_ndvi_change_alerts(
    db: AsyncSession,
    *,
    user: User | None,
    change: float | None,
    current_ndvi: float | None,
    recent_ndvi_values: list[float],
    title_prefix: str,
    payload_base: dict[str, Any],
    dedupe_keys: tuple[str, ...],
) -> int:
    """Evaluate NDVI change rules and create deduplicated monitoring alerts."""
    if user is None or change is None or current_ndvi is None:
        return 0

    created = 0
    low_run = consecutive_low_ndvi_scenes(recent_ndvi_values)
    if low_run >= MIN_CONSECUTIVE_LOSS_SCENES:
        alert = await create_monitoring_alert(
            db,
            user=user,
            kind="canopy_loss_suspected",
            severity="critical",
            title=f"Canopy loss suspected — {title_prefix}",
            message=(
                f"NDVI stayed below {NDVI_LOSS_ABSOLUTE_THRESHOLD:.2f} for {low_run} consecutive "
                f"scenes (current {current_ndvi:.2f}). Inspect for mortality, harvest, fire, or clearing."
            ),
            payload={
                **payload_base,
                "ndvi_mean": current_ndvi,
                "change_vs_baseline": change,
                "consecutive_low_scenes": low_run,
            },
            prefs_key="satellite_health",
            dedupe_hours=168,
            dedupe_keys=dedupe_keys,
        )
        if alert:
            created += 1
        return created

    if change <= NDVI_DEGRADATION_THRESHOLD:
        alert = await create_monitoring_alert(
            db,
            user=user,
            kind="ndvi_degradation",
            severity="high",
            title=f"NDVI drop — {title_prefix}",
            message=(
                f"Vegetation index fell {abs(change):.2f} vs recent baseline "
                f"(current NDVI {current_ndvi:.2f}). Inspect on site or re-geotag."
            ),
            payload={
                **payload_base,
                "ndvi_mean": current_ndvi,
                "change_vs_baseline": change,
            },
            prefs_key="satellite_health",
            dedupe_hours=168,
            dedupe_keys=dedupe_keys,
        )
        if alert:
            created += 1
        return created

    if change <= NDVI_ACUTE_DROP_THRESHOLD:
        alert = await create_monitoring_alert(
            db,
            user=user,
            kind="ndvi_acute_drop",
            severity="warning",
            title=f"Acute NDVI drop — {title_prefix}",
            message=(
                f"Sharp vegetation decline ({change:.2f} vs baseline, NDVI {current_ndvi:.2f}). "
                "Check for storm damage, pest outbreak, or acute stress."
            ),
            payload={
                **payload_base,
                "ndvi_mean": current_ndvi,
                "change_vs_baseline": change,
            },
            prefs_key="satellite_health",
            dedupe_hours=72,
            dedupe_keys=dedupe_keys,
        )
        if alert:
            created += 1
    return created
