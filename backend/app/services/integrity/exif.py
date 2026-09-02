"""EXIF GPS and timestamp extraction from tree photos."""

from __future__ import annotations

import io
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from PIL import Image
from PIL.ExifTags import GPSTAGS, TAGS

GPS_PHOTO_MATCH_THRESHOLD_M = 25.0


@dataclass
class ExifGps:
    latitude: float
    longitude: float
    altitude_m: float | None = None


@dataclass
class ExifExtract:
    taken_at: datetime | None
    gps: ExifGps | None
    width_px: int | None
    height_px: int | None
    raw: dict[str, Any]


def _dms_to_decimal(dms: tuple[float, float, float], ref: str) -> float:
    degrees, minutes, seconds = dms
    decimal = float(degrees) + float(minutes) / 60.0 + float(seconds) / 3600.0
    if ref in ("S", "W"):
        decimal = -decimal
    return decimal


def _parse_gps_info(gps_info: dict[int, Any]) -> ExifGps | None:
    labeled = {GPSTAGS.get(k, k): v for k, v in gps_info.items()}
    lat = labeled.get("GPSLatitude")
    lat_ref = labeled.get("GPSLatitudeRef")
    lon = labeled.get("GPSLongitude")
    lon_ref = labeled.get("GPSLongitudeRef")
    if not lat or not lon or not lat_ref or not lon_ref:
        return None
    try:
        latitude = _dms_to_decimal(
            (float(lat[0]), float(lat[1]), float(lat[2])), str(lat_ref)
        )
        longitude = _dms_to_decimal(
            (float(lon[0]), float(lon[1]), float(lon[2])), str(lon_ref)
        )
    except (TypeError, ValueError, IndexError):
        return None
    alt = labeled.get("GPSAltitude")
    altitude_m = float(alt) if alt is not None else None
    return ExifGps(latitude=latitude, longitude=longitude, altitude_m=altitude_m)


def _parse_exif_datetime(value: str) -> datetime | None:
    for fmt in ("%Y:%m:%d %H:%M:%S", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(value, fmt).replace(tzinfo=UTC)
        except ValueError:
            continue
    return None


def extract_exif_from_bytes(data: bytes) -> ExifExtract | None:
    """Return EXIF metadata from image bytes, or None when unreadable."""
    if not data:
        return None
    try:
        with Image.open(io.BytesIO(data)) as img:
            width_px, height_px = img.size
            exif = img.getexif()
            if not exif:
                return ExifExtract(
                    taken_at=None,
                    gps=None,
                    width_px=width_px,
                    height_px=height_px,
                    raw={},
                )
            raw: dict[str, Any] = {}
            gps_info: dict[int, Any] | None = None
            taken_at: datetime | None = None
            for tag_id, value in exif.items():
                tag = TAGS.get(tag_id, tag_id)
                if tag == "GPSInfo":
                    gps_info = value
                    continue
                if tag in ("DateTimeOriginal", "DateTime") and isinstance(value, str):
                    taken_at = _parse_exif_datetime(value) or taken_at
                if isinstance(value, (str, int, float)):
                    raw[str(tag)] = value
            gps = _parse_gps_info(gps_info) if gps_info else None
            return ExifExtract(
                taken_at=taken_at,
                gps=gps,
                width_px=width_px,
                height_px=height_px,
                raw=raw,
            )
    except Exception:
        return None


def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    import math

    r = 6_371_000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def gps_photo_match(
    tree_lat: float,
    tree_lon: float,
    image_gps: ExifGps | None,
    *,
    threshold_m: float = GPS_PHOTO_MATCH_THRESHOLD_M,
) -> tuple[bool, float | None]:
    if image_gps is None:
        return False, None
    dist = haversine_distance_m(tree_lat, tree_lon, image_gps.latitude, image_gps.longitude)
    return dist <= threshold_m, round(dist, 2)
