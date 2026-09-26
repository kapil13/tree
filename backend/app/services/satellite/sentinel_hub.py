"""Copernicus Data Space / Sentinel Hub Statistical + Process API client."""

from __future__ import annotations

import math
import time
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx

from app.core.logging import get_logger

log = get_logger(__name__)

NDVI_EVALSCRIPT = """//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL", "dataMask"] }],
    output: [
      { id: "data", bands: 1 },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(samples) {
  var valid = 1;
  if (samples.B08 + samples.B04 == 0) valid = 0;
  if (samples.SCL == 6 || samples.SCL == 8 || samples.SCL == 9 || samples.SCL == 10) valid = 0;
  var ndvi = (samples.B08 - samples.B04) / (samples.B08 + samples.B04);
  return {
    data: [ndvi],
    dataMask: [samples.dataMask * valid]
  };
}
"""

MULTI_INDEX_EVALSCRIPT = """//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B02", "B03", "B04", "B08", "B11", "SCL", "dataMask"] }],
    output: [
      { id: "ndvi", bands: 1 },
      { id: "evi", bands: 1 },
      { id: "savi", bands: 1 },
      { id: "ndmi", bands: 1 },
      { id: "ndwi", bands: 1 },
      { id: "bsi", bands: 1 },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function isValid(samples) {
  if (!samples.dataMask) return 0;
  if (samples.B08 + samples.B04 == 0) return 0;
  if (samples.SCL == 6 || samples.SCL == 8 || samples.SCL == 9 || samples.SCL == 10) return 0;
  return 1;
}
function evaluatePixel(samples) {
  var valid = isValid(samples);
  var ndvi = (samples.B08 - samples.B04) / (samples.B08 + samples.B04);
  var evi = 2.5 * (samples.B08 - samples.B04) / (samples.B08 + 6 * samples.B04 - 7.5 * samples.B02 + 1);
  var savi = 1.5 * (samples.B08 - samples.B04) / (samples.B08 + samples.B04 + 0.5);
  var ndmi = (samples.B08 - samples.B11) / (samples.B08 + samples.B11);
  var ndwi = (samples.B03 - samples.B08) / (samples.B03 + samples.B08);
  var bsi = ((samples.B11 + samples.B04) - (samples.B08 + samples.B02)) / ((samples.B11 + samples.B04) + (samples.B08 + samples.B02));
  return {
    ndvi: [ndvi],
    evi: [evi],
    savi: [savi],
    ndmi: [ndmi],
    ndwi: [ndwi],
    bsi: [bsi],
    dataMask: [samples.dataMask * valid]
  };
}
"""

NDVI_IMAGE_EVALSCRIPT = """//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL", "dataMask"] }],
    output: { bands: 4, sampleType: "AUTO" }
  };
}
function ndviColor(v) {
  if (v < 0.1) return [0.61, 0.47, 0.35];
  if (v < 0.25) {
    var t = (v - 0.1) / 0.15;
    return [0.78 + 0.22 * t, 0.63 + 0.23 * t, 0.31 + 0.08 * t];
  }
  if (v < 0.5) {
    var t2 = (v - 0.25) / 0.25;
    return [1.0 - 0.39 * t2, 0.86 + 0.08 * t2, 0.39 - 0.16 * t2];
  }
  var t3 = Math.min(1.0, (v - 0.5) / 0.45);
  return [0.61 - 0.31 * t3, 0.78 + 0.08 * t3, 0.23 + 0.12 * t3];
}
function evaluatePixel(samples) {
  if (!samples.dataMask) return [0, 0, 0, 0];
  if (samples.B08 + samples.B04 == 0) return [0, 0, 0, 0];
  // Exclude only thick cloud / cirrus; keep partial vegetation signal.
  if (samples.SCL == 9 || samples.SCL == 10) return [0, 0, 0, 0];
  var ndvi = (samples.B08 - samples.B04) / (samples.B08 + samples.B04);
  var c = ndviColor(ndvi);
  return [c[0], c[1], c[2], 1];
}
"""

S5P_CH4_EVALSCRIPT = """//VERSION=3
function setup() {
  return {
    input: [{ bands: ["CH4", "dataMask"] }],
    output: [
      { id: "data", bands: 1 },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(samples) {
  var valid = samples.dataMask;
  if (samples.CH4 == null || samples.CH4 <= 0) valid = 0;
  return {
    data: [samples.CH4],
    dataMask: [valid]
  };
}
"""

S1_SAR_EVALSCRIPT = """//VERSION=3
function setup() {
  return {
    input: ["VH", "VV", "dataMask"],
    output: [
      { id: "vh", bands: 1, sampleType: "FLOAT32" },
      { id: "vv", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(samples) {
  return {
    vh: [samples.VH],
    vv: [samples.VV],
    dataMask: [samples.dataMask]
  };
}
"""


def bbox_wgs84_around_point(lat: float, lon: float, buffer_m: float = 15.0) -> list[float]:
    """Return [west, south, east, north] in CRS84 (lon/lat) order."""
    dlat = buffer_m / 111_320.0
    cos_lat = max(0.1, math.cos(math.radians(lat)))
    dlon = buffer_m / (111_320.0 * cos_lat)
    return [lon - dlon, lat - dlat, lon + dlon, lat + dlat]


def resolution_degrees(lat: float, *, meters: float = 10.0) -> float:
    """CRS84 degree step for ~10 m Sentinel-2 statistics grid cells."""
    return meters / (111_320.0 * max(0.1, math.cos(math.radians(lat))))


def _bounds_centroid_lat(bounds: dict[str, Any]) -> float:
    geom = bounds.get("geometry")
    if isinstance(geom, dict) and geom.get("type") == "Polygon":
        ring = geom.get("coordinates") or [[]]
        coords = ring[0] if ring else []
        if coords:
            return sum(float(c[1]) for c in coords) / len(coords)
    bbox = bounds.get("bbox")
    if bbox and len(bbox) >= 4:
        return (float(bbox[1]) + float(bbox[3])) / 2.0
    return 0.0


def _parse_iso(ts: str) -> datetime:
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


def _stats_from_entry(entry: dict[str, Any]) -> dict[str, float] | None:
    try:
        bands = entry["outputs"]["data"]["bands"]["B0"]["stats"]
    except (KeyError, TypeError):
        return None
    if int(bands.get("sampleCount") or 0) == 0:
        return None
    mean = bands.get("mean")
    if mean is None:
        return None
    return {
        "min": float(bands.get("min", mean)),
        "max": float(bands.get("max", mean)),
        "mean": float(mean),
    }


def _band_mean_from_entry(entry: dict[str, Any], output_id: str) -> float | None:
    try:
        bands = entry["outputs"][output_id]["bands"]["B0"]["stats"]
    except (KeyError, TypeError):
        return None
    if int(bands.get("sampleCount") or 0) == 0:
        return None
    mean = bands.get("mean")
    if mean is None:
        return None
    return float(mean)


def _mask_sample_count_from_entry(entry: dict[str, Any]) -> float | None:
    try:
        bands = entry["outputs"]["dataMask"]["bands"]["B0"]["stats"]
    except (KeyError, TypeError):
        return None
    count = bands.get("sampleCount")
    if count is None:
        return None
    return float(count)


def _multi_index_from_entry(entry: dict[str, Any]) -> dict[str, float] | None:
    index_ids = ("ndvi", "evi", "savi", "ndmi", "ndwi", "bsi")
    out: dict[str, float] = {}
    for idx in index_ids:
        mean = _band_mean_from_entry(entry, idx)
        if mean is None:
            return None
        out[f"{idx}_mean"] = round(mean, 4)
    valid_count = _mask_sample_count_from_entry(entry)
    if valid_count is not None:
        out["valid_pixel_count"] = valid_count
        out["valid_pixel_pct"] = round(min(100.0, valid_count), 2)
    out["min"] = out["ndvi_mean"]
    out["max"] = out["ndvi_mean"]
    out["mean"] = out["ndvi_mean"]
    return out


def _linear_to_db(linear: float | None) -> float | None:
    if linear is None or linear <= 0:
        return None
    return round(10.0 * math.log10(linear), 2)


class SentinelHubClient:
    """OAuth2 client-credentials + Statistical / Process APIs."""

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        *,
        api_base_url: str,
        token_url: str,
    ) -> None:
        self._client_id = client_id
        self._client_secret = client_secret
        self._api_base_url = api_base_url.rstrip("/")
        self._token_url = token_url
        self._access_token: str | None = None
        self._token_expires_at: float = 0.0

    async def _get_token(self) -> str:
        now = time.time()
        if self._access_token and now < self._token_expires_at - 30:
            return self._access_token

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                self._token_url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self._client_id,
                    "client_secret": self._client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            resp.raise_for_status()
            payload = resp.json()

        self._access_token = payload["access_token"]
        self._token_expires_at = now + float(payload.get("expires_in", 3600))
        return self._access_token

    def _bounds_from_polygon(self, polygon_coords: list[list[float]]) -> dict[str, Any]:
        return {
            "geometry": {
                "type": "Polygon",
                "coordinates": [polygon_coords],
            },
            "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"},
        }

    def _build_statistics_request(
        self,
        bounds: dict[str, Any],
        *,
        time_from: datetime,
        time_to: datetime,
        interval: str,
        evalscript: str = NDVI_EVALSCRIPT,
    ) -> dict[str, Any]:
        res = resolution_degrees(_bounds_centroid_lat(bounds))
        return {
            "input": {
                "bounds": bounds,
                "data": [
                    {
                        "type": "sentinel-2-l2a",
                        "dataFilter": {
                            "maxCloudCoverage": 20,
                            "mosaickingOrder": "leastCC",
                        },
                    }
                ],
            },
            "aggregation": {
                "timeRange": {
                    "from": time_from.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "to": time_to.strftime("%Y-%m-%dT%H:%M:%SZ"),
                },
                "aggregationInterval": {"of": interval},
                "evalscript": evalscript,
                "resx": res,
                "resy": res,
            },
        }

    async def fetch_statistics(
        self,
        bounds: dict[str, Any],
        *,
        time_from: datetime,
        time_to: datetime,
        interval: str = "P1M",
        evalscript: str = NDVI_EVALSCRIPT,
    ) -> list[dict[str, Any]]:
        token = await self._get_token()
        body = self._build_statistics_request(
            bounds,
            time_from=time_from,
            time_to=time_to,
            interval=interval,
            evalscript=evalscript,
        )
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(
                f"{self._api_base_url}/api/v1/statistics",
                json=body,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
            )
            if resp.status_code >= 400:
                log.warning(
                    "sentinel_hub_statistics_error",
                    status=resp.status_code,
                    body=resp.text[:500],
                )
            resp.raise_for_status()
            payload = resp.json()

        if payload.get("status") not in (None, "OK"):
            raise RuntimeError(f"sentinel_hub_status_{payload.get('status')}")
        return list(payload.get("data") or [])

    async def fetch_polygon_monthly_series(
        self, polygon_coords: list[list[float]], *, months: int = 12
    ) -> list[tuple[datetime, dict[str, float]]]:
        now = datetime.now(UTC)
        time_from = now - timedelta(days=30 * months)
        bounds = self._bounds_from_polygon(polygon_coords)
        entries = await self.fetch_statistics(
            bounds, time_from=time_from, time_to=now, interval="P1M"
        )
        out: list[tuple[datetime, dict[str, float]]] = []
        for entry in entries:
            stats = _stats_from_entry(entry)
            if not stats:
                continue
            interval = entry.get("interval") or {}
            ts_raw = interval.get("from") or interval.get("to")
            if not ts_raw:
                continue
            out.append((_parse_iso(ts_raw), stats))
        out.sort(key=lambda x: x[0])
        return out

    async def fetch_polygon_latest_sample(
        self, polygon_coords: list[list[float]], *, when: datetime | None = None
    ) -> tuple[datetime, dict[str, float]] | None:
        anchor = when or datetime.now(UTC)
        time_from = anchor - timedelta(days=45)
        time_to = anchor + timedelta(days=1)
        bounds = self._bounds_from_polygon(polygon_coords)
        entries = await self.fetch_statistics(
            bounds, time_from=time_from, time_to=time_to, interval="P1D"
        )
        candidates: list[tuple[datetime, dict[str, float]]] = []
        for entry in entries:
            stats = _stats_from_entry(entry)
            if not stats:
                continue
            interval = entry.get("interval") or {}
            ts_raw = interval.get("from") or interval.get("to")
            if not ts_raw:
                continue
            candidates.append((_parse_iso(ts_raw), stats))
        if not candidates:
            return None
        candidates.sort(key=lambda x: x[0])
        return candidates[-1]

    async def fetch_polygon_latest_multi_index(
        self, polygon_coords: list[list[float]], *, when: datetime | None = None
    ) -> tuple[datetime, dict[str, float]] | None:
        anchor = when or datetime.now(UTC)
        time_from = anchor - timedelta(days=45)
        time_to = anchor + timedelta(days=1)
        bounds = self._bounds_from_polygon(polygon_coords)
        entries = await self.fetch_statistics(
            bounds,
            time_from=time_from,
            time_to=time_to,
            interval="P1D",
            evalscript=MULTI_INDEX_EVALSCRIPT,
        )
        candidates: list[tuple[datetime, dict[str, float]]] = []
        for entry in entries:
            stats = _multi_index_from_entry(entry)
            if not stats:
                continue
            interval = entry.get("interval") or {}
            ts_raw = interval.get("from") or interval.get("to")
            if not ts_raw:
                continue
            candidates.append((_parse_iso(ts_raw), stats))
        if not candidates:
            return None
        candidates.sort(key=lambda x: x[0])
        return candidates[-1]

    async def fetch_polygon_ndvi_image(
        self,
        polygon_coords: list[list[float]],
        *,
        width: int = 512,
        height: int = 512,
    ) -> bytes:
        """False-color NDVI PNG for a plantation polygon via Process API."""
        token = await self._get_token()
        now = datetime.now(UTC)
        time_from = now - timedelta(days=120)
        body = {
            "input": {
                "bounds": self._bounds_from_polygon(polygon_coords),
                "data": [
                    {
                        "type": "sentinel-2-l2a",
                        "dataFilter": {
                            "timeRange": {
                                "from": time_from.strftime("%Y-%m-%dT%H:%M:%SZ"),
                                "to": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
                            },
                            "maxCloudCoverage": 60,
                            "mosaickingOrder": "leastCC",
                        },
                    }
                ],
            },
            "output": {
                "width": width,
                "height": height,
                "responses": [{"identifier": "default", "format": {"type": "image/png"}}],
            },
            "evalscript": NDVI_IMAGE_EVALSCRIPT,
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{self._api_base_url}/api/v1/process",
                json=body,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "Accept": "image/png",
                },
            )
            if resp.status_code >= 400:
                log.warning(
                    "sentinel_hub_process_error",
                    status=resp.status_code,
                    body=resp.text[:500],
                )
            resp.raise_for_status()
            return resp.content

    def _build_s1_statistics_request(
        self,
        bounds: dict[str, Any],
        *,
        time_from: datetime,
        time_to: datetime,
    ) -> dict[str, Any]:
        res = resolution_degrees(_bounds_centroid_lat(bounds))
        return {
            "input": {
                "bounds": bounds,
                "data": [
                    {
                        "type": "sentinel-1-grd",
                        "dataFilter": {
                            "timeRange": {
                                "from": time_from.strftime("%Y-%m-%dT%H:%M:%SZ"),
                                "to": time_to.strftime("%Y-%m-%dT%H:%M:%SZ"),
                            },
                            "mosaickingOrder": "mostRecent",
                        },
                    }
                ],
            },
            "aggregation": {
                "timeRange": {
                    "from": time_from.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "to": time_to.strftime("%Y-%m-%dT%H:%M:%SZ"),
                },
                "aggregationInterval": {"of": "P1D"},
                "evalscript": S1_SAR_EVALSCRIPT,
                "resx": res,
                "resy": res,
            },
        }

    async def fetch_s1_point_sample(
        self, lat: float, lon: float, *, when: datetime | None = None
    ) -> tuple[datetime, float, float] | None:
        """Return (scene_time, vh_db, vv_db) from latest Sentinel-1 GRD near a point."""
        anchor = when or datetime.now(UTC)
        time_from = anchor - timedelta(days=45)
        time_to = anchor + timedelta(days=1)
        bounds = {
            "bbox": bbox_wgs84_around_point(lat, lon, buffer_m=75.0),
            "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"},
        }
        token = await self._get_token()
        body = self._build_s1_statistics_request(bounds, time_from=time_from, time_to=time_to)
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(
                f"{self._api_base_url}/api/v1/statistics",
                json=body,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
            )
            if resp.status_code >= 400:
                log.warning(
                    "sentinel_hub_s1_statistics_error",
                    status=resp.status_code,
                    body=resp.text[:500],
                )
            resp.raise_for_status()
            payload = resp.json()

        if payload.get("status") not in (None, "OK"):
            raise RuntimeError(f"sentinel_hub_status_{payload.get('status')}")

        candidates: list[tuple[datetime, float, float]] = []
        for entry in payload.get("data") or []:
            vh_lin = _band_mean_from_entry(entry, "vh")
            vv_lin = _band_mean_from_entry(entry, "vv")
            vh_db = _linear_to_db(vh_lin)
            vv_db = _linear_to_db(vv_lin)
            if vh_db is None or vv_db is None:
                continue
            interval = entry.get("interval") or {}
            ts_raw = interval.get("from") or interval.get("to")
            if not ts_raw:
                continue
            candidates.append((_parse_iso(ts_raw), vh_db, vv_db))
        if not candidates:
            return None
        candidates.sort(key=lambda x: x[0])
        return candidates[-1]

    # Point helpers (tree chips)
    async def fetch_latest_sample(
        self, lat: float, lon: float, *, when: datetime | None = None
    ) -> tuple[datetime, dict[str, float]] | None:
        anchor = when or datetime.now(UTC)
        time_from = anchor - timedelta(days=45)
        time_to = anchor + timedelta(days=1)
        bounds = {
            "bbox": bbox_wgs84_around_point(lat, lon),
            "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"},
        }
        entries = await self.fetch_statistics(
            bounds, time_from=time_from, time_to=time_to, interval="P1D"
        )
        candidates: list[tuple[datetime, dict[str, float]]] = []
        for entry in entries:
            stats = _stats_from_entry(entry)
            if not stats:
                continue
            interval = entry.get("interval") or {}
            ts_raw = interval.get("from") or interval.get("to")
            if not ts_raw:
                continue
            candidates.append((_parse_iso(ts_raw), stats))
        if not candidates:
            return None
        candidates.sort(key=lambda x: x[0])
        return candidates[-1]

    def _build_s5p_statistics_request(
        self,
        bounds: dict[str, Any],
        *,
        time_from: datetime,
        time_to: datetime,
        interval: str,
    ) -> dict[str, Any]:
        return {
            "input": {
                "bounds": bounds,
                "data": [
                    {
                        "type": "sentinel-5p-l2",
                        "dataFilter": {
                            "mosaickingOrder": "mostRecent",
                        },
                    }
                ],
            },
            "aggregation": {
                "timeRange": {
                    "from": time_from.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "to": time_to.strftime("%Y-%m-%dT%H:%M:%SZ"),
                },
                "aggregationInterval": {"of": interval},
                "evalscript": S5P_CH4_EVALSCRIPT,
                "resx": 7000,
                "resy": 7000,
            },
        }

    async def fetch_s5p_ch4_statistics(
        self,
        bounds: dict[str, Any],
        *,
        time_from: datetime,
        time_to: datetime,
        interval: str = "P1M",
    ) -> list[dict[str, Any]]:
        token = await self._get_token()
        body = self._build_s5p_statistics_request(
            bounds, time_from=time_from, time_to=time_to, interval=interval
        )
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{self._api_base_url}/api/v1/statistics",
                json=body,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
            )
            if resp.status_code >= 400:
                log.warning(
                    "sentinel_hub_s5p_statistics_error",
                    status=resp.status_code,
                    body=resp.text[:500],
                )
            resp.raise_for_status()
            payload = resp.json()

        if payload.get("status") not in (None, "OK"):
            raise RuntimeError(f"sentinel_hub_status_{payload.get('status')}")
        return list(payload.get("data") or [])

    async def fetch_polygon_s5p_ch4_series(
        self, polygon_coords: list[list[float]], *, months: int = 12
    ) -> list[tuple[datetime, dict[str, float]]]:
        now = datetime.now(UTC)
        time_from = now - timedelta(days=30 * months)
        bounds = self._bounds_from_polygon(polygon_coords)
        entries = await self.fetch_s5p_ch4_statistics(
            bounds, time_from=time_from, time_to=now, interval="P1M"
        )
        out: list[tuple[datetime, dict[str, float]]] = []
        for entry in entries:
            stats = _stats_from_entry(entry)
            if not stats:
                continue
            interval = entry.get("interval") or {}
            ts_raw = interval.get("from") or interval.get("to")
            if not ts_raw:
                continue
            out.append((_parse_iso(ts_raw), stats))
        out.sort(key=lambda x: x[0])
        return out

    async def fetch_monthly_series(
        self, lat: float, lon: float, *, months: int = 12
    ) -> list[tuple[datetime, dict[str, float]]]:
        now = datetime.now(UTC)
        time_from = now - timedelta(days=30 * months)
        bounds = {
            "bbox": bbox_wgs84_around_point(lat, lon),
            "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"},
        }
        entries = await self.fetch_statistics(
            bounds, time_from=time_from, time_to=now, interval="P1M"
        )
        out: list[tuple[datetime, dict[str, float]]] = []
        for entry in entries:
            stats = _stats_from_entry(entry)
            if not stats:
                continue
            interval = entry.get("interval") or {}
            ts_raw = interval.get("from") or interval.get("to")
            if not ts_raw:
                continue
            out.append((_parse_iso(ts_raw), stats))
        out.sort(key=lambda x: x[0])
        return out
