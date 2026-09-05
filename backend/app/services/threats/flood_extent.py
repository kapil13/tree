"""Sentinel-1 inspired flood extent watch — SAR water signal trend + rain forecast."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.plantation_satellite_record import PlantationSatelliteRecord
from app.services.satellite.sar_service import is_sar_provider_record


def _water_extent_score(metadata: dict[str, Any] | None) -> float:
    if not metadata:
        return 0.0
    sar = metadata.get("sar_analysis") or {}
    signals = [
        float(sar.get("wetland_probability") or 0),
        float(sar.get("ground_moisture_index") or 0),
        float(sar.get("double_bounce_index") or 0),
    ]
    return max(signals) if signals else 0.0


async def _recent_sar_water_scores(
    db: AsyncSession,
    fence_id,
    *,
    limit: int = 8,
) -> list[tuple[datetime, float]]:
    res = await db.execute(
        select(PlantationSatelliteRecord)
        .where(PlantationSatelliteRecord.fence_id == fence_id)
        .order_by(PlantationSatelliteRecord.scene_acquired_at.desc())
        .limit(limit)
    )
    scores: list[tuple[datetime, float]] = []
    for row in res.scalars().all():
        if not is_sar_provider_record(row.provider):
            continue
        score = _water_extent_score(row.raw_metadata)
        if row.scene_acquired_at:
            scores.append((row.scene_acquired_at, score))
    return scores


def assess_flood_extent_signal(
    *,
    current_score: float,
    baseline_score: float,
    rain_mm_48h: float,
) -> dict[str, Any]:
    """Rule-based flood extent risk from SAR water proxy and forecast rain."""
    delta = current_score - baseline_score
    risk = "none"
    severity = "info"

    if current_score >= 0.80 and rain_mm_48h >= 35:
        risk = "critical"
        severity = "critical"
    elif current_score >= 0.70 and (delta >= 0.15 or rain_mm_48h >= 50):
        risk = "high"
        severity = "warning"
    elif current_score >= 0.55 and (delta >= 0.10 or rain_mm_48h >= 35):
        risk = "moderate"
        severity = "warning"
    elif delta >= 0.20:
        risk = "watch"
        severity = "info"

    early_warning = None
    if risk != "none":
        early_warning = {
            "kind": "flood_extent",
            "severity": severity,
            "title": "Flood / standing water extent signal",
            "message": (
                f"SAR water-extent proxy is {current_score:.0%} "
                f"(baseline {baseline_score:.0%}, Δ {delta:+.0%}). "
                f"~{rain_mm_48h:.0f} mm rain forecast in 48h. "
                "Inspect low-lying rows, drainage, and access roads."
            ),
            "source": "sar_extent",
            "water_extent_score": round(current_score, 3),
            "baseline_score": round(baseline_score, 3),
            "delta_score": round(delta, 3),
            "rain_mm_48h": rain_mm_48h,
        }

    return {
        "risk_level": risk,
        "water_extent_score": round(current_score, 3),
        "baseline_score": round(baseline_score, 3),
        "delta_score": round(delta, 3),
        "rain_mm_48h": rain_mm_48h,
        "early_warning": early_warning,
    }


async def assess_fence_flood_extent(
    db: AsyncSession,
    fence_id,
    *,
    rain_mm_48h: float = 0.0,
) -> dict[str, Any]:
    """Assess flood extent risk for a work area from recent SAR records."""
    scores = await _recent_sar_water_scores(db, fence_id)
    if not scores:
        if rain_mm_48h >= 75:
            return {
                "risk_level": "watch",
                "water_extent_score": 0.0,
                "baseline_score": 0.0,
                "delta_score": 0.0,
                "rain_mm_48h": rain_mm_48h,
                "early_warning": {
                    "kind": "flood_extent",
                    "severity": "warning",
                    "title": "Flood watch — heavy rain without SAR baseline",
                    "message": (
                        f"~{rain_mm_48h:.0f} mm rain forecast in 48h but no recent SAR extent baseline. "
                        "Check pit drainage and low-lying plantation blocks."
                    ),
                    "source": "weather_only",
                    "rain_mm_48h": rain_mm_48h,
                },
            }
        return {
            "risk_level": "none",
            "water_extent_score": 0.0,
            "baseline_score": 0.0,
            "delta_score": 0.0,
            "rain_mm_48h": rain_mm_48h,
            "early_warning": None,
        }

    current_score = scores[0][1]
    cutoff = datetime.now(UTC) - timedelta(days=settings.hazard_flood_sar_baseline_days)
    baseline_vals = [s for ts, s in scores[1:] if ts >= cutoff]
    baseline_score = sum(baseline_vals) / len(baseline_vals) if baseline_vals else scores[-1][1]

    return assess_flood_extent_signal(
        current_score=current_score,
        baseline_score=baseline_score,
        rain_mm_48h=rain_mm_48h,
    )
