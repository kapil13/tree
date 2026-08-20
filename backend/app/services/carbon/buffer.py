"""Dynamic permanence buffer resolution for carbon methodologies.

Maps project Non-Permanence Risk Tool (NPRT) scores to buffer percentages
(10–30% per Verra AFOLU NPRT guidance) instead of hardcoded methodology defaults.
"""

from __future__ import annotations

from typing import Literal

Methodology = Literal["IPCC_AR6", "VERRA_VM0047", "GOLD_STANDARD_LUF"]

# Static fallbacks when no project risk assessment exists
DEFAULT_BUFFER_POOL: dict[str, float] = {
    "IPCC_AR6": 0.0,
    "VERRA_VM0047": 0.20,
    "GOLD_STANDARD_LUF": 0.15,
}

NPRT_BUFFER_MIN = 0.10
NPRT_BUFFER_MAX = 0.30


def nprt_to_buffer_pct(nprt_score: float) -> float:
    """Map NPRT score 0 (low risk) → 10% buffer, 100 (high risk) → 30%."""
    score = max(0.0, min(100.0, nprt_score))
    return NPRT_BUFFER_MIN + (score / 100.0) * (NPRT_BUFFER_MAX - NPRT_BUFFER_MIN)


def resolve_buffer_pct(
    methodology: Methodology,
    *,
    buffer_pct: float | None = None,
    nprt_score: float | None = None,
) -> float:
    """Resolve effective buffer fraction (0–1) for a methodology."""
    if buffer_pct is not None:
        return max(0.0, min(0.50, buffer_pct))

    if nprt_score is not None and methodology in ("VERRA_VM0047", "GOLD_STANDARD_LUF"):
        return nprt_to_buffer_pct(nprt_score)

    return DEFAULT_BUFFER_POOL.get(methodology, 0.0)


def buffer_pct_label(buffer_pct: float, *, from_nprt: bool = False) -> str:
    pct = buffer_pct * 100.0
    source = "NPRT" if from_nprt else "methodology default"
    return f"{pct:.0f}% permanence buffer ({source})"
