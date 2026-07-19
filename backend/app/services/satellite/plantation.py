"""Plantation fence satellite sampling (polygon NDVI via Copernicus or stub)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from app.core.config import settings
from app.core.logging import get_logger
from app.services.geo import polygon_centroid, polygon_coordinates
from app.services.satellite.service import SatelliteSample, get_satellite_service

log = get_logger(__name__)

PRESENCE_NDVI_THRESHOLD = 0.25


@dataclass
class PlantationScanResult:
    sample: SatelliteSample
    provider: str


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


def _sentinel_client():
    from app.services.satellite.sentinel_hub import SentinelHubClient

    return SentinelHubClient(
        settings.sentinel_hub_client_id or "",
        settings.sentinel_hub_client_secret or "",
        api_base_url=settings.sentinel_hub_api_url,
        token_url=settings.sentinel_hub_token_url,
    )


def has_sentinel_credentials() -> bool:
    return bool(settings.sentinel_hub_client_id and settings.sentinel_hub_client_secret)


async def scan_plantation_polygon(
    boundary_geojson: dict,
    *,
    require_sentinel: bool = False,
) -> PlantationScanResult:
    """Sample NDVI for a plantation polygon.

    When `require_sentinel` is False (e.g. NDVI preview), Copernicus failures fall back
    to the dev stub so users still get an image.
    """
    coords = polygon_coordinates(boundary_geojson)
    lat, lon = polygon_centroid(boundary_geojson)

    if has_sentinel_credentials():
        try:
            latest = await _sentinel_client().fetch_polygon_latest_sample(coords)
            if latest is not None:
                ts, stats = latest
                sample = _sample_from_stats(lat, lon, ts, stats)
                return PlantationScanResult(sample=sample, provider="sentinel-2")
            if require_sentinel:
                raise RuntimeError("no_sentinel2_scene_for_polygon")
            log.warning("sentinel_no_scene_for_polygon", lat=lat, lon=lon)
        except RuntimeError:
            if require_sentinel:
                raise
            log.warning("sentinel_scan_failed_using_stub")
        except Exception as exc:
            if require_sentinel:
                raise RuntimeError(f"sentinel_hub_error: {exc}") from exc
            log.warning("sentinel_scan_failed_using_stub", error=str(exc))

    sample = await get_satellite_service().sample(lat, lon)
    return PlantationScanResult(sample=sample, provider=sample.provider)


async def series_plantation_polygon(
    boundary_geojson: dict, *, months: int = 12
) -> list[SatelliteSample]:
    coords = polygon_coordinates(boundary_geojson)
    lat, lon = polygon_centroid(boundary_geojson)

    if has_sentinel_credentials():
        rows = await _sentinel_client().fetch_polygon_monthly_series(coords, months=months)
        if not rows:
            raise RuntimeError("no_sentinel2_series_for_polygon")
        means = [stats["mean"] for _, stats in rows]
        baseline = sum(means) / len(means)
        return [
            _sample_from_stats(
                lat, lon, ts, stats, change_vs_baseline=stats["mean"] - baseline
            )
            for ts, stats in rows
        ]

    return await get_satellite_service().series(lat, lon, months=months)


async def ndvi_image_for_polygon(boundary_geojson: dict, ndvi_mean: float, label: str) -> bytes:
    """PNG bytes for plantation NDVI — Copernicus Process API or synthetic fallback."""
    from app.services.satellite.ndvi_image import (
        png_is_mostly_grey_nodata,
        render_ndvi_png_polygon,
    )

    coords = polygon_coordinates(boundary_geojson)
    preview_label = f"{label} · preview" if "preview" not in label else label

    if has_sentinel_credentials():
        try:
            png = await _sentinel_client().fetch_polygon_ndvi_image(coords)
            if not png_is_mostly_grey_nodata(png):
                return png
            log.warning("sentinel_grey_image_using_colormap_preview", ndvi=ndvi_mean)
        except Exception as exc:
            log.warning("sentinel_process_fallback", error=str(exc))

    return render_ndvi_png_polygon(coords, ndvi_mean, label=preview_label)
