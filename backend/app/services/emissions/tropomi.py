"""Sentinel-5P TROPOMI CH₄ scans over buffered work-area ROI."""

from __future__ import annotations

import json
import math
import statistics
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.models.emission_source import EmissionSatelliteScan
from app.models.plantation_fence import PlantationFence
from app.services.geo import buffer_polygon_km, geography_to_geojson_polygon, polygon_coordinates

log = get_logger(__name__)

PROVIDER = "sentinel-5p-tropomi"


class TropomiScanError(Exception):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


def _sanitize_ppb(value: float) -> float | None:
    """Convert non-finite CH₄ ppb values to None for JSON/JSONB storage."""
    if not math.isfinite(value):
        return None
    return round(value, 2)


def _json_safe_value(value: Any) -> Any:
    if isinstance(value, float):
        return None if not math.isfinite(value) else value
    if isinstance(value, dict):
        return {k: _json_safe_value(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe_value(v) for v in value]
    return value


def json_safe_scan_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Ensure series/summary contain no NaN or Infinity before JSONB insert."""
    safe = _json_safe_value(payload)
    assert isinstance(safe, dict)
    # Fail fast in dev/tests if anything non-finite slipped through.
    json.dumps(safe, allow_nan=False)
    return safe


def tropomi_configured() -> bool:
    return bool(settings.sentinel_hub_client_id and settings.sentinel_hub_client_secret)


def _client():
    from app.services.satellite.sentinel_hub import SentinelHubClient

    return SentinelHubClient(
        settings.sentinel_hub_client_id or "",
        settings.sentinel_hub_client_secret or "",
        api_base_url=settings.sentinel_hub_api_url,
        token_url=settings.sentinel_hub_token_url,
    )


def _baseline_ppb(values: list[float | None]) -> float | None:
    finite = [v for v in values if v is not None and math.isfinite(v)]
    if not finite:
        return None
    if len(finite) == 1:
        return finite[0]
    # Use median of all but the latest month as background.
    baseline_vals = finite[:-1] if len(finite) > 1 else finite
    return _sanitize_ppb(float(statistics.median(baseline_vals)))


def _series_payload(
    series: list[tuple[datetime, dict[str, float]]],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    points: list[dict[str, Any]] = []
    for ts, stats in series:
        points.append(
            {
                "time": ts.isoformat(),
                "mean_ppb": _sanitize_ppb(float(stats["mean"])),
                "min_ppb": _sanitize_ppb(float(stats["min"])),
                "max_ppb": _sanitize_ppb(float(stats["max"])),
            }
        )
    if not points:
        return [], {}

    means = [p["mean_ppb"] for p in points]
    latest = points[-1]
    baseline = _baseline_ppb(means)
    anomaly = None
    latest_mean = latest["mean_ppb"]
    if baseline is not None and latest_mean is not None:
        anomaly = _sanitize_ppb(latest_mean - baseline)
    summary = {
        "latest_time": latest["time"],
        "latest_mean_ppb": latest_mean,
        "baseline_ppb": baseline,
        "anomaly_ppb": anomaly,
        "months": len(points),
    }
    return points, summary


async def run_tropomi_scan(
    db: AsyncSession,
    *,
    project_id: uuid.UUID,
    work_area: PlantationFence,
    user,
    months: int = 12,
    buffer_km: float | None = None,
) -> EmissionSatelliteScan:
    if work_area.project_id != project_id:
        raise TropomiScanError("work_area_project_mismatch")
    if not tropomi_configured():
        raise TropomiScanError("sentinel_hub_not_configured")

    roi_buffer_km = buffer_km if buffer_km is not None else settings.emission_satellite_buffer_km
    work_area_geo = geography_to_geojson_polygon(work_area.boundary)
    roi_geo = buffer_polygon_km(work_area_geo, roi_buffer_km)
    ring = polygon_coordinates(roi_geo)

    try:
        series_raw = await _client().fetch_polygon_s5p_ch4_series(ring, months=months)
    except Exception as exc:
        log.warning("tropomi_scan_failed", work_area_id=str(work_area.id), error=str(exc))
        raise TropomiScanError("tropomi_fetch_failed") from exc

    points, summary = _series_payload(series_raw)
    if not points:
        raise TropomiScanError("tropomi_no_data")

    safe_payload = json_safe_scan_payload({"series": points, "summary": summary})
    points = safe_payload["series"]
    summary = safe_payload["summary"]

    row = EmissionSatelliteScan(
        project_id=project_id,
        work_area_id=work_area.id,
        gas_type="CH4",
        provider=PROVIDER,
        buffer_km=roi_buffer_km,
        roi_geojson=roi_geo,
        series=points,
        summary=summary,
        status="complete",
        created_by=user.id,
    )
    db.add(row)
    await db.flush()
    return row


def scan_to_dict(row: EmissionSatelliteScan) -> dict[str, Any]:
    return {
        "id": row.id,
        "project_id": row.project_id,
        "work_area_id": row.work_area_id,
        "gas_type": row.gas_type,
        "provider": row.provider,
        "buffer_km": float(row.buffer_km),
        "roi_geojson": row.roi_geojson,
        "series": row.series,
        "summary": row.summary,
        "status": row.status,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }
