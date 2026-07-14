"""Bioacoustic AI result types."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class SpeciesDetection:
    scientific_name: str
    common_name: str
    taxon_group: str
    confidence: float
    call_count: int


@dataclass
class BioacousticAnalysisResult:
    detections: list[SpeciesDetection] = field(default_factory=list)
    preprocessing: dict = field(default_factory=dict)
    spectrogram_s3_key: str | None = None
    pipeline: str = "stub-bioacoustic-v1"
    summary: str = ""
