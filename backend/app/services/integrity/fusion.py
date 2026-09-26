"""Phase 2: fuse field evidence + satellite signals into integrity and credit gates."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.models.tree import Tree
from app.services.integrity.tree_risk import (
    VERIFICATION_AUDIT_READY,
    VERIFICATION_FIELD_VERIFIED,
    VERIFICATION_SATELLITE_CORROBORATED,
    RiskAssessment,
)

FUSION_CREDIT_MIN_SCORE = 65.0
FUSION_ISSUE_MIN_SCORE = 75.0
PRESENCE_NDVI_THRESHOLD = 0.25


@dataclass
class FusionResult:
    field_score: float
    satellite_score: float
    ai_score: float
    fusion_score: float
    credit_eligible: bool
    details: dict[str, Any]


def compute_field_score(assessment: RiskAssessment) -> float:
    base = max(0.0, min(100.0, round((1.0 - assessment.composite_risk) * 100, 2)))
    if assessment.gps_photo_match:
        base = min(100.0, base + 5.0)
    if assessment.duplicate_photo or assessment.duplicate_coordinate:
        base = max(0.0, base - 30.0)
    return round(base, 2)


def compute_satellite_score(
    *,
    satellite_verified: bool,
    ndvi_mean: float | None,
    presence_confirmed: bool | None,
    change_vs_baseline: float | None,
    work_area_ndvi_baseline: float | None = None,
) -> float:
    if ndvi_mean is None and not satellite_verified:
        return 35.0
    ndvi = float(ndvi_mean) if ndvi_mean is not None else 0.0
    if presence_confirmed or (satellite_verified and ndvi >= PRESENCE_NDVI_THRESHOLD):
        score = 55.0 + min(40.0, ndvi * 50.0)
    elif ndvi > 0:
        score = 40.0 + ndvi * 30.0
    else:
        score = 25.0
    if change_vs_baseline is not None:
        if change_vs_baseline >= 0.05:
            score = min(100.0, score + 8.0)
        elif change_vs_baseline <= -0.15:
            score = max(0.0, score - 15.0)
    if work_area_ndvi_baseline is not None and ndvi_mean is not None:
        delta = ndvi - work_area_ndvi_baseline
        if delta >= 0:
            score = min(100.0, score + min(10.0, delta * 20.0))
    return round(min(100.0, max(0.0, score)), 2)


def compute_ai_score(overall_confidence: float | None) -> float:
    if overall_confidence is None:
        return 50.0
    return round(max(0.0, min(100.0, float(overall_confidence) * 100)), 2)


def compute_fusion_score(
    *,
    field_score: float,
    satellite_score: float,
    ai_score: float,
    has_ai: bool,
) -> float:
    if has_ai:
        fusion = 0.45 * field_score + 0.35 * satellite_score + 0.20 * ai_score
    else:
        fusion = 0.55 * field_score + 0.45 * satellite_score
    return round(min(100.0, max(0.0, fusion)), 2)


def resolve_credit_eligible(
    *,
    fusion_score: float,
    assessment: RiskAssessment,
    verification_status: str,
) -> bool:
    if assessment.duplicate_photo or assessment.duplicate_coordinate:
        return False
    if assessment.composite_risk >= 0.35:
        return False
    if fusion_score < FUSION_CREDIT_MIN_SCORE:
        return False
    return verification_status in (
        VERIFICATION_FIELD_VERIFIED,
        VERIFICATION_SATELLITE_CORROBORATED,
        VERIFICATION_AUDIT_READY,
    )


def compute_tree_fusion(
    tree: Tree,
    assessment: RiskAssessment,
    *,
    ndvi_mean: float | None = None,
    presence_confirmed: bool | None = None,
    change_vs_baseline: float | None = None,
    work_area_ndvi_baseline: float | None = None,
    overall_confidence: float | None = None,
    verification_status: str | None = None,
) -> FusionResult:
    field_score = compute_field_score(assessment)
    satellite_score = compute_satellite_score(
        satellite_verified=bool(tree.satellite_verified),
        ndvi_mean=ndvi_mean,
        presence_confirmed=presence_confirmed,
        change_vs_baseline=change_vs_baseline,
        work_area_ndvi_baseline=work_area_ndvi_baseline,
    )
    ai_score = compute_ai_score(overall_confidence)
    has_ai = overall_confidence is not None
    fusion_score = compute_fusion_score(
        field_score=field_score,
        satellite_score=satellite_score,
        ai_score=ai_score,
        has_ai=has_ai,
    )
    v_status = verification_status or getattr(tree, "verification_status", "registered")
    credit_eligible = resolve_credit_eligible(
        fusion_score=fusion_score,
        assessment=assessment,
        verification_status=v_status,
    )
    return FusionResult(
        field_score=field_score,
        satellite_score=satellite_score,
        ai_score=ai_score,
        fusion_score=fusion_score,
        credit_eligible=credit_eligible,
        details={
            "weights": {"field": 0.45, "satellite": 0.35, "ai": 0.20} if has_ai else {"field": 0.55, "satellite": 0.45},
            "ndvi_mean": ndvi_mean,
            "change_vs_baseline": change_vs_baseline,
            "work_area_ndvi_baseline": work_area_ndvi_baseline,
            "fusion_credit_min": FUSION_CREDIT_MIN_SCORE,
        },
    )
