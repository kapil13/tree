"""Optional Google Earth Engine Sentinel-1 SAR sampling.

Requires `earthengine-api` and GEE_SERVICE_ACCOUNT_JSON. When unavailable,
callers should fall back to the deterministic SAR stub.
"""

from __future__ import annotations

import json
import os
import tempfile
from datetime import UTC, datetime, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger(__name__)

S1_COLLECTION = "COPERNICUS/S1_GRD"
BUFFER_M = 75


def gee_python_available() -> bool:
    try:
        import ee  # noqa: F401

        return True
    except ImportError:
        return False


def _load_service_account_info() -> dict[str, Any]:
    """Parse inline JSON or read a service-account key file (same pattern as Gmail)."""
    raw = (settings.gee_service_account_json or "").strip()
    if not raw:
        raise ValueError("gee_not_configured")
    if raw.startswith("{"):
        return json.loads(raw)
    path = Path(raw)
    if path.is_file():
        return json.loads(path.read_text(encoding="utf-8"))
    raise ValueError("invalid_service_account_json")


@lru_cache(maxsize=1)
def _initialize_gee() -> bool:
    if not settings.gee_service_account_json:
        return False
    if not gee_python_available():
        return False
    try:
        import ee

        info = _load_service_account_info()
        client_email = info.get("client_email")
        if not client_email:
            raise ValueError("service_account_missing_client_email")

        raw = settings.gee_service_account_json.strip()
        if raw.startswith("{"):
            with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as fh:
                json.dump(info, fh)
                key_path = fh.name
            try:
                credentials = ee.ServiceAccountCredentials(client_email, key_path)
                ee.Initialize(credentials)
            finally:
                os.unlink(key_path)
        else:
            key_path = str(Path(raw).resolve())
            credentials = ee.ServiceAccountCredentials(client_email, key_path)
            ee.Initialize(credentials)
        return True
    except Exception as exc:
        log.warning("gee_initialize_failed", error=str(exc))
        return False


def _db_from_linear(linear: float | None) -> float | None:
    if linear is None or linear <= 0:
        return None
    import math

    return round(10.0 * math.log10(linear), 2)


def sample_sentinel1_point(lat: float, lon: float, *, when: datetime | None = None) -> dict[str, Any] | None:
    """Sample Sentinel-1 VH/VV backscatter near a point (C-band proxy for fusion layer)."""
    if not _initialize_gee():
        return None

    import ee

    ts = when or datetime.now(UTC)
    end = ts.strftime("%Y-%m-%d")
    start = (ts - timedelta(days=45)).strftime("%Y-%m-%d")

    point = ee.Geometry.Point([lon, lat])
    region = point.buffer(BUFFER_M)

    collection = (
        ee.ImageCollection(S1_COLLECTION)
        .filterBounds(region)
        .filterDate(start, end)
        .filter(ee.Filter.eq("instrumentMode", "IW"))
        .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VH"))
        .select(["VH", "VV"])
        .sort("system:time_start", False)
        .limit(3)
    )

    try:
        size = collection.size().getInfo()
        if not size:
            return None
        image = collection.first()
        stats = image.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=region,
            scale=10,
            maxPixels=1_000_000,
        ).getInfo()
        info = image.getInfo() or {}
        props = info.get("properties") or {}
        vh_lin = stats.get("VH")
        vv_lin = stats.get("VV")
        vh_db = _db_from_linear(vh_lin)
        vv_db = _db_from_linear(vv_lin)
        if vh_db is None or vv_db is None:
            return None

        l_proxy = vh_db
        s_proxy = vv_db
        l_s_ratio = l_proxy - s_proxy
        vh_vv_ratio = round(abs(vh_lin / vv_lin), 3) if vv_lin else None
        double_bounce = round(min(1.0, max(0.0, (l_s_ratio + 5) / 12.0)), 3)
        ground_moisture = round(min(1.0, double_bounce * 0.65 + 0.15), 3)
        wetland_prob = round(min(1.0, double_bounce * 0.5 + ground_moisture * 0.35), 3)

        scene_id = props.get("system:index") or props.get("PRODUCT_ID") or "S1_GEE"
        acquired_ms = props.get("system:time_start")
        acquired = (
            datetime.fromtimestamp(acquired_ms / 1000, tz=UTC)
            if acquired_ms
            else ts
        )

        return {
            "provider": "sar-gee-sentinel1",
            "scene_id": str(scene_id),
            "scene_acquired_at": acquired,
            "l_band_hh_db": l_proxy,
            "s_band_hh_db": s_proxy,
            "vh_hv_ratio": vh_vv_ratio,
            "double_bounce_index": double_bounce,
            "wetland_probability": wetland_prob,
            "ground_moisture_index": ground_moisture,
            "canopy_ground_mismatch": wetland_prob >= 0.5 and l_s_ratio >= 2.5,
            "frequency_bands": ["C"],
            "polarimetric_composite": {
                "vh_db": vh_db,
                "vv_db": vv_db,
            },
            "coherence": None,
            "pipeline": "byot-sar-gee-s1-2.0.0",
        }
    except Exception as exc:
        log.warning("gee_s1_sample_failed", lat=lat, lon=lon, error=str(exc))
        return None
