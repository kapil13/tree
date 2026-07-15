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


def run_birdnet(
    wav_path: str,
    *,
    duration_seconds: float,
    latitude: float | None,
    longitude: float | None,
    recorded_at: datetime | None = None,
) -> BioacousticAnalysisResult:
    from birdnetlib import Recording
    from birdnetlib.analyzer import Analyzer

    lat = latitude if latitude is not None else 0.0
    lon = longitude if longitude is not None else 0.0
    when = recorded_at or datetime.now(UTC)
    analyzer = Analyzer()
    recording = Recording(
        analyzer,
        wav_path,
        lat=lat,
        lon=lon,
        date=when,
        min_conf=settings.bioacoustic_min_confidence,
    )
    recording.analyze()

    grouped: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"common_name": "", "confidence_sum": 0.0, "call_count": 0}
    )
    for det in recording.detections:
        sci = det.get("scientific_name") or "Unknown"
        grouped[sci]["common_name"] = det.get("common_name") or sci
        grouped[sci]["confidence_sum"] += float(det.get("confidence") or 0)
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

    loc = ""
    if latitude is not None and longitude is not None:
        loc = f" near ({latitude:.4f}, {longitude:.4f})"

    summary = (
        f"BirdNET detected {len(detections)} bird species"
        f" ({sum(d.call_count for d in detections)} calls){loc}. "
        f"Recording duration {duration_seconds:.0f}s."
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
