"""Scheme-specific bioacoustic monitoring protocols (P2)."""

from __future__ import annotations

from typing import Any

DEFAULT_PROTOCOL_KEY = "default"

BIO_MONITORING_PROTOCOLS: dict[str, dict[str, Any]] = {
    DEFAULT_PROTOCOL_KEY: {
        "label": "Standard ambient survey",
        "cadence_days": 90,
        "min_recordings_per_cycle": 1,
        "season_class": "unspecified",
        "duration_min_seconds": 60,
        "duration_max_seconds": 180,
        "guidance": "Quarterly 60–180 s ambient recordings at representative site points.",
    },
    "nhai_highway": {
        "label": "Highway linear transect",
        "cadence_days": 90,
        "min_recordings_per_cycle": 2,
        "season_class": "unspecified",
        "duration_min_seconds": 60,
        "duration_max_seconds": 120,
        "guidance": "Quarterly dawn/dusk ambient samples along chainage segments.",
    },
    "nagar_van": {
        "label": "Urban forest seasonal survey",
        "cadence_days": 30,
        "min_recordings_per_cycle": 1,
        "season_class": "monsoon",
        "duration_min_seconds": 90,
        "duration_max_seconds": 180,
        "guidance": "Monthly monsoon-season soundscape snapshots for urban blocks.",
    },
    "campa_ca": {
        "label": "Compensatory afforestation monitoring",
        "cadence_days": 60,
        "min_recordings_per_cycle": 1,
        "season_class": "unspecified",
        "duration_min_seconds": 60,
        "duration_max_seconds": 180,
        "guidance": "Bi-monthly acoustic richness checks for CA sites.",
    },
    "mining_reclamation": {
        "label": "Reclamation baseline & recovery",
        "cadence_days": 90,
        "min_recordings_per_cycle": 2,
        "season_class": "dry",
        "duration_min_seconds": 60,
        "duration_max_seconds": 120,
        "guidance": "Pre/post reclamation dry-season paired recordings.",
    },
    "estate_monitoring": {
        "label": "Estate biodiversity watch",
        "cadence_days": 30,
        "min_recordings_per_cycle": 1,
        "season_class": "unspecified",
        "duration_min_seconds": 60,
        "duration_max_seconds": 180,
        "guidance": "Monthly estate soundscape monitoring for PS6 evidence.",
    },
    "gim_restoration": {
        "label": "GIM restoration soundscape",
        "cadence_days": 60,
        "min_recordings_per_cycle": 1,
        "season_class": "monsoon",
        "duration_min_seconds": 90,
        "duration_max_seconds": 180,
        "guidance": "Bi-monthly monsoon-window recordings on degraded patches.",
    },
}


def protocol_for_scheme(scheme_code: str | None) -> dict[str, Any]:
    key = scheme_code if scheme_code in BIO_MONITORING_PROTOCOLS else DEFAULT_PROTOCOL_KEY
    row = dict(BIO_MONITORING_PROTOCOLS[key])
    row["protocol_key"] = key
    row["scheme_code"] = scheme_code
    return row
