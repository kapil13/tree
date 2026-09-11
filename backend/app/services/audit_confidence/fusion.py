"""Confidence fusion — combine intake, satellite, and plausibility signals."""

from __future__ import annotations

from typing import Any

GRADE_GREEN = "green"
GRADE_AMBER = "amber"
GRADE_RED = "red"
GRADE_GREY = "grey"

PLAUSIBILITY_SCORES = {
    "plausible": 20,
    "unusual": -10,
    "inconsistent": -30,
    "cannot_assess": -5,
}


def _grade_from_score(score: int, has_data: bool) -> str:
    if not has_data:
        return GRADE_GREY
    if score >= 70:
        return GRADE_GREEN
    if score >= 40:
        return GRADE_AMBER
    return GRADE_RED


def _build_grid_cells(base_grade: str, volatility: float) -> list[dict[str, Any]]:
    """3×3 preview grid — centre reflects block grade, edges modulated by volatility."""
    grade_order = [GRADE_GREEN, GRADE_AMBER, GRADE_RED, GRADE_GREY]
    base_idx = grade_order.index(base_grade) if base_grade in grade_order else 3

    def cell_grade(row: int, col: int) -> str:
        if row == 1 and col == 1:
            return base_grade
        shift = 0
        if volatility > 0.12:
            shift = 1
        elif volatility > 0.06:
            shift = 0 if (row + col) % 2 == 0 else 1
        idx = min(len(grade_order) - 1, base_idx + shift)
        return grade_order[idx]

    cells: list[dict[str, Any]] = []
    for row in range(3):
        for col in range(3):
            cells.append(
                {
                    "row": row,
                    "col": col,
                    "grade": cell_grade(row, col),
                    "label": f"zone_{row}_{col}",
                }
            )
    return cells


def fuse_block_confidence(
    *,
    block_name: str,
    plausibility_verdict: str | None,
    plausibility_signals: dict[str, Any] | None,
    gis_status: str | None,
    gis_block_issues: list[dict[str, Any]],
    t0_backfill_status: str | None,
    t0_ndvi: float | None,
    current_ndvi: float | None,
    change_vs_t0: float | None,
    sar_integrity_score: float | None,
    field_visit_count: int = 0,
    field_grade: str | None = None,
    field_signal: str | None = None,
) -> dict[str, Any]:
    """Fuse signals into confidence score, grade, summary, and grid preview."""
    signals: dict[str, Any] = {
        "plausibility_verdict": plausibility_verdict,
        "gis_status": gis_status,
        "t0_backfill_status": t0_backfill_status,
        "t0_ndvi": t0_ndvi,
        "current_ndvi": current_ndvi,
        "change_vs_t0": change_vs_t0,
        "sar_integrity_score": sar_integrity_score,
    }
    if plausibility_signals:
        signals["plausibility_signals"] = plausibility_signals

    has_data = t0_backfill_status == "found" and current_ndvi is not None
    score = 50
    notes: list[str] = []

    if plausibility_verdict:
        delta = PLAUSIBILITY_SCORES.get(plausibility_verdict, -5)
        score += delta
        signals["plausibility_delta"] = delta
    else:
        score -= 10
        notes.append("No plausibility assessment")

    if t0_backfill_status == "found":
        score += 15
    elif t0_backfill_status == "stub_rejected":
        score -= 20
        notes.append("T0 stub provider rejected in audit mode")
    elif t0_backfill_status in {"not_found", "pending", None}:
        score -= 25
        has_data = False
        notes.append("T0 baseline missing")

    if gis_status == "pass":
        score += 10
    elif gis_status == "warn":
        score -= 5
        notes.append("GIS validation warnings")
    elif gis_status == "fail":
        score -= 20
        notes.append("GIS validation failed")

    if gis_block_issues:
        score -= min(15, len(gis_block_issues) * 5)
        notes.append(f"{len(gis_block_issues)} GIS issue(s) on block")

    volatility = 0.0
    if change_vs_t0 is not None:
        signals["ndvi_trend"] = "gain" if change_vs_t0 > 0.05 else "loss" if change_vs_t0 < -0.05 else "stable"
        if change_vs_t0 > 0.05:
            score += 10
        elif change_vs_t0 < -0.15:
            score -= 15
            notes.append(f"NDVI decline {change_vs_t0:.2f} vs T0")
        volatility = abs(change_vs_t0)

    if sar_integrity_score is not None:
        if sar_integrity_score < 40:
            score -= 10
            notes.append("Low SAR integrity score")
        elif sar_integrity_score >= 70:
            score += 5

    if field_visit_count > 0 and field_grade:
        signals["field_visit_count"] = field_visit_count
        signals["field_grade"] = field_grade
        signals["field_signal"] = field_signal
        if field_grade == GRADE_GREEN:
            score += 12
            notes.append(f"{field_visit_count} field visit(s) support claim")
        elif field_grade == GRADE_RED:
            score -= 25
            notes.append(f"{field_visit_count} field visit(s) contradict claim")
        elif field_grade == GRADE_AMBER:
            score -= 6
            notes.append("Mixed field verification signals")

    score = max(0, min(100, score))
    grade = _grade_from_score(score, has_data)
    grid_cells = _build_grid_cells(grade, volatility)

    grade_labels = {
        GRADE_GREEN: "plausible plantation cover",
        GRADE_AMBER: "uncertain — mixed signals",
        GRADE_RED: "inconsistent with claim",
        GRADE_GREY: "insufficient observation data",
    }
    summary = f"{block_name}: {grade_labels[grade]} (score {score})"
    if notes:
        summary += " — " + "; ".join(notes)

    return {
        "confidence_grade": grade,
        "confidence_score": score,
        "epistemic_label": "ESTIMATION",
        "summary": summary,
        "signals": signals,
        "grid_cells": grid_cells,
    }
