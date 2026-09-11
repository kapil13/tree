"""Anomaly detection rules — pure functions."""

from __future__ import annotations

from typing import Any

NDVI_ACUTE_DROP = -0.12
NDVI_GROWTH_EXPECTED_MIN = 0.05
TEMPORAL_VOLATILITY_THRESHOLD = 0.10

SEVERITY_WEIGHTS = {"low": 5, "medium": 15, "high": 30, "critical": 50}


def _risk_level(score: int) -> str:
    if score >= 75:
        return "critical"
    if score >= 50:
        return "high"
    if score >= 25:
        return "medium"
    return "low"


def detect_block_anomalies(
    *,
    block_name: str,
    temporal_observations: list[dict[str, Any]],
    confidence_grade: str | None,
    confidence_score: int | None,
    plausibility_verdict: str | None,
    gis_block_issues: list[dict[str, Any]],
    trees_claimed: int | None,
) -> list[dict[str, Any]]:
    """Return list of anomaly dicts for one block."""
    anomalies: list[dict[str, Any]] = []

    phase_ndvi: dict[str, float] = {}
    for obs in temporal_observations:
        phase = obs.get("phase")
        ndvi = obs.get("ndvi_mean")
        if phase and ndvi is not None:
            phase_ndvi[str(phase)] = float(ndvi)

    current = phase_ndvi.get("current")
    t0 = phase_ndvi.get("t0")
    change_vs_t0 = (current - t0) if current is not None and t0 is not None else None

    if change_vs_t0 is not None and change_vs_t0 <= NDVI_ACUTE_DROP:
        severity = "critical" if change_vs_t0 <= -0.18 else "high"
        anomalies.append(
            {
                "anomaly_type": "ndvi_acute_drop",
                "severity": severity,
                "epistemic_label": "OBSERVATION",
                "title": f"NDVI acute drop — {block_name}",
                "summary": (
                    f"NDVI fell {change_vs_t0:.2f} vs T0 baseline "
                    f"(T0={t0:.2f}, current={current:.2f}). Inspect for clearing, fire, or mortality."
                ),
                "signals": {"t0_ndvi": t0, "current_ndvi": current, "change_vs_t0": change_vs_t0},
            }
        )

    if (
        change_vs_t0 is not None
        and trees_claimed
        and trees_claimed > 0
        and change_vs_t0 < NDVI_GROWTH_EXPECTED_MIN - 0.08
    ):
        anomalies.append(
            {
                "anomaly_type": "growth_deviation",
                "severity": "high",
                "epistemic_label": "ESTIMATION",
                "title": f"Growth below expectation — {block_name}",
                "summary": (
                    f"Claimed {trees_claimed} trees but NDVI gain vs T0 is only {change_vs_t0:.2f} "
                    f"(expected ≥{NDVI_GROWTH_EXPECTED_MIN:.2f} for establishing cover)."
                ),
                "signals": {
                    "trees_claimed": trees_claimed,
                    "change_vs_t0": change_vs_t0,
                    "expected_min_gain": NDVI_GROWTH_EXPECTED_MIN,
                },
            }
        )

    mid_phases = [phase_ndvi[p] for p in ("t1", "t2", "t3", "t4") if p in phase_ndvi]
    if len(mid_phases) >= 2:
        mean_ndvi = sum(mid_phases) / len(mid_phases)
        variance = sum((v - mean_ndvi) ** 2 for v in mid_phases) / len(mid_phases)
        if variance ** 0.5 > TEMPORAL_VOLATILITY_THRESHOLD:
            anomalies.append(
                {
                    "anomaly_type": "temporal_volatility",
                    "severity": "medium",
                    "epistemic_label": "OBSERVATION",
                    "title": f"Unstable vegetation signal — {block_name}",
                    "summary": (
                        f"NDVI volatility {variance ** 0.5:.2f} across T1–T4 exceeds threshold. "
                        "May indicate patchy establishment or mixed land use."
                    ),
                    "signals": {"phase_ndvi": phase_ndvi, "volatility": round(variance ** 0.5, 3)},
                }
            )

    if confidence_grade == "red":
        anomalies.append(
            {
                "anomaly_type": "confidence_low",
                "severity": "high",
                "epistemic_label": "ESTIMATION",
                "title": f"Low plantation confidence — {block_name}",
                "summary": f"Confidence map grade is red (score {confidence_score}). Block inconsistent with claim.",
                "signals": {"confidence_grade": confidence_grade, "confidence_score": confidence_score},
            }
        )
    elif confidence_grade == "amber":
        anomalies.append(
            {
                "anomaly_type": "confidence_uncertain",
                "severity": "medium",
                "epistemic_label": "ESTIMATION",
                "title": f"Uncertain plantation confidence — {block_name}",
                "summary": f"Confidence map grade is amber (score {confidence_score}). Mixed signals warrant review.",
                "signals": {"confidence_grade": confidence_grade, "confidence_score": confidence_score},
            }
        )

    if plausibility_verdict == "inconsistent":
        anomalies.append(
            {
                "anomaly_type": "plausibility_concern",
                "severity": "high",
                "epistemic_label": "ESTIMATION",
                "title": f"Plausibility inconsistent — {block_name}",
                "summary": "Intake plausibility review flagged this block as inconsistent with declared claim.",
                "signals": {"plausibility_verdict": plausibility_verdict},
            }
        )
    elif plausibility_verdict == "unusual":
        anomalies.append(
            {
                "anomaly_type": "plausibility_concern",
                "severity": "medium",
                "epistemic_label": "ESTIMATION",
                "title": f"Plausibility unusual — {block_name}",
                "summary": "Intake plausibility review flagged unusual density or area signals.",
                "signals": {"plausibility_verdict": plausibility_verdict},
            }
        )

    if gis_block_issues:
        has_invalid = any(i.get("code") == "invalid_geometry" for i in gis_block_issues)
        summaries = [
            str(i.get("message", i.get("code", "geometry issue"))) for i in gis_block_issues
        ]
        anomalies.append(
            {
                "anomaly_type": "gis_geometry_issue",
                "severity": "high" if has_invalid else "medium",
                "epistemic_label": "OBSERVATION",
                "title": f"GIS issue — {block_name}",
                "summary": "; ".join(summaries[:3]),
                "signals": {"gis_issues": gis_block_issues},
            }
        )

    return anomalies


def compute_block_risk(
    *,
    anomalies: list[dict[str, Any]],
    confidence_score: int | None,
) -> dict[str, Any]:
    """Compute block risk score and recommended action."""
    score = 0
    if confidence_score is not None:
        score += max(0, 100 - confidence_score) // 2

    for a in anomalies:
        score += SEVERITY_WEIGHTS.get(a.get("severity", "medium"), 15)

    score = min(100, score)
    level = _risk_level(score)
    count = len(anomalies)

    if level == "critical":
        action = "Priority field verification — acute canopy or claim mismatch signals."
    elif level == "high":
        action = "Schedule stratified field plot visit within 30 days."
    elif level == "medium":
        action = "Review satellite timeline and supporting documents before sampling."
    else:
        action = "Monitor via routine satellite cadence — no immediate field action."

    return {
        "risk_score": score,
        "risk_level": level,
        "anomaly_count": count,
        "recommended_action": action,
        "epistemic_label": "ESTIMATION",
        "signals": {"anomaly_types": [a["anomaly_type"] for a in anomalies]},
    }
