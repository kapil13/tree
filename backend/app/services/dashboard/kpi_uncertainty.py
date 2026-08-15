"""Portfolio-level CO₂e uncertainty for dashboard KPIs."""

from __future__ import annotations

import math


def portfolio_co2e_uncertainty(total_co2e_kg: float, tree_count: int) -> dict[str, float]:
    """Conservative aggregate 90% CI when per-tree propagation is unavailable."""
    if tree_count <= 0 or total_co2e_kg <= 0:
        return {}
    # Portfolio uncertainty shrinks with sample size (sqrt-n rule on variance)
    base_pct = 22.0
    adjusted_pct = max(12.0, base_pct / math.sqrt(max(1, tree_count / 5)))
    half_width = total_co2e_kg * (adjusted_pct / 100.0) * 0.5
    z = 1.645
    return {
        "co2e_kg_lower_90": round(max(0.0, total_co2e_kg - half_width * z), 2),
        "co2e_kg_upper_90": round(total_co2e_kg + half_width * z, 2),
        "uncertainty_pct": round(adjusted_pct, 1),
    }
