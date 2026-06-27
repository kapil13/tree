"""Satellite monitoring service.

In production this wraps Copernicus Data Space Sentinel Hub (Statistical API),
Google Earth Engine, USGS Landsat, and (optionally) Planet Labs. In dev we
ship a deterministic stub so the rest of the platform is exercisable without
external accounts.

Set SENTINEL_HUB_CLIENT_ID + SENTINEL_HUB_CLIENT_SECRET to use real
Sentinel-2 NDVI from Copernicus.
"""

from __future__ import annotations

import hashlib
import math
import random
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Protocol

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger(__name__)

PRESENCE_NDVI_THRESHOLD = 0.25


@dataclass
class SatelliteSample:
    provider: str
    scene_id: str
    scene_acquired_at: datetime
    cloud_cover_pct: float
    ndvi_mean: float
    ndvi_max: float
    ndvi_min: float
    evi_mean: float
    presence_confirmed: bool
    change_vs_baseline: float
    thumbnail_s3_key: str | None = None


class SatelliteService(Protocol):
    async def sample(self, lat: float, lon: float, *, when: datetime | None = None) -> SatelliteSample: ...

    async def series(
        self, lat: float, lon: float, *, months: int = 12
    ) -> list[SatelliteSample]: ...


def _evi_from_ndvi(ndvi: float) -> float:
    return round(2.5 * (ndvi - 0.2) / (ndvi + 1.0), 4)


def _sample_from_stats(
    lat: float,
    lon: float,
    ts: datetime,
    stats: dict[str, float],
    *,
    change_vs_baseline: float = 0.0,
) -> SatelliteSample:
    ndvi_mean = round(stats["mean"], 4)
    return SatelliteSample(
        provider="sentinel-2",
        scene_id=f"S2_{ts.strftime('%Y%m%d')}_{abs(int(lat * 100))}_{abs(int(lon * 100))}",
        scene_acquired_at=ts,
        cloud_cover_pct=0.0,
        ndvi_mean=ndvi_mean,
        ndvi_max=round(stats["max"], 4),
        ndvi_min=round(stats["min"], 4),
        evi_mean=_evi_from_ndvi(ndvi_mean),
        presence_confirmed=ndvi_mean >= PRESENCE_NDVI_THRESHOLD,
        change_vs_baseline=round(change_vs_baseline, 4),
    )


class StubSatelliteService:
    name = "byot-satellite-stub-1.0.0"

    def _rng(self, lat: float, lon: float, ts: datetime) -> random.Random:
        key = f"{lat:.5f}:{lon:.5f}:{ts.strftime('%Y-%m')}"
        h = hashlib.sha256(key.encode()).digest()
        return random.Random(int.from_bytes(h[:8], "big"))

    def _seasonal_ndvi(self, lat: float, ts: datetime) -> float:
        if abs(lat) <= 23.5:
            base, amp = 0.65, 0.10
        else:
            base, amp = 0.50, 0.30
        day_of_year = ts.timetuple().tm_yday
        phase = (day_of_year - 180) / 365.0 * 2 * math.pi
        seasonal = base + amp * math.cos(phase) * (1 if lat >= 0 else -1)
        return max(0.05, min(0.95, seasonal))

    async def sample(self, lat: float, lon: float, *, when: datetime | None = None) -> SatelliteSample:
        ts = when or datetime.now(UTC)
        rng = self._rng(lat, lon, ts)
        ndvi = round(self._seasonal_ndvi(lat, ts) + rng.uniform(-0.05, 0.05), 4)
        return SatelliteSample(
            provider="sentinel-2",
            scene_id=f"S2_{ts.strftime('%Y%m%d')}_{abs(int(lat*100))}_{abs(int(lon*100))}",
            scene_acquired_at=ts,
            cloud_cover_pct=round(rng.uniform(0, 30), 2),
            ndvi_mean=ndvi,
            ndvi_max=min(0.99, ndvi + 0.05),
            ndvi_min=max(0.0, ndvi - 0.05),
            evi_mean=_evi_from_ndvi(ndvi),
            presence_confirmed=ndvi >= PRESENCE_NDVI_THRESHOLD,
            change_vs_baseline=round(rng.uniform(-0.08, 0.08), 4),
        )

    async def series(self, lat: float, lon: float, *, months: int = 12) -> list[SatelliteSample]:
        now = datetime.now(UTC).replace(day=15, hour=12, minute=0, second=0, microsecond=0)
        out: list[SatelliteSample] = []
        for i in range(months, 0, -1):
            ts = now - timedelta(days=30 * i)
            out.append(await self.sample(lat, lon, when=ts))
        return out


class SentinelHubSatelliteService:
    """Real Sentinel-2 L2A NDVI via Copernicus Data Space Statistical API."""

    name = "byot-sentinel-hub-1.0.0"

    def __init__(self) -> None:
        from app.services.satellite.sentinel_hub import SentinelHubClient

        self._client = SentinelHubClient(
            settings.sentinel_hub_client_id or "",
            settings.sentinel_hub_client_secret or "",
            api_base_url=settings.sentinel_hub_api_url,
            token_url=settings.sentinel_hub_token_url,
        )

    async def sample(self, lat: float, lon: float, *, when: datetime | None = None) -> SatelliteSample:
        latest = await self._client.fetch_latest_sample(lat, lon, when=when)
        if latest is None:
            raise RuntimeError("no_sentinel2_scene_for_location")
        ts, stats = latest
        return _sample_from_stats(lat, lon, ts, stats)

    async def series(self, lat: float, lon: float, *, months: int = 12) -> list[SatelliteSample]:
        rows = await self._client.fetch_monthly_series(lat, lon, months=months)
        if not rows:
            raise RuntimeError("no_sentinel2_series_for_location")

        means = [stats["mean"] for _, stats in rows]
        baseline = sum(means) / len(means)
        return [
            _sample_from_stats(lat, lon, ts, stats, change_vs_baseline=stats["mean"] - baseline)
            for ts, stats in rows
        ]


_service: SatelliteService | None = None


def get_satellite_service() -> SatelliteService:
    global _service
    if _service is None:
        if settings.sentinel_hub_client_id and settings.sentinel_hub_client_secret:
            log.info("satellite_service", provider="sentinel-hub")
            _service = SentinelHubSatelliteService()
        else:
            log.info("satellite_service", provider="stub")
            _service = StubSatelliteService()
    return _service


def reset_satellite_service() -> None:
    """Test helper — force factory to re-read settings."""
    global _service
    _service = None
