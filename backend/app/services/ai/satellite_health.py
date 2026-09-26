"""NDVI / satellite time-series analysis for pest, disease, and stress detection.

Uses monthly Sentinel-2 NDVI statistics (mean, min, max, baseline change) with
rule-based agronomic heuristics. Suitable for monthly rescan workflows; optional
LLM narrative can be layered later via OPENAI_API_KEY.
"""

from __future__ import annotations

from statistics import mean

from app.services.ai.satellite_health_types import (
    HealthFinding,
    NdviObservation,
    SatelliteHealthResult,
    TreatmentRecommendation,
)

PIPELINE = "byot-ndvi-health-1.0.0"


def _sorted_obs(observations: list[NdviObservation]) -> list[NdviObservation]:
    return sorted(observations, key=lambda o: o.scene_acquired_at)


def _linear_slope(values: list[float]) -> float:
    n = len(values)
    if n < 2:
        return 0.0
    xs = list(range(n))
    x_mean = mean(xs)
    y_mean = mean(values)
    num = sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, values, strict=False))
    den = sum((x - x_mean) ** 2 for x in xs) or 1.0
    return num / den


def _consecutive_monthly_drops(values: list[float]) -> int:
    drops = 0
    max_drops = 0
    for i in range(1, len(values)):
        if values[i] < values[i - 1] - 0.03:
            drops += 1
            max_drops = max(max_drops, drops)
        else:
            drops = 0
    return max_drops


def _heterogeneity(latest: NdviObservation) -> float:
    if latest.ndvi_min is None or latest.ndvi_max is None:
        return 0.0
    return max(0.0, latest.ndvi_max - latest.ndvi_min)


def analyze_satellite_ndvi_health(
    observations: list[NdviObservation],
    *,
    area_ha: float | None = None,
    species_hint: str | None = None,
) -> SatelliteHealthResult:
    """Full pest/disease/stress analysis from NDVI satellite history."""
    if not observations:
        raise ValueError("no_satellite_observations")

    obs = _sorted_obs(observations)
    values = [o.ndvi_mean for o in obs]
    latest = obs[-1]
    current = latest.ndvi_mean
    slope = _linear_slope(values)
    drops = _consecutive_monthly_drops(values)
    spread = _heterogeneity(latest)
    baseline_delta = latest.change_vs_baseline
    cloud = latest.cloud_cover_pct

    if slope > 0.02:
        trend = "improving"
    elif slope < -0.02:
        trend = "declining"
    else:
        trend = "stable"

    findings: list[HealthFinding] = []
    treatments: list[TreatmentRecommendation] = []
    monitoring: list[str] = []

    # --- Signal detection ---
    if current < 0.15:
        findings.append(
            HealthFinding(
                category="stress",
                name="severe_vegetation_loss",
                confidence=0.85,
                severity="critical",
                evidence=f"NDVI mean {current:.2f} indicates bare soil or dead canopy.",
            )
        )
    elif current < 0.25:
        findings.append(
            HealthFinding(
                category="stress",
                name="low_vegetation_cover",
                confidence=0.75,
                severity="high",
                evidence=f"NDVI mean {current:.2f} below plantation threshold (0.25).",
            )
        )

    if trend == "declining" and drops >= 2:
        findings.append(
            HealthFinding(
                category="stress",
                name="persistent_ndvi_decline",
                confidence=0.8,
                severity="high" if drops >= 3 else "moderate",
                evidence=f"NDVI declined {drops} consecutive periods (slope {slope:.3f}/month).",
            )
        )

    if baseline_delta is not None and baseline_delta < -0.15:
        findings.append(
            HealthFinding(
                category="stress",
                name="below_historical_baseline",
                confidence=0.78,
                severity="high" if baseline_delta < -0.25 else "moderate",
                evidence=f"Δ vs 12-month baseline: {baseline_delta:+.3f}.",
            )
        )

    if spread >= 0.22:
        findings.append(
            HealthFinding(
                category="disease",
                name="patchy_canopy_stress",
                confidence=0.72,
                severity="moderate",
                evidence=f"High within-area NDVI spread (max−min = {spread:.2f}) suggests uneven damage.",
            )
        )

    if trend == "declining" and spread >= 0.18 and current >= 0.25:
        findings.append(
            HealthFinding(
                category="pest",
                name="possible_pest_infestation",
                confidence=0.68,
                severity="moderate",
                evidence="Declining mean NDVI with patchy min/max range fits pest or localized feeding damage.",
            )
        )

    if len(values) >= 2 and (values[-1] - values[-2]) < -0.12:
        findings.append(
            HealthFinding(
                category="general",
                name="acute_ndvi_drop",
                confidence=0.7,
                severity="high",
                evidence="Sharp single-period NDVI drop — inspect for storm, harvest, fire, or outbreak.",
            )
        )

    if cloud is not None and cloud > 40:
        findings.append(
            HealthFinding(
                category="general",
                name="high_cloud_interference",
                confidence=0.9,
                severity="low",
                evidence=f"Latest scene cloud cover {cloud:.0f}% — confirm with next clear scan.",
            )
        )

    if current >= 0.45 and trend in ("stable", "improving") and not findings:
        findings.append(
            HealthFinding(
                category="general",
                name="healthy_canopy",
                confidence=0.82,
                severity="low",
                evidence=f"NDVI {current:.2f} with {trend} trend — no satellite stress signals.",
            )
        )

    # --- Treatment recommendations ---
    pest_needed = any(f.category == "pest" and f.severity in ("moderate", "high", "critical") for f in findings)
    disease_needed = any(
        f.category == "disease" and f.severity in ("moderate", "high", "critical") for f in findings
    ) or any(f.name == "patchy_canopy_stress" for f in findings)

    severe = any(f.severity in ("high", "critical") for f in findings if f.category != "general")

    if pest_needed or (severe and spread >= 0.18):
        pest_needed = True
        treatments.append(
            TreatmentRecommendation(
                category="pest",
                action="Scout plantation perimeter and canopy edge; deploy yellow sticky traps and pheromone traps.",
                product_or_method="IPM scouting + traps (aphids, thrips, borers per crop)",
                priority="warning",
                timing="Within 3–5 days",
                notes="Confirm insect ID before chemical spray. Consult local agronomist.",
            )
        )
        treatments.append(
            TreatmentRecommendation(
                category="pest",
                action="If live pests confirmed: apply neem oil 1% (5 ml/L) or approved botanical insecticide.",
                product_or_method="Azadirachtin 1500 ppm spray, evening application",
                priority="warning",
                timing="Every 7–10 days for 2 cycles if infestation persists",
                notes="Avoid spraying during peak heat or before rain.",
            )
        )

    if disease_needed:
        disease_needed = True
        treatments.append(
            TreatmentRecommendation(
                category="disease",
                action="Remove and destroy visibly infected leaves/branches; improve row spacing airflow.",
                product_or_method="Sanitation + pruning",
                priority="warning",
                timing="Immediately",
            )
        )
        treatments.append(
            TreatmentRecommendation(
                category="disease",
                action="Preventive fungicide if fungal lesions confirmed (leaf spot, rust, anthracnose).",
                product_or_method="Copper oxychloride 0.3% or Mancozeb 0.2% foliar spray",
                priority="warning",
                timing="Every 10–14 days until symptoms stop",
                notes="Rotate fungicide groups to avoid resistance.",
            )
        )

    if any(f.name in ("persistent_ndvi_decline", "low_vegetation_cover", "below_historical_baseline") for f in findings):
        treatments.append(
            TreatmentRecommendation(
                category="water",
                action="Check soil moisture 30 cm depth; irrigate if below field capacity.",
                product_or_method="Drip or flood per crop schedule",
                priority="warning" if severe else "info",
                timing="Within 48 hours in dry spell",
            )
        )
        treatments.append(
            TreatmentRecommendation(
                category="nutrient",
                action="Apply balanced NPK based on soil test; foliar micronutrients if yellowing.",
                product_or_method="19-19-19 @ 50–100 kg/ha or species-specific dose",
                priority="info",
                timing="Next suitable weather window",
            )
        )

    if any(f.name == "severe_vegetation_loss" for f in findings):
        treatments.append(
            TreatmentRecommendation(
                category="general",
                action="Urgent field visit — assess mortality, replant gaps, and drainage.",
                product_or_method="Ground truthing + replanting plan",
                priority="critical",
                timing="Within 24–48 hours",
            )
        )

    if not treatments:
        treatments.append(
            TreatmentRecommendation(
                category="general",
                action="No pest or disease intervention indicated from NDVI. Continue monthly Sentinel scans.",
                product_or_method="Routine monitoring",
                priority="info",
                timing="Next monthly rescan",
            )
        )

    monitoring = [
        "Repeat Sentinel-2 NDVI scan monthly (same fence boundary).",
        "Walk the block after each scan if NDVI drops > 0.05 vs prior month.",
        "Log rainfall and irrigation alongside NDVI for correlation.",
    ]
    if area_ha and area_ha > 500:
        monitoring.append(
            f"Large area ({area_ha:.0f} ha): split into sub-fences < 500 ha for sharper NDVI diagnostics."
        )
    if species_hint:
        monitoring.append(f"Cross-check symptoms with {species_hint} pest/disease calendar for your region.")

    # Risk level
    if any(f.severity == "critical" for f in findings):
        risk = "critical"
        status = "critical_stress"
    elif pest_needed or disease_needed or severe:
        risk = "high"
        status = "at_risk"
    elif any(f.severity == "moderate" for f in findings):
        risk = "moderate"
        status = "watch"
    else:
        risk = "low"
        status = "healthy"

    summary_parts = [
        f"NDVI {current:.2f} ({trend}); {len(obs)} satellite period(s) analysed.",
    ]
    if pest_needed:
        summary_parts.append("Pest control scouting recommended.")
    elif disease_needed:
        summary_parts.append("Disease management actions recommended.")
    else:
        summary_parts.append("No urgent pest/disease treatment from NDVI signals.")

    confidence = min(0.92, 0.55 + 0.06 * len(obs) + (0.1 if cloud is not None and cloud < 25 else 0))

    return SatelliteHealthResult(
        risk_level=risk,
        health_status=status,
        summary=" ".join(summary_parts),
        ndvi_current=round(current, 4),
        ndvi_trend=trend,
        trend_slope=round(slope, 4),
        pest_control_needed=pest_needed,
        disease_control_needed=disease_needed,
        findings=findings,
        treatments=treatments,
        monitoring_plan=monitoring,
        confidence=round(confidence, 3),
        data_points=len(obs),
        pipeline=PIPELINE,
        raw_signals={
            "slope": round(slope, 4),
            "consecutive_drops": drops,
            "heterogeneity": round(spread, 4),
            "baseline_delta": baseline_delta,
            "cloud_cover_pct": cloud,
            "species_hint": species_hint,
            "area_ha": area_ha,
        },
    )
