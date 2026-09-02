"""Satellite monitoring service.

Uses Copernicus Sentinel Hub when credentials are configured; otherwise a
deterministic stub keeps local dev and demos working end-to-end.
"""

from __future__ import annotations

import hashlib
import math
import random
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Protocol

from app.core.logging import get_logger

log = get_logger(__name__)


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
    indices: dict[str, float] | None = None


class SatelliteService(Protocol):
    async def sample(self, lat: float, lon: float, *, when: datetime | None = None) -> SatelliteSample: ...

    async def series(
        self, lat: float, lon: float, *, months: int = 12
    ) -> list[SatelliteSample]: ...


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
        evi = round(2.5 * (ndvi - 0.2) / (ndvi + 1.0), 4)
        cloud = round(rng.uniform(0, 30), 2)
        return SatelliteSample(
            provider="sentinel-2-stub",
            scene_id=f"S2_STUB_{ts.strftime('%Y%m%d')}_{abs(int(lat * 100))}_{abs(int(lon * 100))}",
            scene_acquired_at=ts,
            cloud_cover_pct=cloud,
            ndvi_mean=ndvi,
            ndvi_max=min(0.99, ndvi + 0.05),
            ndvi_min=max(0.0, ndvi - 0.05),
            evi_mean=evi,
            presence_confirmed=ndvi >= 0.25,
            change_vs_baseline=round(rng.uniform(-0.08, 0.08), 4),
            indices={
                "ndvi_mean": ndvi,
                "evi_mean": evi,
                "savi_mean": round(1.5 * ndvi / (ndvi + 0.5), 4),
                "ndmi_mean": round(ndvi * 0.6, 4),
                "ndwi_mean": round(-0.2 + ndvi * 0.3, 4),
                "bsi_mean": round(max(0.0, 0.4 - ndvi * 0.5), 4),
                "valid_pixel_pct": 92.0,
            },
        )

    async def series(self, lat: float, lon: float, *, months: int = 12) -> list[SatelliteSample]:
        now = datetime.now(UTC).replace(day=15, hour=12, minute=0, second=0, microsecond=0)
        out: list[SatelliteSample] = []
        for i in range(months, 0, -1):
            ts = now - timedelta(days=30 * i)
            out.append(await self.sample(lat, lon, when=ts))
        return out


class SentinelHubSatelliteService:
    """Point-level NDVI via Copernicus Statistical API (10 m tree chips)."""

    name = "sentinel-hub-1.0.0"

    def __init__(self, *, fallback: StubSatelliteService | None = None) -> None:
        self._fallback = fallback or StubSatelliteService()

    def _client(self):
        from app.services.satellite.plantation import _sentinel_client

        return _sentinel_client()

    async def sample(self, lat: float, lon: float, *, when: datetime | None = None) -> SatelliteSample:
        from app.services.satellite.plantation import _sample_from_stats

        try:
            latest = await self._client().fetch_latest_sample(lat, lon, when=when)
            if latest is None:
                log.warning("sentinel_no_scene_for_tree", lat=lat, lon=lon)
                return await self._fallback.sample(lat, lon, when=when)
            ts, stats = latest
            return _sample_from_stats(lat, lon, ts, stats)
        except Exception as exc:
            log.warning("sentinel_tree_sample_failed", lat=lat, lon=lon, error=str(exc))
            return await self._fallback.sample(lat, lon, when=when)

    async def series(self, lat: float, lon: float, *, months: int = 12) -> list[SatelliteSample]:
        from app.services.satellite.plantation import _sample_from_stats

        try:
            rows = await self._client().fetch_monthly_series(lat, lon, months=months)
            if not rows:
                return await self._fallback.series(lat, lon, months=months)
            means = [stats["mean"] for _, stats in rows]
            baseline = sum(means) / len(means)
            return [
                _sample_from_stats(
                    lat,
                    lon,
                    ts,
                    stats,
                    change_vs_baseline=round(stats["mean"] - baseline, 4),
                )
                for ts, stats in rows
            ]
        except Exception as exc:
            log.warning("sentinel_tree_series_failed", lat=lat, lon=lon, error=str(exc))
            return await self._fallback.series(lat, lon, months=months)


_service: SatelliteService | None = None


def reset_satellite_service() -> None:
    """Clear cached service (for tests and credential hot-reload)."""
    global _service
    _service = None


def get_satellite_service() -> SatelliteService:
    global _service
    if _service is not None:
        return _service

    from app.services.satellite.plantation import has_sentinel_credentials

    if has_sentinel_credentials():
        _service = SentinelHubSatelliteService()
    else:
        _service = StubSatelliteService()
    return _service
