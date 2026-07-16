"""BirdNET species identification via birdnetlib."""

from __future__ import annotations

import os
from collections import defaultdict
from datetime import UTC, datetime
from typing import Any

from app.core.config import settings
from app.core.logging import get_logger
from app.services.ai.bioacoustic_types import BioacousticAnalysisResult, SpeciesDetection

log = get_logger("bioacoustic.birdnet")


def _det_get(det: Any, key: str, default: Any = None) -> Any:
    if isinstance(det, dict):
        return det.get(key, default)
    return getattr(det, key, default)


def _select_location_detections(raw: list[Any], *, return_all: bool) -> list[Any]:
    """Prefer species predicted for location/date; keep all if geo filter is too strict."""
    if not raw:
        return []
    if not return_all:
        return raw
    predicted = [d for d in raw if _det_get(d, "is_predicted_for_location_and_date") is True]
    return predicted if predicted else raw


def _group_species(raw: list[Any]) -> list[SpeciesDetection]:
    grouped: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"common_name": "", "confidence_sum": 0.0, "call_count": 0}
    )
    for det in raw:
        sci = _det_get(det, "scientific_name") or "Unknown"
        grouped[sci]["common_name"] = _det_get(det, "common_name") or sci
        grouped[sci]["confidence_sum"] += float(_det_get(det, "confidence") or 0)
        grouped[sci]["call_count"] += 1

    detections: list[SpeciesDetection] = []
    for sci, row in grouped.items():
        calls = int(row["call_count"])
        avg_conf = row["confidence_sum"] / calls if calls else 0.0
        detections.append(
            SpeciesDetection(
                scientific_name=sci,
                common_name=row["common_name"],
                taxon_group="bird",
                confidence=round(avg_conf, 4),
                call_count=calls,
            )
        )
    detections.sort(key=lambda d: d.call_count, reverse=True)
    return detections


def _analyze_pass(
    analyzer: Any,
    wav_path: str,
    *,
    min_conf: float,
    latitude: float | None,
    longitude: float | None,
    recorded_at: datetime | None,
    return_all_detections: bool,
    use_location: bool,
) -> list[Any]:
    kwargs: dict[str, Any] = {"min_conf": min_conf}
    if use_location and latitude is not None and longitude is not None:
        kwargs["lat"] = latitude
        kwargs["lon"] = longitude
        kwargs["date"] = recorded_at or datetime.now(UTC)
        kwargs["return_all_detections"] = return_all_detections

    from birdnetlib import Recording

    recording = Recording(analyzer, wav_path, **kwargs)
    recording.analyze()
    return list(recording.detections or [])


def run_birdnet(
    wav_path: str,
    *,
    duration_seconds: float,
    latitude: float | None,
    longitude: float | None,
    recorded_at: datetime | None = None,
) -> BioacousticAnalysisResult:
    from birdnetlib.analyzer import Analyzer

    analyzer = Analyzer()
    min_conf = settings.bioacoustic_min_confidence
    return_all = settings.bioacoustic_return_all_detections
    has_location = latitude is not None and longitude is not None

    passes: list[tuple[str, list[Any]]] = []

    if has_location:
        raw = _analyze_pass(
            analyzer,
            wav_path,
            min_conf=min_conf,
            latitude=latitude,
            longitude=longitude,
            recorded_at=recorded_at,
            return_all_detections=return_all,
            use_location=True,
        )
        selected = _select_location_detections(raw, return_all=return_all)
        passes.append(("location_filtered", selected))
        log.info(
            "birdnet_pass",
            pass_name="location_filtered",
            raw=len(raw),
            selected=len(selected),
            min_conf=min_conf,
            return_all=return_all,
        )

    if not any(p[1] for p in passes):
        raw = _analyze_pass(
            analyzer,
            wav_path,
            min_conf=min_conf,
            latitude=None,
            longitude=None,
            recorded_at=None,
            return_all_detections=False,
            use_location=False,
        )
        passes.append(("global", raw))
        log.info("birdnet_pass", pass_name="global", raw=len(raw), min_conf=min_conf)

    selected = next((p[1] for p in passes if p[1]), [])

    if not selected and min_conf > 0.1:
        raw = _analyze_pass(
            analyzer,
            wav_path,
            min_conf=0.1,
            latitude=None,
            longitude=None,
            recorded_at=None,
            return_all_detections=False,
            use_location=False,
        )
        passes.append(("global_low_conf", raw))
        selected = raw
        log.info("birdnet_pass", pass_name="global_low_conf", raw=len(raw), min_conf=0.1)

    detections = _group_species(selected)

    loc = ""
    if has_location:
        loc = f" near ({latitude:.4f}, {longitude:.4f})"

    if detections:
        summary = (
            f"BirdNET detected {len(detections)} bird species"
            f" ({sum(d.call_count for d in detections)} calls){loc}. "
            f"Recording duration {duration_seconds:.0f}s."
        )
    else:
        summary = (
            f"BirdNET analyzed the recording{loc} but no bird vocalizations met the "
            f"confidence threshold ({min_conf:.0%}). "
            f"Try recording 60+ seconds outdoors during active bird hours."
        )

    return BioacousticAnalysisResult(
        detections=detections,
        summary=summary,
        pipeline="birdnet-analyzer-v1",
    )


def birdnet_available() -> bool:
    try:
        import birdnetlib  # noqa: F401

        return shutil_which("ffmpeg")
    except ImportError:
        return False


def shutil_which(cmd: str) -> bool:
    from shutil import which

    return which(cmd) is not None


def cleanup_wav(preprocessing: dict[str, Any]) -> None:
    wav_path = preprocessing.get("wav_temp_path")
    if wav_path and os.path.exists(wav_path):
        os.unlink(wav_path)
