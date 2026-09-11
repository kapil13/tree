"""Plausibility engine for audit intake blocks — pure functions."""

from __future__ import annotations

from typing import Any

from app.services.planting_projects.compliance import _parse_pit_size_cm
from app.services.planting_projects.templates import get_template


def _density_range(rules: dict[str, Any]) -> tuple[float, float] | None:
    density = rules.get("planting_density_per_ha")
    if isinstance(density, dict):
        lo = density.get("min")
        hi = density.get("max")
        if lo is not None and hi is not None:
            return float(lo), float(hi)
    return None


def assess_block_plausibility(
    *,
    block_name: str,
    area_ha_measured: float | None,
    area_ha_claimed: float | None,
    trees_claimed: int | None,
    density_per_ha: float | None,
    template_code: str | None,
    min_work_area_ha: float | None = None,
    max_work_area_ha: float | None = None,
) -> dict[str, Any]:
    """Return verdict, summary, signals — epistemic label ESTIMATION only."""
    signals: dict[str, Any] = {}
    issues: list[str] = []

    rules: dict[str, Any] = {}
    if template_code:
        tpl = get_template(template_code)
        if tpl:
            rules = tpl.get("rules") or {}
            min_work_area_ha = min_work_area_ha or rules.get("min_work_area_ha")
            max_work_area_ha = max_work_area_ha or rules.get("max_work_area_ha")

    area = area_ha_measured or area_ha_claimed
    if area is not None:
        signals["area_ha"] = round(area, 2)
        if min_work_area_ha and area < float(min_work_area_ha):
            issues.append(f"Block area {area:.1f} ha below minimum {min_work_area_ha} ha")
        if max_work_area_ha and area > float(max_work_area_ha):
            issues.append(f"Block area {area:.1f} ha exceeds maximum {max_work_area_ha} ha")

    if area_ha_claimed and area_ha_measured:
        pct_diff = abs(area_ha_measured - area_ha_claimed) / max(area_ha_claimed, 0.01) * 100
        signals["area_mismatch_pct"] = round(pct_diff, 1)
        if pct_diff > 15:
            issues.append(f"Claimed vs measured area differs by {pct_diff:.0f}%")

    implied_density: float | None = None
    if trees_claimed and area and area > 0:
        implied_density = trees_claimed / area
        signals["implied_density_per_ha"] = round(implied_density, 1)

    if density_per_ha:
        signals["claimed_density_per_ha"] = density_per_ha

    density_range = _density_range(rules)
    if implied_density is not None and density_range:
        lo, hi = density_range
        signals["expected_density_range"] = [lo, hi]
        if implied_density < lo * 0.5 or implied_density > hi * 2:
            issues.append(
                f"Implied density {implied_density:.0f}/ha outside expected {lo:.0f}–{hi:.0f}/ha"
            )

    pit_val = rules.get("pit_size_cm")
    if pit_val:
        parsed = _parse_pit_size_cm(pit_val)
        if parsed:
            signals["pit_size_cm"] = list(parsed)

    if not area:
        return {
            "verdict": "cannot_assess",
            "summary": f"{block_name}: no area data to assess plausibility",
            "signals": signals,
            "epistemic_label": "ESTIMATION",
        }

    if len(issues) >= 2:
        verdict = "inconsistent"
    elif len(issues) == 1:
        verdict = "unusual"
    elif trees_claimed is None and density_per_ha is None:
        verdict = "cannot_assess"
        issues.append("No tree count or density claim provided")
    else:
        verdict = "plausible"

    summary = f"{block_name}: {verdict}"
    if issues:
        summary += " — " + "; ".join(issues)

    return {
        "verdict": verdict,
        "summary": summary,
        "signals": signals,
        "epistemic_label": "ESTIMATION",
    }
