"""Bioacoustic species identification — BirdNET with stub fallback."""

from __future__ import annotations

import hashlib
import random
from datetime import datetime
from typing import Any

from app.core.config import settings
from app.core.logging import get_logger
from app.services.ai.bioacoustic_types import BioacousticAnalysisResult, SpeciesDetection
from app.services.bioacoustic.birdnet_runner import birdnet_available, cleanup_wav, run_birdnet
from app.services.bioacoustic.iucn_catalog import IUCN_CATALOG

log = get_logger("bioacoustic.ai")


def _stub_identify(
    audio_bytes: bytes,
    *,
    duration_seconds: float,
    latitude: float | None = None,
    longitude: float | None = None,
) -> BioacousticAnalysisResult:
    seed = int(hashlib.sha256(audio_bytes[: min(len(audio_bytes), 8192)]).hexdigest()[:8], 16)
    rng = random.Random(seed)

    catalog = list(IUCN_CATALOG.values())
    n = rng.randint(3, min(7, len(catalog)))
    chosen = rng.sample(catalog, n)

    detections: list[SpeciesDetection] = []
    remaining_calls = max(8, int(duration_seconds * 0.4))
    for sp in chosen:
        calls = rng.randint(1, max(2, remaining_calls // n))
        remaining_calls -= calls
        detections.append(
            SpeciesDetection(
                scientific_name=sp.scientific_name,
                common_name=sp.common_name,
                taxon_group=sp.taxon_group,
                confidence=round(rng.uniform(0.62, 0.96), 3),
                call_count=calls,
            )
        )

    groups = {d.taxon_group for d in detections}
    loc = ""
    if latitude is not None and longitude is not None:
        loc = f" near ({latitude:.4f}, {longitude:.4f})"

    summary = (
        f"Detected {len(detections)} species across {len(groups)} taxa"
        f" ({', '.join(sorted(groups))}){loc}. "
        f"Recording duration {duration_seconds:.0f}s."
    )

    return BioacousticAnalysisResult(
        detections=detections,
        summary=summary,
        pipeline="stub-bioacoustic-v1",
    )


def identify_species_from_audio(
    audio_bytes: bytes,
    *,
    duration_seconds: float,
    latitude: float | None = None,
    longitude: float | None = None,
    preprocessing: dict[str, Any] | None = None,
    recorded_at: datetime | None = None,
) -> BioacousticAnalysisResult:
    """Run BirdNET when configured, otherwise deterministic stub."""
    if settings.bioacoustic_pipeline == "birdnet" and preprocessing:
        wav_path = preprocessing.get("wav_temp_path")
        if wav_path and birdnet_available():
            try:
                return run_birdnet(
                    wav_path,
                    duration_seconds=duration_seconds,
                    latitude=latitude,
                    longitude=longitude,
                    recorded_at=recorded_at,
                )
            except Exception as exc:
                log.exception("birdnet_failed", error=str(exc))
        else:
            log.warning("birdnet_unavailable", ffmpeg=bool(wav_path))

    return _stub_identify(
        audio_bytes,
        duration_seconds=duration_seconds,
        latitude=latitude,
        longitude=longitude,
    )
