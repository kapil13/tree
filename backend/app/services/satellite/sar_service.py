"""SAR monitoring service — NISAR-inspired L/S-band backscatter (stub + GEE hook).

When GEE credentials are configured, this module can be extended to sample
NISAR / Sentinel-1 / EOS-04 collections. Until then a deterministic stub keeps
dev, demos, and CI working end-to-end.
"""

from __future__ import annotations

import asyncio
import hashlib
import random
from datetime import UTC, datetime, timedelta
from typing import Protocol

from app.core.config import settings
from app.core.logging import get_logger
from app.services.geo import polygon_centroid
from app.services.satellite.gee_sar_sampler import (
    _initialize_gee,
    gee_python_available,
    sample_sentinel1_point,
)
from app.services.satellite.sar_types import SarSample

log = get_logger(__name__)

SAR_PROVIDER_STUB = "nisar-sar-stub"
SAR_PROVIDER_GEE = "sar-gee"


class SarService(Protocol):
    async def sample_point(self, lat: float, lon: float, *, when: datetime | None = None) -> SarSample: ...

    async def sample_polygon(
        self, boundary_geojson: dict, *, when: datetime | None = None
    ) -> SarSample: ...


def _rng(lat: float, lon: float, ts: datetime) -> random.Random:
    key = f"sar:{lat:.5f}:{lon:.5f}:{ts.strftime('%Y-%m')}"
    h = hashlib.sha256(key.encode()).digest()
    return random.Random(int.from_bytes(h[:8], "big"))


def _wetland_bias(lat: float, lon: float) -> float:
    """Deterministic wetland/moisture bias from coordinates (demo + test stability)."""
    h = hashlib.sha256(f"wet:{lat:.3f}:{lon:.3f}".encode()).digest()
    base = (h[0] / 255.0) * 0.55
    # Himalayan foothill / riparian belt heuristic (India-centric demo)
    if 29.5 <= lat <= 31.5 and 77.5 <= lon <= 79.5:
        base += 0.25
    if abs(lat) < 15:
        base += 0.08
    return min(0.95, base)


def _build_sample(
    lat: float,
    lon: float,
    ts: datetime,
    *,
    provider: str,
    pipeline: str,
) -> SarSample:
    rng = _rng(lat, lon, ts)
    wetland_bias = _wetland_bias(lat, lon)

    # L-band penetrates deeper; S-band interacts with upper canopy (IIRS NISAR article).
    s_hh = round(rng.uniform(-18.0, -8.0), 2)
    l_penetration = wetland_bias * rng.uniform(4.0, 9.0)
    l_hh = round(s_hh + l_penetration + rng.uniform(-1.5, 1.5), 2)

    l_s_ratio = l_hh - s_hh
    double_bounce = round(min(1.0, max(0.0, wetland_bias * 0.85 + (l_s_ratio / 12.0))), 3)
    ground_moisture = round(min(1.0, wetland_bias * 0.7 + double_bounce * 0.25), 3)
    wetland_prob = round(
        min(1.0, double_bounce * 0.55 + ground_moisture * 0.35 + (0.1 if l_s_ratio > 4 else 0)),
        3,
    )
    vh_ratio = round(rng.uniform(0.15, 0.45) + wetland_bias * 0.1, 3)

    # Healthy canopy greenness proxy mismatch: high L-band moisture under normal S-band.
    canopy_mismatch = wetland_prob >= 0.55 and l_s_ratio >= 3.5 and s_hh > -14.0

    hh_r = round(min(1.0, (l_hh + 25) / 20), 3)
    hv_g = round(min(1.0, vh_ratio), 3)
    hh_hv_b = round(min(1.0, l_hh / (s_hh - 0.01) * -0.15), 3)

    return SarSample(
        provider=provider,
        scene_id=f"NISAR_STUB_{ts.strftime('%Y%m%d')}_{abs(int(lat * 1000))}_{abs(int(lon * 1000))}",
        scene_acquired_at=ts,
        l_band_hh_db=l_hh,
        s_band_hh_db=s_hh,
        vh_hv_ratio=vh_ratio,
        double_bounce_index=double_bounce,
        wetland_probability=wetland_prob,
        ground_moisture_index=ground_moisture,
        canopy_ground_mismatch=canopy_mismatch,
        frequency_bands=["L", "S"],
        polarimetric_composite={"hh_r": hh_r, "hv_g": hv_g, "hh_hv_b": hh_hv_b},
        coherence=round(rng.uniform(0.55, 0.92), 3),
        pipeline=pipeline,
    )


class StubSarService:
    name = SAR_PROVIDER_STUB

    async def sample_point(self, lat: float, lon: float, *, when: datetime | None = None) -> SarSample:
        ts = when or datetime.now(UTC)
        return _build_sample(lat, lon, ts, provider=SAR_PROVIDER_STUB, pipeline="byot-sar-stub-1.0.0")

    async def sample_polygon(
        self, boundary_geojson: dict, *, when: datetime | None = None
    ) -> SarSample:
        lat, lon = polygon_centroid(boundary_geojson)
        return await self.sample_point(lat, lon, when=when)


def _sample_from_gee_dict(data: dict) -> SarSample:
    return SarSample(
        provider=data["provider"],
        scene_id=data["scene_id"],
        scene_acquired_at=data["scene_acquired_at"],
        l_band_hh_db=data["l_band_hh_db"],
        s_band_hh_db=data["s_band_hh_db"],
        vh_hv_ratio=data.get("vh_hv_ratio"),
        double_bounce_index=data["double_bounce_index"],
        wetland_probability=data["wetland_probability"],
        ground_moisture_index=data["ground_moisture_index"],
        canopy_ground_mismatch=data["canopy_ground_mismatch"],
        frequency_bands=data.get("frequency_bands", ["C"]),
        polarimetric_composite=data.get("polarimetric_composite"),
        coherence=data.get("coherence"),
        pipeline=data.get("pipeline", "byot-sar-gee-2.0.0"),
    )


class GeeSarService:
    """GEE-backed SAR (Sentinel-1) with stub fallback."""

    name = SAR_PROVIDER_GEE

    def __init__(self, *, fallback: StubSarService | None = None) -> None:
        self._fallback = fallback or StubSarService()

    async def sample_point(self, lat: float, lon: float, *, when: datetime | None = None) -> SarSample:
        if settings.gee_service_account_json and gee_python_available():
            try:
                data = await asyncio.to_thread(sample_sentinel1_point, lat, lon, when=when)
                if data is not None:
                    return _sample_from_gee_dict(data)
            except Exception as exc:
                log.warning("sar_gee_sample_failed", lat=lat, lon=lon, error=str(exc))
        return await self._fallback.sample_point(lat, lon, when=when)

    async def sample_polygon(
        self, boundary_geojson: dict, *, when: datetime | None = None
    ) -> SarSample:
        lat, lon = polygon_centroid(boundary_geojson)
        return await self.sample_point(lat, lon, when=when)


_service: SarService | None = None


def reset_sar_service() -> None:
    global _service
    _service = None


def has_sar_credentials() -> bool:
    return bool(settings.gee_service_account_json) and gee_python_available() and _initialize_gee()


def is_sar_provider_record(provider: str) -> bool:
    p = (provider or "").lower()
    return p.startswith("sar-") or "nisar" in p or p.startswith("nisar")


def get_sar_service() -> SarService:
    global _service
    if _service is not None:
        return _service

    if settings.sar_provider == "gee" and settings.gee_service_account_json:
        _service = GeeSarService()
    else:
        _service = StubSarService()
    return _service


async def sar_series_point(lat: float, lon: float, *, months: int = 6) -> list[SarSample]:
    svc = get_sar_service()
    now = datetime.now(UTC).replace(day=15, hour=12, minute=0, second=0, microsecond=0)
    out: list[SarSample] = []
    for i in range(months, 0, -1):
        ts = now - timedelta(days=30 * i)
        out.append(await svc.sample_point(lat, lon, when=ts))
    return out
