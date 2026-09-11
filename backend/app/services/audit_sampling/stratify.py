"""Pure stratified sampling calculations."""

from __future__ import annotations

import math
from typing import Any, Literal

DEFAULT_PLOTS_BY_RISK = {
    "critical": 3,
    "high": 2,
    "medium": 1,
    "low": 0,
}

SamplingMode = Literal["risk_weighted", "area_coverage", "hybrid"]


def plots_for_risk_level(
    risk_level: str,
    *,
    plots_per_critical: int = 3,
    plots_per_high: int = 2,
    plots_per_medium: int = 1,
    plots_per_low: int = 0,
) -> int:
    mapping = {
        "critical": plots_per_critical,
        "high": plots_per_high,
        "medium": plots_per_medium,
        "low": plots_per_low,
    }
    return max(0, mapping.get(risk_level, plots_per_medium))


def area_coverage_plot_count(
    area_ha: float | None,
    *,
    ha_per_plot: float = 50.0,
    min_plots_per_block: int = 1,
) -> int:
    ha_per_plot = max(5.0, min(ha_per_plot, 5000.0))
    min_plots = max(1, min_plots_per_block)
    if area_ha is None or area_ha <= 0:
        return min_plots
    return max(min_plots, math.ceil(area_ha / ha_per_plot))


def stratified_plot_counts(
    queue_blocks: list[dict[str, Any]],
    *,
    plots_per_critical: int = 3,
    plots_per_high: int = 2,
    plots_per_medium: int = 1,
    plots_per_low: int = 0,
    sampling_mode: SamplingMode = "risk_weighted",
    ha_per_plot: float = 50.0,
    min_plots_per_block: int = 1,
) -> list[dict[str, Any]]:
    """Return per-block plot counts sorted by priority rank."""
    result: list[dict[str, Any]] = []
    for block in sorted(queue_blocks, key=lambda b: b.get("priority_rank", 999)):
        risk_count = plots_for_risk_level(
            str(block.get("risk_level", "medium")),
            plots_per_critical=plots_per_critical,
            plots_per_high=plots_per_high,
            plots_per_medium=plots_per_medium,
            plots_per_low=plots_per_low,
        )
        coverage_count = area_coverage_plot_count(
            block.get("area_ha_measured") or block.get("area_ha_claimed"),
            ha_per_plot=ha_per_plot,
            min_plots_per_block=min_plots_per_block,
        )

        if sampling_mode == "risk_weighted":
            count = risk_count
        elif sampling_mode == "area_coverage":
            count = coverage_count
        else:
            count = max(risk_count, coverage_count)

        if count > 0:
            result.append(
                {
                    **block,
                    "plot_count": count,
                    "risk_plot_count": risk_count,
                    "coverage_plot_count": coverage_count,
                }
            )
    return result


def estimate_total_plots(
    queue_blocks: list[dict[str, Any]],
    **kwargs: Any,
) -> dict[str, Any]:
    """Preview plot counts without persisting."""
    blocks = stratified_plot_counts(queue_blocks, **kwargs)
    return {
        "total_plots": sum(int(b["plot_count"]) for b in blocks),
        "blocks": blocks,
        "sampling_mode": kwargs.get("sampling_mode", "risk_weighted"),
    }
