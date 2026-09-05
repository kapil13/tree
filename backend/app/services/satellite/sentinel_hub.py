"""Copernicus Data Space / Sentinel Hub Statistical API client.

Docs:
  https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Overview/Authentication.html
  https://docs.sentinel-hub.com/api/latest/api/statistical/
"""

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


def bbox_wgs84_around_point(lat: float, lon: float, buffer_m: float = 15.0) -> list[float]:
    """Return [west, south, east, north] in CRS84 (lon/lat) order."""
    dlat = buffer_m / 111_320.0
    cos_lat = max(0.1, math.cos(math.radians(lat)))
    dlon = buffer_m / (111_320.0 * cos_lat)
    return [lon - dlon, lat - dlat, lon + dlon, lat + dlat]


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


class SentinelHubClient:
    """OAuth2 client-credentials + Statistical API."""

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

    def _build_request(
        self,
        lat: float,
        lon: float,
        *,
        time_from: datetime,
        time_to: datetime,
        interval: str,
    ) -> dict[str, Any]:
        return {
            "input": {
                "bounds": {
                    "bbox": bbox_wgs84_around_point(lat, lon),
                    "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"},
                },
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
                "evalscript": NDVI_EVALSCRIPT,
                "resx": 10,
                "resy": 10,
            },
        }

    async def fetch_statistics(
        self,
        lat: float,
        lon: float,
        *,
        time_from: datetime,
        time_to: datetime,
        interval: str = "P1M",
    ) -> list[dict[str, Any]]:
        token = await self._get_token()
        body = self._build_request(
            lat, lon, time_from=time_from, time_to=time_to, interval=interval
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

    async def fetch_monthly_series(
        self, lat: float, lon: float, *, months: int = 12
    ) -> list[tuple[datetime, dict[str, float]]]:
        now = datetime.now(UTC)
        time_from = now - timedelta(days=30 * months)
        entries = await self.fetch_statistics(
            lat, lon, time_from=time_from, time_to=now, interval="P1M"
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

    async def fetch_latest_sample(
        self, lat: float, lon: float, *, when: datetime | None = None
    ) -> tuple[datetime, dict[str, float]] | None:
        anchor = when or datetime.now(UTC)
        time_from = anchor - timedelta(days=45)
        time_to = anchor + timedelta(days=1)
        entries = await self.fetch_statistics(
            lat, lon, time_from=time_from, time_to=time_to, interval="P1D"
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
