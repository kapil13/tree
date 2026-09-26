"""Monitoring programme helpers — estate-only vs satellite watch on any project."""

from __future__ import annotations

from typing import Any

MONITORING_SCHEME_CODES = frozenset({"estate_monitoring"})
SATELLITE_WATCH_METADATA_KEY = "satellite_watch_enabled"


def is_monitoring_scheme(scheme_code: str | None) -> bool:
    """Dedicated estate / forest watch scheme (no planting KPI programme)."""
    return scheme_code in MONITORING_SCHEME_CODES


def is_monitoring_only_scheme(scheme_code: str | None) -> bool:
    return is_monitoring_scheme(scheme_code)


def _project_metadata(project: Any) -> dict[str, Any]:
    meta = getattr(project, "metadata_", None)
    if meta is None:
        meta = getattr(project, "metadata", None)
    return dict(meta or {})


def is_satellite_watch_enabled(project: Any) -> bool:
    """Satellite NDVI/SAR monitoring active — estate scheme or opt-in on planting projects."""
    scheme_code = getattr(project, "scheme_code", None)
    if is_monitoring_scheme(scheme_code):
        return True
    return bool(_project_metadata(project).get(SATELLITE_WATCH_METADATA_KEY))


def set_satellite_watch_enabled(metadata: dict[str, Any], enabled: bool) -> dict[str, Any]:
    out = dict(metadata or {})
    if enabled:
        out[SATELLITE_WATCH_METADATA_KEY] = True
    else:
        out.pop(SATELLITE_WATCH_METADATA_KEY, None)
    return out
