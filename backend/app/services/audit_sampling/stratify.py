"""Pure stratified sampling calculations."""

from __future__ import annotations

from typing import Any

DEFAULT_PLOTS_BY_RISK = {
    "critical": 3,
    "high": 2,
    "medium": 1,
    "low": 0,
}


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


def stratified_plot_counts(
    queue_blocks: list[dict[str, Any]],
    *,
    plots_per_critical: int = 3,
    plots_per_high: int = 2,
    plots_per_medium: int = 1,
    plots_per_low: int = 0,
) -> list[dict[str, Any]]:
    """Return per-block plot counts sorted by priority rank."""
    result: list[dict[str, Any]] = []
    for block in sorted(queue_blocks, key=lambda b: b.get("priority_rank", 999)):
        count = plots_for_risk_level(
            str(block.get("risk_level", "medium")),
            plots_per_critical=plots_per_critical,
            plots_per_high=plots_per_high,
            plots_per_medium=plots_per_medium,
            plots_per_low=plots_per_low,
        )
        if count > 0:
            result.append({**block, "plot_count": count})
    return result
