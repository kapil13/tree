"""Time-series biodiversity trends per work area."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bioacoustic_recording import BioacousticRecording
from app.services.bioacoustic.detection_tiers import TIER_ACCEPTED


async def compute_fence_trends(
    db: AsyncSession,
    fence_id: uuid.UUID,
    *,
    limit: int = 24,
) -> dict[str, Any]:
    rows = list(
        (
            await db.execute(
                select(BioacousticRecording)
                .where(
                    BioacousticRecording.plantation_fence_id == fence_id,
                    BioacousticRecording.status == "analyzed",
                )
                .order_by(BioacousticRecording.recorded_at.asc())
                .limit(limit)
            )
        ).scalars().all()
    )

    series: list[dict[str, Any]] = []
    for rec in rows:
        accepted = [
            d for d in (rec.species_detections or []) if d.get("detection_tier") == TIER_ACCEPTED
        ]
        confidence = float(rec.biodiversity_confidence_score or rec.bioacoustic_health_score or 0)
        series.append(
            {
                "recording_id": str(rec.id),
                "recorded_at": rec.recorded_at.isoformat() if rec.recorded_at else None,
                "accepted_species_count": len(accepted),
                "biodiversity_confidence_score": round(confidence, 2),
                "shannon_diversity_index": float(rec.shannon_diversity_index)
                if rec.shannon_diversity_index is not None
                else None,
            }
        )

    if len(series) >= 2:
        first_conf = series[0]["biodiversity_confidence_score"]
        last_conf = series[-1]["biodiversity_confidence_score"]
        conf_trend = "improving" if last_conf > first_conf + 2 else "declining" if last_conf < first_conf - 2 else "stable"
        first_sp = series[0]["accepted_species_count"]
        last_sp = series[-1]["accepted_species_count"]
        species_trend = "improving" if last_sp > first_sp else "declining" if last_sp < first_sp else "stable"
    else:
        conf_trend = "insufficient_data"
        species_trend = "insufficient_data"

    return {
        "fence_id": str(fence_id),
        "recording_count": len(series),
        "confidence_trend": conf_trend,
        "species_trend": species_trend,
        "series": series,
    }
