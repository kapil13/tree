"""Bioacoustic species identification — composite BirdNET + frog + insect."""

from __future__ import annotations

import hashlib
import random
from datetime import datetime
from typing import Any

from app.core.config import settings
from app.core.logging import get_logger
from app.services.ai.bioacoustic_types import BioacousticAnalysisResult, SpeciesDetection
from app.services.bioacoustic.birdnet_runner import birdnet_available, run_birdnet
from app.services.bioacoustic.frog_runner import frog_classifier_available, run_frog_classifier
from app.services.bioacoustic.insect_runner import insect_classifier_available, run_insect_activity
from app.services.bioacoustic.iucn_catalog import IUCN_CATALOG
from app.services.bioacoustic.merge_detections import merge_species_detections, taxon_breakdown

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


def _run_composite(
    wav_path: str,
    *,
    duration_seconds: float,
    latitude: float | None,
    longitude: float | None,
    recorded_at: datetime | None,
) -> BioacousticAnalysisResult:
    pipelines: list[str] = []
    all_detections: list[SpeciesDetection] = []

    if birdnet_available():
        try:
            bird = run_birdnet(
                wav_path,
                duration_seconds=duration_seconds,
                latitude=latitude,
                longitude=longitude,
                recorded_at=recorded_at,
            )
            all_detections.extend(bird.detections)
            pipelines.append("birdnet")
        except Exception as exc:
            log.exception("composite_birdnet_failed", error=str(exc))

    if settings.bioacoustic_enable_frogs and frog_classifier_available():
        try:
            frogs = run_frog_classifier(wav_path, duration_seconds=duration_seconds)
            all_detections.extend(frogs)
            if frogs:
                pipelines.append("frog-heuristic-v1")
        except Exception as exc:
            log.exception("composite_frog_failed", error=str(exc))

    if settings.bioacoustic_enable_insects and insect_classifier_available():
        try:
            insects = run_insect_activity(wav_path, duration_seconds=duration_seconds)
            all_detections.extend(insects)
            if insects:
                pipelines.append("insect-activity-v1")
        except Exception as exc:
            log.exception("composite_insect_failed", error=str(exc))

    if not all_detections:
        log.warning("composite_no_detections", latitude=latitude, longitude=longitude)
        raise RuntimeError("composite_no_detections")

    merged = merge_species_detections(all_detections)
    breakdown = taxon_breakdown(merged)
    loc = ""
    if latitude is not None and longitude is not None:
        loc = f" near ({latitude:.4f}, {longitude:.4f})"

    taxa_parts = [f"{k}: {v} calls" for k, v in sorted(breakdown.items())]
    summary = (
        f"Composite analysis: {len(merged)} species"
        f" ({', '.join(taxa_parts)}){loc}. "
        f"Duration {duration_seconds:.0f}s."
    )

    return BioacousticAnalysisResult(
        detections=merged,
        summary=summary,
        pipeline="+".join(pipelines) if pipelines else "composite-v1",
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
    """Run composite, BirdNET-only, or stub pipeline."""
    wav_path = preprocessing.get("wav_temp_path") if preprocessing else None
    pipeline = settings.bioacoustic_pipeline

    if pipeline in {"birdnet", "composite"} and wav_path:
        if pipeline == "composite":
            try:
                return _run_composite(
                    wav_path,
                    duration_seconds=duration_seconds,
                    latitude=latitude,
                    longitude=longitude,
                    recorded_at=recorded_at,
                )
            except Exception as exc:
                log.exception("composite_failed", error=str(exc))

        if birdnet_available():
            try:
                result = run_birdnet(
                    wav_path,
                    duration_seconds=duration_seconds,
                    latitude=latitude,
                    longitude=longitude,
                    recorded_at=recorded_at,
                )
                if result.detections:
                    return result
                log.warning("birdnet_zero_detections")
                return result
            except Exception as exc:
                log.exception("birdnet_failed", error=str(exc))
        else:
            log.warning("birdnet_unavailable")

    return _stub_identify(
        audio_bytes,
        duration_seconds=duration_seconds,
        latitude=latitude,
        longitude=longitude,
    )
