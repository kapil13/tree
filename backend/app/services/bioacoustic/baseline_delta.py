"""Baseline (GBIF snapshot) vs detected species delta."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bioacoustic_recording import BioacousticRecording
from app.models.work_area_biodiversity_snapshot import WorkAreaBiodiversitySnapshot
from app.services.bioacoustic.detection_tiers import TIER_ACCEPTED


def _normalize_species_name(name: str) -> str:
    return name.split("(")[0].strip().lower()


async def compute_baseline_delta(
    db: AsyncSession,
    fence_id: uuid.UUID,
) -> dict[str, Any]:
    snapshot = (
        await db.execute(
            select(WorkAreaBiodiversitySnapshot)
            .where(WorkAreaBiodiversitySnapshot.fence_id == fence_id)
            .order_by(WorkAreaBiodiversitySnapshot.captured_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    recordings = list(
        (
            await db.execute(
                select(BioacousticRecording).where(
                    BioacousticRecording.plantation_fence_id == fence_id,
                    BioacousticRecording.status == "analyzed",
                )
            )
        ).scalars().all()
    )

    baseline_names: set[str] = set()
    if snapshot:
        for sp in snapshot.species or []:
            name = sp.get("scientific_name") or sp.get("name")
            if name:
                baseline_names.add(_normalize_species_name(str(name)))

    detected_names: set[str] = set()
    for rec in recordings:
        for det in rec.species_detections or []:
            if det.get("detection_tier") != TIER_ACCEPTED:
                continue
            name = det.get("scientific_name")
            if name:
                detected_names.add(_normalize_species_name(str(name)))

    novel = sorted(detected_names - baseline_names)
    not_yet_detected = sorted(baseline_names - detected_names)
    confirmed_overlap = sorted(baseline_names & detected_names)

    return {
        "fence_id": str(fence_id),
        "snapshot_id": str(snapshot.id) if snapshot else None,
        "snapshot_captured_at": snapshot.captured_at.isoformat() if snapshot else None,
        "baseline_species_count": len(baseline_names),
        "detected_accepted_count": len(detected_names),
        "confirmed_overlap": confirmed_overlap,
        "novel_detections": novel,
        "baseline_not_yet_detected": not_yet_detected,
        "overlap_pct": round(len(confirmed_overlap) / max(len(baseline_names), 1) * 100, 1),
    }
