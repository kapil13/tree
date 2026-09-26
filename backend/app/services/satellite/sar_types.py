"""SAR / NISAR observation types (L-band + S-band polarimetry)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class SarSample:
    """Dual-frequency SAR sample inspired by NISAR L/S-band science."""

    provider: str
    scene_id: str
    scene_acquired_at: datetime
    l_band_hh_db: float
    s_band_hh_db: float
    vh_hv_ratio: float | None = None
    double_bounce_index: float = 0.0
    wetland_probability: float = 0.0
    ground_moisture_index: float = 0.0
    canopy_ground_mismatch: bool = False
    frequency_bands: list[str] = field(default_factory=lambda: ["L", "S"])
    polarimetric_composite: dict[str, float] | None = None
    coherence: float | None = None
    pipeline: str = "byot-sar-1.0.0"

    def to_raw_metadata(self) -> dict[str, Any]:
        return {
            "modality": "sar",
            "pipeline": self.pipeline,
            "l_band_hh_db": self.l_band_hh_db,
            "s_band_hh_db": self.s_band_hh_db,
            "vh_hv_ratio": self.vh_hv_ratio,
            "double_bounce_index": self.double_bounce_index,
            "wetland_probability": self.wetland_probability,
            "ground_moisture_index": self.ground_moisture_index,
            "canopy_ground_mismatch": self.canopy_ground_mismatch,
            "frequency_bands": self.frequency_bands,
            "polarimetric_composite": self.polarimetric_composite,
            "coherence": self.coherence,
        }


@dataclass
class SarFinding:
    category: str  # moisture|wetland|structure|motion|general
    name: str
    confidence: float
    severity: str
    evidence: str


@dataclass
class SarAnalysisResult:
    risk_level: str
    ground_status: str
    summary: str
    findings: list[SarFinding]
    wetland_probability: float
    double_bounce_index: float
    ground_moisture_index: float
    canopy_ground_mismatch: bool
    pipeline: str
    raw_signals: dict[str, Any] = field(default_factory=dict)
