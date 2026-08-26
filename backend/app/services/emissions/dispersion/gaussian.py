"""Gaussian plume ground-level concentration grid."""

from __future__ import annotations

import math
from typing import Any

import numpy as np
from shapely.geometry import shape

from app.services.geo import point_lat_lon
from app.services.weather.stability import sigma_y_m, sigma_z_m


def _metres_scales(lat: float) -> tuple[float, float]:
    lat_scale = 111_320.0
    lon_scale = max(111_320.0 * math.cos(math.radians(lat)), 1e-6)
    return lat_scale, lon_scale


def _local_grid_m(
    *,
    downwind_km: float,
    crosswind_km: float,
    step_m: float = 100.0,
) -> tuple[np.ndarray, np.ndarray]:
    x = np.arange(step_m, downwind_km * 1000.0 + step_m, step_m)
    y = np.arange(-crosswind_km * 1000.0, crosswind_km * 1000.0 + step_m, step_m)
    return np.meshgrid(x, y)


def gaussian_concentration_ug_m3(
    *,
    emission_rate_g_s: float,
    wind_speed_ms: float,
    release_height_m: float,
    stability_class: str,
    x_m: np.ndarray,
    y_m: np.ndarray,
    receptor_height_m: float = 1.5,
) -> np.ndarray:
    """Continuous point-source Gaussian plume (ground-level receptor)."""
    u = max(wind_speed_ms, 0.5)
    q_ug_s = emission_rate_g_s * 1_000_000.0  # g/s → µg/s
    h = release_height_m
    z = receptor_height_m
    conc = np.zeros_like(x_m, dtype=float)
    for i in range(x_m.shape[0]):
        for j in range(x_m.shape[1]):
            x = float(x_m[i, j])
            y = float(y_m[i, j])
            if x <= 0:
                continue
            sy = max(sigma_y_m(x, stability_class), 1.0)
            sz = max(sigma_z_m(x, stability_class), 1.0)
            cross = math.exp(-(y**2) / (2.0 * sy**2))
            vert = math.exp(-((z - h) ** 2) / (2.0 * sz**2)) + math.exp(
                -((z + h) ** 2) / (2.0 * sz**2)
            )
            conc[i, j] = (q_ug_s / (math.pi * u * sy * sz)) * cross * vert
    return conc


def _contour_features(
    x_m: np.ndarray,
    y_m: np.ndarray,
    conc: np.ndarray,
    thresholds: list[float],
    origin_lat: float,
    origin_lon: float,
    wind_from_deg: float,
) -> list[dict[str, Any]]:
    lat_scale, lon_scale = _metres_scales(origin_lat)
    features: list[dict[str, Any]] = []

    def to_wgs84(x: float, y: float) -> tuple[float, float]:
        # Local coords: x downwind, y crosswind (m). Rotate by wind-from direction.
        rad = math.radians(wind_from_deg)
        # Wind blows TO direction (from + 180)
        down_dx = math.sin(rad + math.pi) * x + math.cos(rad + math.pi) * y
        down_dy = math.cos(rad + math.pi) * x - math.sin(rad + math.pi) * y
        lon = origin_lon + down_dx / lon_scale
        lat = origin_lat + down_dy / lat_scale
        return lon, lat

    for threshold in thresholds:
        mask = conc >= threshold
        if not mask.any():
            continue
        # Approximate contour as downwind extent where concentration >= threshold
        rows, cols = np.where(mask)
        if len(rows) == 0:
            continue
        max_x = float(x_m[rows, cols].max())
        max_y = max(float(np.abs(y_m[rows, cols]).max()), 50.0)
        ring = [
            list(to_wgs84(0.0, -max_y)),
            list(to_wgs84(max_x, -max_y)),
            list(to_wgs84(max_x, max_y)),
            list(to_wgs84(0.0, max_y)),
            list(to_wgs84(0.0, -max_y)),
        ]
        features.append(
            {
                "type": "Feature",
                "properties": {"threshold_ug_m3": threshold},
                "geometry": {"type": "Polygon", "coordinates": [ring]},
            }
        )
    return features


def run_gaussian_plume(
    *,
    source_point: dict[str, Any],
    work_area_polygon: dict[str, Any],
    emission_rate_g_s: float,
    release_height_m: float,
    wind_speed_ms: float,
    wind_direction_deg: float,
    stability_class: str,
    downwind_km: float,
    crosswind_km: float,
    gas_type: str,
) -> dict[str, Any]:
    """Return plume grid summary and GeoJSON layers."""
    lat, lon = point_lat_lon(source_point)
    x_m, y_m = _local_grid_m(downwind_km=downwind_km, crosswind_km=crosswind_km)
    conc = gaussian_concentration_ug_m3(
        emission_rate_g_s=emission_rate_g_s,
        wind_speed_ms=wind_speed_ms,
        release_height_m=release_height_m,
        stability_class=stability_class,
        x_m=x_m,
        y_m=y_m,
    )
    max_conc = float(conc.max()) if conc.size else 0.0
    thresholds = sorted(
        {t for t in (max_conc * f for f in (0.1, 0.25, 0.5)) if t > 0.01},
        reverse=True,
    )[:3]
    contours = _contour_features(
        x_m, y_m, conc, thresholds, lat, lon, wind_direction_deg
    )

    lat_scale, lon_scale = _metres_scales(lat)
    rad = math.radians(wind_direction_deg)
    end_lon = lon + math.sin(rad + math.pi) * downwind_km * 1000.0 / lon_scale
    end_lat = lat + math.cos(rad + math.pi) * downwind_km * 1000.0 / lat_scale
    downwind_line = {
        "type": "Feature",
        "properties": {"kind": "downwind_axis"},
        "geometry": {
            "type": "LineString",
            "coordinates": [[lon, lat], [end_lon, end_lat]],
        },
    }

    wa = shape(work_area_polygon)
    inside_fc = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"kind": "source", "gas_type": gas_type},
                "geometry": source_point,
            },
            {
                "type": "Feature",
                "properties": {"kind": "work_area"},
                "geometry": work_area_polygon,
            },
        ],
    }
    downwind_fc = {
        "type": "FeatureCollection",
        "features": [downwind_line, *contours],
    }

    extends_outside = True
    if contours:
        plume_geom = shape(contours[0]["geometry"])
        extends_outside = not wa.contains(plume_geom)

    return {
        "gas_type": gas_type,
        "emission_rate_g_s": emission_rate_g_s,
        "wind_speed_ms": wind_speed_ms,
        "wind_direction_deg": wind_direction_deg,
        "stability_class": stability_class,
        "max_concentration_ug_m3": round(max_conc, 4),
        "downwind_km": downwind_km,
        "crosswind_km": crosswind_km,
        "extends_outside_work_area": extends_outside,
        "inside_boundary": inside_fc,
        "downwind_impact": downwind_fc,
        "contours": [
            {"threshold_ug_m3": f["properties"]["threshold_ug_m3"], "geojson": f}
            for f in contours
        ],
    }
