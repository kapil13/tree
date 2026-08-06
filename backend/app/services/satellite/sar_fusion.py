"""Optical NDVI + SAR fusion — Forest Integrity Score and monsoon gap-fill."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any

from app.services.satellite.sar_analytics import analyze_sar_sample
from app.services.satellite.sar_types import SarAnalysisResult, SarFinding, SarSample

PIPELINE = "byot-sar-fusion-2.0.0"
STALE_OPTICAL_DAYS = 35
HIGH_CLOUD_PCT = 40.0


@dataclass
class OpticalContext:
    ndvi_mean: float | None
    cloud_cover_pct: float | None
    scene_acquired_at: datetime | None
    provider: str | None = None


@dataclass
class SarFusionResult:
    forest_integrity_score: float
    integrity_grade: str
    monitoring_mode: str
    summary: str
    sar_analysis: SarAnalysisResult
    optical_ndvi: float | None
    optical_stale: bool
    findings: list[SarFinding] = field(default_factory=list)
    pipeline: str = PIPELINE
    raw_signals: dict[str, Any] = field(default_factory=dict)


def _integrity_grade(score: float) -> str:
    if score >= 80:
        return "excellent"
    if score >= 65:
        return "good"
    if score >= 50:
        return "fair"
    if score >= 35:
        return "at_risk"
    return "critical"


def _optical_is_stale(ctx: OpticalContext | None) -> bool:
    if ctx is None or ctx.scene_acquired_at is None:
        return True
    age = datetime.now(UTC) - ctx.scene_acquired_at
    if age > timedelta(days=STALE_OPTICAL_DAYS):
        return True
    return ctx.cloud_cover_pct is not None and ctx.cloud_cover_pct > HIGH_CLOUD_PCT


def compute_forest_integrity_score(
    *,
    ndvi_mean: float | None,
    sar_analysis: SarAnalysisResult,
    sample: SarSample,
) -> float:
    """0–100 composite: canopy greenness + dry ground + structure − mismatch penalty."""
    ndvi = ndvi_mean if ndvi_mean is not None else 0.35
    canopy_pts = min(40.0, max(0.0, ndvi) * 40.0)
    ground_pts = (1.0 - sar_analysis.wetland_probability) * 30.0
    structure_pts = max(0.0, 1.0 - sar_analysis.double_bounce_index) * 20.0
    coherence = sample.coherence if sample.coherence is not None else 0.7
    coherence_pts = coherence * 10.0
    mismatch_penalty = 15.0 if sar_analysis.canopy_ground_mismatch else 0.0
    return round(
        max(0.0, min(100.0, canopy_pts + ground_pts + structure_pts + coherence_pts - mismatch_penalty)),
        1,
    )


def analyze_sar_fusion(
    sample: SarSample,
    *,
    optical: OpticalContext | None = None,
) -> SarFusionResult:
    """Fuse latest optical NDVI context with SAR ground intelligence."""
    ndvi = optical.ndvi_mean if optical else None
    sar_analysis = analyze_sar_sample(sample, ndvi_mean=ndvi)
    optical_stale = _optical_is_stale(optical)

    findings = list(sar_analysis.findings)

    if (
        ndvi is not None
        and ndvi >= 0.35
        and sar_analysis.canopy_ground_mismatch
        and not any(f.name == "canopy_green_but_waterlogged" for f in findings)
    ):
        findings.append(
            SarFinding(
                category="moisture",
                name="canopy_green_but_waterlogged",
                confidence=0.82,
                severity="high",
                evidence=(
                    f"Optical NDVI {ndvi:.2f} indicates healthy canopy, but L-band SAR "
                    "shows waterlogging or wetland signatures beneath the trees."
                ),
            )
        )

    if optical_stale and sar_analysis.risk_level != "low":
        findings.append(
            SarFinding(
                category="general",
                name="sar_monsoon_gap_fill",
                confidence=0.75,
                severity="moderate" if sar_analysis.risk_level == "moderate" else "high",
                evidence=(
                    "Recent optical NDVI is stale or cloud-blocked; SAR ground layer used "
                    "for all-weather monitoring (monsoon gap-fill)."
                ),
            )
        )

    score = compute_forest_integrity_score(
        ndvi_mean=ndvi, sar_analysis=sar_analysis, sample=sample
    )
    grade = _integrity_grade(score)

    if optical_stale and sar_analysis.ground_status != "stable":
        mode = "sar_gap_fill"
        summary = (
            f"Forest Integrity {score}/100 ({grade}). Optical NDVI unavailable or stale — "
            f"SAR reports {sar_analysis.ground_status.replace('_', ' ')}."
        )
    elif sar_analysis.canopy_ground_mismatch:
        mode = "optical_sar_divergent"
        summary = (
            f"Forest Integrity {score}/100 ({grade}). Canopy looks green but SAR detects "
            "ground moisture risk — verify drainage on site."
        )
    elif grade in {"excellent", "good"}:
        mode = "aligned"
        summary = f"Forest Integrity {score}/100 ({grade}). Optical and SAR signals are aligned."
    else:
        mode = "sar_stress"
        summary = f"Forest Integrity {score}/100 ({grade}). {sar_analysis.summary}"

    sar_with_extra = SarAnalysisResult(
        risk_level=sar_analysis.risk_level,
        ground_status=sar_analysis.ground_status,
        summary=sar_analysis.summary,
        findings=findings,
        wetland_probability=sar_analysis.wetland_probability,
        double_bounce_index=sar_analysis.double_bounce_index,
        ground_moisture_index=sar_analysis.ground_moisture_index,
        canopy_ground_mismatch=sar_analysis.canopy_ground_mismatch,
        pipeline=sar_analysis.pipeline,
        raw_signals=sar_analysis.raw_signals,
    )

    return SarFusionResult(
        forest_integrity_score=score,
        integrity_grade=grade,
        monitoring_mode=mode,
        summary=summary,
        sar_analysis=sar_with_extra,
        optical_ndvi=ndvi,
        optical_stale=optical_stale,
        findings=findings,
        pipeline=PIPELINE,
        raw_signals={
            "forest_integrity_score": score,
            "integrity_grade": grade,
            "monitoring_mode": mode,
            "optical_stale": optical_stale,
            "optical_provider": optical.provider if optical else None,
            "optical_scene_at": optical.scene_acquired_at.isoformat() if optical and optical.scene_acquired_at else None,
            **sar_analysis.raw_signals,
        },
    )


def fusion_to_dict(result: SarFusionResult) -> dict[str, Any]:
    from app.services.satellite.sar_analytics import analysis_to_dict

    return {
        "forest_integrity_score": result.forest_integrity_score,
        "integrity_grade": result.integrity_grade,
        "monitoring_mode": result.monitoring_mode,
        "summary": result.summary,
        "optical_ndvi": result.optical_ndvi,
        "optical_stale": result.optical_stale,
        "sar_analysis": analysis_to_dict(result.sar_analysis),
        "findings": [f.__dict__ for f in result.findings],
        "pipeline": result.pipeline,
        "raw_signals": result.raw_signals,
    }
