"""Fence-level bioacoustic aggregates and NDVI correlation (Phase 3)."""

from __future__ import annotations

import uuid
from statistics import mean

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bioacoustic_recording import BioacousticRecording
from app.models.plantation_fence import PlantationFence
from app.models.plantation_satellite_record import PlantationSatelliteRecord
from app.models.satellite_health_analysis import SatelliteHealthAnalysis

_THREATENED = {"Critically Endangered", "Endangered", "Vulnerable"}


def _interpret_ecosystem(
    *,
    bio_health: float | None,
    ndvi_mean: float | None,
    ndvi_trend: str | None,
    insect_calls: int,
    frog_calls: int,
    pest_flag: bool,
) -> str:
    parts: list[str] = []
    if bio_health is not None:
        if bio_health >= 70:
            parts.append("Strong acoustic biodiversity")
        elif bio_health >= 45:
            parts.append("Moderate acoustic biodiversity")
        else:
            parts.append("Low acoustic biodiversity — consider habitat restoration")

    if ndvi_mean is not None:
        if ndvi_mean >= 0.55:
            parts.append(f"vegetation vigour is healthy (NDVI {ndvi_mean:.2f})")
        elif ndvi_mean >= 0.35:
            parts.append(f"vegetation is moderate (NDVI {ndvi_mean:.2f})")
        else:
            parts.append(f"vegetation stress detected (NDVI {ndvi_mean:.2f})")

    if ndvi_trend == "declining":
        parts.append("NDVI trend is declining")
    elif ndvi_trend == "improving":
        parts.append("NDVI trend is improving")

    if insect_calls == 0 and frog_calls == 0:
        parts.append("no amphibian/insect activity detected — possible monoculture or dry season")
    elif frog_calls > 0 and insect_calls > 0:
        parts.append("balanced frog and insect soundscape")

    if pest_flag and insect_calls < 5:
        parts.append("satellite suggests pest pressure but insect calls are low — verify in field")

    return ". ".join(parts) + "." if parts else "Insufficient data for ecosystem interpretation."


async def aggregate_fence_bioacoustic(
    db: AsyncSession, fence_id: uuid.UUID
) -> dict:
    res = await db.execute(
        select(BioacousticRecording)
        .where(
            BioacousticRecording.plantation_fence_id == fence_id,
            BioacousticRecording.status == "analyzed",
        )
        .order_by(BioacousticRecording.recorded_at.desc())
    )
    rows = list(res.scalars().all())
    if not rows:
        return {
            "recording_count": 0,
            "avg_health_score": 0.0,
            "avg_shannon_index": 0.0,
            "avg_simpson_index": 0.0,
            "total_species_detected": 0,
            "threatened_species_count": 0,
            "taxon_breakdown": {},
            "species_list": [],
        }

    species_set: set[str] = set()
    threatened = 0
    taxon_calls: dict[str, int] = {}
    species_list: list[dict] = []

    for rec in rows:
        for det in rec.species_detections or []:
            name = det.get("scientific_name", "")
            if name:
                species_set.add(name)
            if det.get("iucn_status") in _THREATENED:
                threatened += 1
            tg = det.get("taxon_group", "unknown")
            taxon_calls[tg] = taxon_calls.get(tg, 0) + int(det.get("call_count") or 0)

    health = [float(r.bioacoustic_health_score or 0) for r in rows]
    shannon = [float(r.shannon_diversity_index or 0) for r in rows]
    simpson = [float(r.simpson_diversity_index or 0) for r in rows]

    # Top species across fence
    species_counts: dict[str, dict] = {}
    for rec in rows:
        for det in rec.species_detections or []:
            key = det.get("scientific_name", "")
            if not key:
                continue
            if key not in species_counts:
                species_counts[key] = {
                    "scientific_name": key,
                    "common_name": det.get("common_name", key),
                    "taxon_group": det.get("taxon_group", ""),
                    "call_count": 0,
                    "iucn_status": det.get("iucn_status", ""),
                }
            species_counts[key]["call_count"] += int(det.get("call_count") or 0)

    species_list = sorted(species_counts.values(), key=lambda x: x["call_count"], reverse=True)[:20]

    return {
        "recording_count": len(rows),
        "avg_health_score": round(mean(health), 2) if health else 0.0,
        "avg_shannon_index": round(mean(shannon), 4) if shannon else 0.0,
        "avg_simpson_index": round(mean(simpson), 4) if simpson else 0.0,
        "total_species_detected": len(species_set),
        "threatened_species_count": threatened,
        "taxon_breakdown": taxon_calls,
        "species_list": species_list,
    }


async def correlate_fence_ecosystem(
    db: AsyncSession, fence: PlantationFence
) -> dict:
    bio = await aggregate_fence_bioacoustic(db, fence.id)

    ndvi_res = await db.execute(
        select(PlantationSatelliteRecord)
        .where(PlantationSatelliteRecord.fence_id == fence.id)
        .order_by(PlantationSatelliteRecord.scene_acquired_at.desc())
        .limit(12)
    )
    ndvi_rows = list(ndvi_res.scalars().all())
    ndvi_mean = float(ndvi_rows[0].ndvi_mean) if ndvi_rows and ndvi_rows[0].ndvi_mean else None
    ndvi_series = [float(r.ndvi_mean) for r in reversed(ndvi_rows) if r.ndvi_mean is not None]

    sat_res = await db.execute(
        select(SatelliteHealthAnalysis)
        .where(SatelliteHealthAnalysis.fence_id == fence.id)
        .order_by(SatelliteHealthAnalysis.created_at.desc())
        .limit(1)
    )
    sat = sat_res.scalar_one_or_none()

    ndvi_trend = sat.ndvi_trend if sat else None
    if not ndvi_trend and len(ndvi_series) >= 3:
        slope = (ndvi_series[-1] - ndvi_series[0]) / max(len(ndvi_series) - 1, 1)
        if slope > 0.02:
            ndvi_trend = "improving"
        elif slope < -0.02:
            ndvi_trend = "declining"
        else:
            ndvi_trend = "stable"

    correlation_score: float | None = None
    if len(ndvi_series) >= 3 and bio["recording_count"] >= 2:
        bio_scores = [
            float(r.bioacoustic_health_score or 0)
            for r in (
                await db.execute(
                    select(BioacousticRecording)
                    .where(
                        BioacousticRecording.plantation_fence_id == fence.id,
                        BioacousticRecording.status == "analyzed",
                    )
                    .order_by(BioacousticRecording.recorded_at.asc())
                    .limit(len(ndvi_series))
                )
            ).scalars().all()
        ]
        if len(bio_scores) >= 2 and len(ndvi_series) >= 2:
            n = min(len(bio_scores), len(ndvi_series))
            bx = bio_scores[-n:]
            nx = ndvi_series[-n:]
            mx, my = mean(bx), mean(nx)
            num = sum((bx[i] - mx) * (nx[i] - my) for i in range(n))
            den = (sum((bx[i] - mx) ** 2 for i in range(n)) * sum((nx[i] - my) ** 2 for i in range(n))) ** 0.5
            correlation_score = round(num / den, 3) if den else None

    taxon = bio.get("taxon_breakdown") or {}
    interpretation = _interpret_ecosystem(
        bio_health=bio.get("avg_health_score"),
        ndvi_mean=ndvi_mean,
        ndvi_trend=ndvi_trend,
        insect_calls=int(taxon.get("insect", 0)),
        frog_calls=int(taxon.get("frog", 0)),
        pest_flag=bool(sat.pest_control_needed) if sat else False,
    )

    ecosystem_score = 0.0
    if bio.get("avg_health_score"):
        ecosystem_score += 0.5 * float(bio["avg_health_score"])
    if ndvi_mean is not None:
        ecosystem_score += 0.5 * min(ndvi_mean / 0.7, 1.0) * 100

    return {
        "fence_id": str(fence.id),
        "fence_name": fence.name,
        "area_ha": float(fence.area_ha) if fence.area_ha else None,
        "bioacoustic": bio,
        "ndvi_mean": ndvi_mean,
        "ndvi_trend": ndvi_trend,
        "ndvi_series": [
            {"date": r.scene_acquired_at.isoformat(), "ndvi": float(r.ndvi_mean)}
            for r in reversed(ndvi_rows)
            if r.ndvi_mean is not None
        ],
        "satellite_health": {
            "risk_level": sat.risk_level if sat else None,
            "health_status": sat.health_status if sat else None,
            "summary": sat.summary if sat else None,
            "pest_control_needed": sat.pest_control_needed if sat else False,
        },
        "correlation_score": correlation_score,
        "ecosystem_health_score": round(ecosystem_score, 2),
        "interpretation": interpretation,
    }
