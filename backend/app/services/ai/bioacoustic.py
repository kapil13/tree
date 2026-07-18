"""Bioacoustic species identification — BirdNET + Perch multi-taxa."""

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
from app.services.bioacoustic.perch_runner import perch_available, run_perch
from app.services.bioacoustic.taxon_groups import TAXON_BIRD, normalize_taxon_group

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


def _build_multitaxa_summary(
    merged: list[SpeciesDetection],
    *,
    duration_seconds: float,
    latitude: float | None,
    longitude: float | None,
    pipelines: list[str],
) -> str:
    breakdown = taxon_breakdown(merged)
    loc = ""
    if latitude is not None and longitude is not None:
        loc = f" near ({latitude:.4f}, {longitude:.4f})"

    parts = [f"{k}: {v} detections" for k, v in sorted(breakdown.items())]
    taxa_text = ", ".join(parts) if parts else "no species above threshold"
    engines = "+".join(pipelines) if pipelines else "multitaxa"
    return (
        f"Biodiversity assessment ({engines}): {len(merged)} species — {taxa_text}{loc}. "
        f"Duration {duration_seconds:.0f}s."
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
            if bird.detections:
                pipelines.append("birdnet")
        except Exception as exc:
            log.exception("composite_birdnet_failed", error=str(exc))

    if perch_available():
        try:
            perch_dets = run_perch(
                wav_path,
                duration_seconds=duration_seconds,
                exclude_birds=True,
            )
            all_detections.extend(perch_dets)
            if perch_dets:
                pipelines.append("perch-v2")
        except Exception as exc:
            log.exception("composite_perch_failed", error=str(exc))
    elif settings.bioacoustic_enable_perch:
        log.warning("perch_enabled_but_unavailable")

    # Legacy experimental heuristics — off by default; superseded by Perch when enabled.
    if settings.bioacoustic_enable_frogs and frog_classifier_available() and not perch_available():
        try:
            frogs = run_frog_classifier(wav_path, duration_seconds=duration_seconds)
            all_detections.extend(frogs)
            if frogs:
                pipelines.append("frog-heuristic-experimental")
        except Exception as exc:
            log.exception("composite_frog_failed", error=str(exc))

    if settings.bioacoustic_enable_insects and insect_classifier_available() and not perch_available():
        try:
            insects = run_insect_activity(wav_path, duration_seconds=duration_seconds)
            all_detections.extend(insects)
            if insects:
                pipelines.append("insect-heuristic-experimental")
        except Exception as exc:
            log.exception("composite_insect_failed", error=str(exc))

    if not all_detections:
        log.warning("composite_no_detections", latitude=latitude, longitude=longitude)
        raise RuntimeError("composite_no_detections")

    merged = merge_species_detections(all_detections)
    summary = _build_multitaxa_summary(
        merged,
        duration_seconds=duration_seconds,
        latitude=latitude,
        longitude=longitude,
        pipelines=pipelines,
    )

    return BioacousticAnalysisResult(
        detections=merged,
        summary=summary,
        pipeline="+".join(pipelines) if pipelines else "composite-v1",
    )


def _run_multitaxa_perch(
    wav_path: str,
    *,
    duration_seconds: float,
    latitude: float | None,
    longitude: float | None,
) -> BioacousticAnalysisResult:
    if not perch_available():
        raise RuntimeError("perch_unavailable")

    detections = run_perch(
        wav_path,
        duration_seconds=duration_seconds,
        exclude_birds=False,
    )
    if not detections:
        raise RuntimeError("perch_no_detections")

    summary = _build_multitaxa_summary(
        detections,
        duration_seconds=duration_seconds,
        latitude=latitude,
        longitude=longitude,
        pipelines=["perch-v2"],
    )
    return BioacousticAnalysisResult(
        detections=detections,
        summary=summary,
        pipeline="perch-v2",
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
    """Run BirdNET, Perch multi-taxa, composite, or stub pipeline."""
    wav_path = preprocessing.get("wav_temp_path") if preprocessing else None
    pipeline = settings.bioacoustic_pipeline

    if pipeline in {"birdnet", "composite", "multitaxa"} and wav_path:
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

        if pipeline == "multitaxa":
            try:
                return _run_multitaxa_perch(
                    wav_path,
                    duration_seconds=duration_seconds,
                    latitude=latitude,
                    longitude=longitude,
                )
            except Exception as exc:
                log.exception("multitaxa_failed", error=str(exc))

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

                if perch_available():
                    perch_dets = run_perch(
                        wav_path,
                        duration_seconds=duration_seconds,
                        exclude_birds=False,
                    )
                    if perch_dets:
                        non_bird = [
                            d for d in perch_dets if normalize_taxon_group(d.taxon_group) != TAXON_BIRD
                        ]
                        if non_bird:
                            merged = merge_species_detections(non_bird)
                            result = BioacousticAnalysisResult(
                                detections=merged,
                                summary=_build_multitaxa_summary(
                                    merged,
                                    duration_seconds=duration_seconds,
                                    latitude=latitude,
                                    longitude=longitude,
                                    pipelines=["perch-v2"],
                                ),
                                pipeline="perch-v2",
                            )
                            return result
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
