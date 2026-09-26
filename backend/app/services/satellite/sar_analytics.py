"""SAR analytics — wetland, double-bounce, hidden moisture (NISAR-inspired heuristics)."""

from __future__ import annotations

from app.services.satellite.sar_types import SarAnalysisResult, SarFinding, SarSample

PIPELINE = "byot-sar-health-1.0.0"

WETLAND_PROB_THRESHOLD = 0.65
DOUBLE_BOUNCE_THRESHOLD = 0.60
HIDDEN_MOISTURE_L_S_RATIO = 3.0
GROUND_MOISTURE_HIGH = 0.70


def analyze_sar_sample(
    sample: SarSample,
    *,
    ndvi_mean: float | None = None,
) -> SarAnalysisResult:
    """Rule-based SAR interpretation aligned with NISAR L/S-band science."""
    findings: list[SarFinding] = []
    l_s_ratio = sample.l_band_hh_db - sample.s_band_hh_db

    if sample.double_bounce_index >= DOUBLE_BOUNCE_THRESHOLD:
        findings.append(
            SarFinding(
                category="wetland",
                name="double_bounce_scattering",
                confidence=min(0.95, 0.6 + sample.double_bounce_index * 0.35),
                severity="high" if sample.double_bounce_index >= 0.75 else "moderate",
                evidence=(
                    f"Strong double-bounce signature ({sample.double_bounce_index:.2f}) — "
                    "radar energy bouncing between trunks and waterlogged ground."
                ),
            )
        )

    if sample.wetland_probability >= WETLAND_PROB_THRESHOLD:
        findings.append(
            SarFinding(
                category="wetland",
                name="wetland_forest_detected",
                confidence=sample.wetland_probability,
                severity="high" if sample.wetland_probability >= 0.8 else "moderate",
                evidence=(
                    f"L-band polarimetry indicates wetland forest conditions "
                    f"(probability {sample.wetland_probability:.0%})."
                ),
            )
        )

    if sample.ground_moisture_index >= GROUND_MOISTURE_HIGH:
        findings.append(
            SarFinding(
                category="moisture",
                name="elevated_ground_moisture",
                confidence=min(0.9, sample.ground_moisture_index),
                severity="moderate",
                evidence=(
                    f"Ground moisture index {sample.ground_moisture_index:.2f} — "
                    "persistent soil saturation under canopy."
                ),
            )
        )

    hidden_moisture = (
        ndvi_mean is not None
        and ndvi_mean >= 0.35
        and l_s_ratio >= HIDDEN_MOISTURE_L_S_RATIO
        and sample.ground_moisture_index >= 0.55
    )
    if hidden_moisture or sample.canopy_ground_mismatch:
        findings.append(
            SarFinding(
                category="moisture",
                name="sar_hidden_moisture",
                confidence=0.78 if hidden_moisture else 0.65,
                severity="high",
                evidence=(
                    f"Canopy appears healthy (NDVI {ndvi_mean:.2f}) but L-band SAR reveals "
                    f"elevated ground moisture (L−S ratio {l_s_ratio:.1f} dB)."
                    if ndvi_mean is not None
                    else "L-band penetration suggests moisture under an apparently healthy canopy."
                ),
            )
        )

    if sample.coherence is not None and sample.coherence < 0.45:
        findings.append(
            SarFinding(
                category="motion",
                name="low_coherence",
                confidence=0.7,
                severity="moderate",
                evidence=(
                    f"SAR coherence {sample.coherence:.2f} — possible ground movement, "
                    "landslide risk, or recent disturbance."
                ),
            )
        )

    severities = [f.severity for f in findings]
    if "high" in severities or "critical" in severities:
        risk = "high"
    elif severities:
        risk = "moderate"
    else:
        risk = "low"

    if sample.wetland_probability >= WETLAND_PROB_THRESHOLD:
        ground_status = "wetland_risk"
    elif sample.ground_moisture_index >= GROUND_MOISTURE_HIGH:
        ground_status = "moist"
    elif hidden_moisture or sample.canopy_ground_mismatch:
        ground_status = "hidden_moisture"
    else:
        ground_status = "stable"

    if not findings:
        summary = "SAR ground conditions appear stable; no wetland or hidden moisture signals detected."
    elif hidden_moisture or sample.canopy_ground_mismatch:
        summary = (
            "SAR detected moisture under canopy despite healthy optical greenness — "
            "verify drainage and root-zone conditions on site."
        )
    elif sample.wetland_probability >= WETLAND_PROB_THRESHOLD:
        summary = "L-band SAR indicates wetland or waterlogged forest floor beneath the canopy."
    else:
        summary = "SAR detected elevated ground moisture or structural anomalies worth field verification."

    return SarAnalysisResult(
        risk_level=risk,
        ground_status=ground_status,
        summary=summary,
        findings=findings,
        wetland_probability=sample.wetland_probability,
        double_bounce_index=sample.double_bounce_index,
        ground_moisture_index=sample.ground_moisture_index,
        canopy_ground_mismatch=bool(hidden_moisture or sample.canopy_ground_mismatch),
        pipeline=PIPELINE,
        raw_signals={
            "l_band_hh_db": sample.l_band_hh_db,
            "s_band_hh_db": sample.s_band_hh_db,
            "l_s_ratio_db": round(l_s_ratio, 2),
            "vh_hv_ratio": sample.vh_hv_ratio,
            "coherence": sample.coherence,
            "ndvi_mean": ndvi_mean,
        },
    )


def analysis_to_dict(analysis: SarAnalysisResult) -> dict:
    return {
        "risk_level": analysis.risk_level,
        "ground_status": analysis.ground_status,
        "summary": analysis.summary,
        "findings": [f.__dict__ for f in analysis.findings],
        "wetland_probability": analysis.wetland_probability,
        "double_bounce_index": analysis.double_bounce_index,
        "ground_moisture_index": analysis.ground_moisture_index,
        "canopy_ground_mismatch": analysis.canopy_ground_mismatch,
        "pipeline": analysis.pipeline,
    }
