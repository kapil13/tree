"""Monitoring-only scheme helpers (existing cover watch, no planting KPIs)."""

from __future__ import annotations

MONITORING_SCHEME_CODES = frozenset({"estate_monitoring"})


def is_monitoring_scheme(scheme_code: str | None) -> bool:
    return scheme_code in MONITORING_SCHEME_CODES
