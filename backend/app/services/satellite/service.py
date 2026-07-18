"""Satellite monitoring service.

In production this wraps Google Earth Engine (preferred), Sentinel Hub,
USGS Landsat APIs, and (optionally) Planet Labs. In dev we ship a
deterministic stub so the rest of the platform — pipelines, dashboard,
alerts — is exercisable end-to-end.

Outputs follow the schema of `satellite_records`.
"""

from __future__ import annotations

import hashlib
import math
import random
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Protocol


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


class StubSatelliteService:
    name = "byot-satellite-stub-1.0.0"

    def _rng(self, lat: float, lon: float, ts: datetime) -> random.Random:
        key = f"{lat:.5f}:{lon:.5f}:{ts.strftime('%Y-%m')}"
        h = hashlib.sha256(key.encode()).digest()
        return random.Random(int.from_bytes(h[:8], "big"))

    def _seasonal_ndvi(self, lat: float, ts: datetime) -> float:
        # Simple seasonality: tropical (|lat|<23.5) ≈ flat 0.65±, temperate sinusoid.
        if abs(lat) <= 23.5:
            base, amp = 0.65, 0.10
        else:
            base, amp = 0.50, 0.30
        day_of_year = ts.timetuple().tm_yday
        # Peak NDVI ~ day 180 in NH, day 360 in SH
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
            provider="sentinel-2",
            scene_id=f"S2_{ts.strftime('%Y%m%d')}_{abs(int(lat*100))}_{abs(int(lon*100))}",
            scene_acquired_at=ts,
            cloud_cover_pct=cloud,
            ndvi_mean=ndvi,
            ndvi_max=min(0.99, ndvi + 0.05),
            ndvi_min=max(0.0, ndvi - 0.05),
            evi_mean=evi,
            presence_confirmed=ndvi >= 0.25,
            change_vs_baseline=round(rng.uniform(-0.08, 0.08), 4),
        )

    async def series(self, lat: float, lon: float, *, months: int = 12) -> list[SatelliteSample]:
        now = datetime.now(UTC).replace(day=15, hour=12, minute=0, second=0, microsecond=0)
        out: list[SatelliteSample] = []
        for i in range(months, 0, -1):
            ts = now - timedelta(days=30 * i)
            out.append(await self.sample(lat, lon, when=ts))
        return out


_service: SatelliteService | None = None


def get_satellite_service() -> SatelliteService:
    global _service
    if _service is None:
        _service = StubSatelliteService()
    return _service
