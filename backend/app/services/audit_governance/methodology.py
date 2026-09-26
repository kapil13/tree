"""Estate Watch methodology registry — deterministic rule versioning (Wave A / P17)."""

from __future__ import annotations

ESTATE_WATCH_METHODOLOGY_VERSION = "estate-watch-1.0.0"

METHODOLOGY_SEED = {
    "version": ESTATE_WATCH_METHODOLOGY_VERSION,
    "name": "Estate Watch Audit Methodology",
    "description": (
        "Deterministic satellite observation, statistical field sampling, and "
        "confidence fusion for plantation audit preparation."
    ),
    "status": "active",
}

RULE_VERSION_SEED: list[dict[str, object]] = [
    {
        "rule_code": "confidence_fusion",
        "version": "1.0.0",
        "parameters": {"grades": ["green", "amber", "red", "grey"]},
    },
    {
        "rule_code": "risk_scan",
        "version": "1.0.0",
        "parameters": {"severity_order": ["critical", "high", "medium", "low"]},
    },
    {
        "rule_code": "sampling_stratification",
        "version": "1.0.0",
        "parameters": {"default_mode": "risk_weighted"},
    },
]

THRESHOLD_SET_SEED: list[dict[str, object]] = [
    {
        "name": "default",
        "thresholds": {
            "ndvi_acute_drop": -0.15,
            "confidence_low_score": 40,
            "min_plots_per_block": 1,
        },
    },
]
