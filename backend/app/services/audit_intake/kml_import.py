"""KML/KMZ placemark import for audit boundary intake."""

from __future__ import annotations

import io
import re
import xml.etree.ElementTree as ET
import zipfile
from typing import Any

from shapely.geometry import mapping, shape

KML_NS = {"kml": "http://www.opengis.net/kml/2.2"}


def _strip_ns(tag: str) -> str:
    return tag.split("}")[-1] if "}" in tag else tag


def _parse_coordinates(text: str) -> list[list[float]]:
    coords: list[list[float]] = []
    for token in re.split(r"\s+", text.strip()):
        if not token:
            continue
        parts = token.split(",")
        if len(parts) < 2:
            continue
        lon, lat = float(parts[0]), float(parts[1])
        coords.append([lon, lat])
    return coords


def _polygon_from_coords(coords: list[list[float]]) -> dict[str, Any] | None:
    if len(coords) < 3:
        return None
    if coords[0] != coords[-1]:
        coords.append(coords[0])
    poly = {"type": "Polygon", "coordinates": [coords]}
    geom = shape(poly)
    if geom.is_empty or not geom.is_valid:
        return None
    return mapping(geom)


def _extract_placemarks(root: ET.Element) -> list[dict[str, Any]]:
    placemarks: list[dict[str, Any]] = []
    for elem in root.iter():
        if _strip_ns(elem.tag) != "Placemark":
            continue
        name = ""
        geometry: dict[str, Any] | None = None
        for child in elem:
            tag = _strip_ns(child.tag)
            if tag == "name" and child.text:
                name = child.text.strip()
            elif tag == "Polygon":
                for poly_child in child.iter():
                    if _strip_ns(poly_child.tag) == "coordinates" and poly_child.text:
                        coords = _parse_coordinates(poly_child.text)
                        geometry = _polygon_from_coords(coords)
            elif tag == "MultiGeometry":
                for mg_child in child.iter():
                    if _strip_ns(mg_child.tag) == "coordinates" and mg_child.text:
                        coords = _parse_coordinates(mg_child.text)
                        geometry = _polygon_from_coords(coords)
                        if geometry:
                            break
        if geometry:
            placemarks.append({"name": name or "Imported block", "geometry": geometry})
    return placemarks


def parse_kml_bytes(data: bytes) -> list[dict[str, Any]]:
    """Parse KML bytes and return placemark polygons as GeoJSON dicts."""
    root = ET.fromstring(data)
    return _extract_placemarks(root)


def parse_kmz_bytes(data: bytes) -> list[dict[str, Any]]:
    """Extract doc.kml (or first .kml) from KMZ and parse placemarks."""
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        kml_names = [n for n in zf.namelist() if n.lower().endswith(".kml")]
        if not kml_names:
            raise ValueError("kmz_has_no_kml")
        preferred = next((n for n in kml_names if n.lower().endswith("doc.kml")), kml_names[0])
        return parse_kml_bytes(zf.read(preferred))


def parse_upload(filename: str, data: bytes) -> list[dict[str, Any]]:
    lower = filename.lower()
    if lower.endswith(".kmz"):
        return parse_kmz_bytes(data)
    if lower.endswith(".kml"):
        return parse_kml_bytes(data)
    raise ValueError("unsupported_file_type")
