"""Monitoring periods for temporal biodiversity comparison."""

from __future__ import annotations

import uuid
from datetime import datetime
from statistics import mean
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bioacoustic_monitoring_period import BioacousticMonitoringPeriod
from app.models.bioacoustic_recording import BioacousticRecording
from app.services.bioacoustic.detection_tiers import TIER_ACCEPTED

_COMPATIBLE_SEASONS = {
    ("monsoon", "wet"),
    ("wet", "monsoon"),
    ("dry", "summer"),
    ("summer", "dry"),
    ("spring", "autumn"),
    ("autumn", "spring"),
}


def seasons_compatible(a: str, b: str) -> bool:
    if a == b:
        return True
    if a == "unspecified" or b == "unspecified":
        return True
    return (a, b) in _COMPATIBLE_SEASONS or (b, a) in _COMPATIBLE_SEASONS


def duration_compatible(durations: list[float], tolerance_ratio: float = 0.35) -> bool:
    if len(durations) < 2:
        return True
    avg = mean(durations)
    if avg <= 0:
        return False
    return all(abs(d - avg) / avg <= tolerance_ratio for d in durations)


def _accepted_species(recording: BioacousticRecording) -> set[str]:
    names: set[str] = set()
    for det in recording.species_detections or []:
        if det.get("detection_tier") == TIER_ACCEPTED:
            name = det.get("scientific_name")
            if name:
                names.add(name)
    return names


def _period_metrics(recordings: list[BioacousticRecording]) -> dict[str, Any]:
    analyzed = [r for r in recordings if r.status == "analyzed"]
    species: set[str] = set()
    for rec in analyzed:
        species |= _accepted_species(rec)
    confidences = [
        float(r.biodiversity_confidence_score or r.bioacoustic_health_score or 0) for r in analyzed
    ]
    durations = [float(r.duration_seconds) for r in recordings]
    return {
        "recording_count": len(recordings),
        "analyzed_count": len(analyzed),
        "accepted_species_count": len(species),
        "avg_confidence_score": round(mean(confidences), 2) if confidences else 0.0,
        "avg_duration_seconds": round(mean(durations), 1) if durations else 0.0,
        "species_list": sorted(species),
    }


async def create_monitoring_period(
    db: AsyncSession,
    *,
    fence_id: uuid.UUID,
    label: str,
    period_start: datetime,
    period_end: datetime,
    season_class: str = "unspecified",
    metadata: dict[str, Any] | None = None,
) -> BioacousticMonitoringPeriod:
    if period_end < period_start:
        raise ValueError("invalid_period_range")
    period = BioacousticMonitoringPeriod(
        fence_id=fence_id,
        label=label,
        period_start=period_start,
        period_end=period_end,
        season_class=season_class,
        metadata_=metadata or {},
    )
    db.add(period)
    await db.flush()
    return period


async def list_monitoring_periods(
    db: AsyncSession,
    fence_id: uuid.UUID,
) -> list[BioacousticMonitoringPeriod]:
    rows = (
        await db.execute(
            select(BioacousticMonitoringPeriod)
            .where(BioacousticMonitoringPeriod.fence_id == fence_id)
            .order_by(BioacousticMonitoringPeriod.period_start.desc())
        )
    ).scalars().all()
    return list(rows)


async def compare_monitoring_periods(
    db: AsyncSession,
    period_a: BioacousticMonitoringPeriod,
    period_b: BioacousticMonitoringPeriod,
) -> dict[str, Any]:
    if period_a.fence_id != period_b.fence_id:
        raise ValueError("fence_mismatch")

    recs_a = list(period_a.recordings or [])
    recs_b = list(period_b.recordings or [])
    metrics_a = _period_metrics(recs_a)
    metrics_b = _period_metrics(recs_b)

    species_a = set(metrics_a["species_list"])
    species_b = set(metrics_b["species_list"])
    gained = sorted(species_b - species_a)
    lost = sorted(species_a - species_b)
    retained = sorted(species_a & species_b)

    durations = [float(r.duration_seconds) for r in recs_a + recs_b]
    compatibility = {
        "same_site": True,
        "season_compatible": seasons_compatible(period_a.season_class, period_b.season_class),
        "duration_compatible": duration_compatible(durations),
        "period_a_season": period_a.season_class,
        "period_b_season": period_b.season_class,
    }
    comparable = all(compatibility.values()) and metrics_a["analyzed_count"] >= 1 and metrics_b["analyzed_count"] >= 1

    return {
        "period_a_id": str(period_a.id),
        "period_b_id": str(period_b.id),
        "fence_id": str(period_a.fence_id),
        "comparable": comparable,
        "compatibility": compatibility,
        "period_a": {"label": period_a.label, **metrics_a},
        "period_b": {"label": period_b.label, **metrics_b},
        "species_gained": gained,
        "species_lost": lost,
        "species_retained": retained,
        "confidence_delta": round(metrics_b["avg_confidence_score"] - metrics_a["avg_confidence_score"], 2),
    }
