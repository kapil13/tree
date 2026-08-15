"""ISRO Bhuvan WMS layer catalog — extends Bhoonidhi STAC with map overlay URLs."""

from __future__ import annotations

from typing import Any

from app.core.config import settings

# Default WMS layers useful for plantation / forest monitoring over India.
DEFAULT_BHUVAN_LAYERS: list[dict[str, str]] = [
    {
        "id": "bhuvan:india_forest_cover",
        "title": "India Forest Cover (FSI)",
        "description": "Forest Survey of India forest cover classification.",
        "layer": "forest:forest_cover_2019",
    },
    {
        "id": "bhuvan:india_admin_boundaries",
        "title": "India Admin Boundaries",
        "description": "State and district boundaries for site context.",
        "layer": "base:india_admin_boundaries",
    },
    {
        "id": "bhuvan:india_satellite_imagery",
        "title": "Bhuvan High Resolution Imagery",
        "description": "NRSC Bhuvan ortho imagery basemap.",
        "layer": "bhuvan:india_imagery",
    },
    {
        "id": "bhuvan:wasteland_atlas",
        "title": "Wasteland Atlas",
        "description": "Degraded / wasteland polygons for Green Credit site eligibility context.",
        "layer": "wasteland:wasteland_atlas",
    },
]


def _parse_layer_overrides() -> list[dict[str, str]]:
    raw = (settings.bhuvan_wms_layers or "").strip()
    if not raw:
        return list(DEFAULT_BHUVAN_LAYERS)
    layers: list[dict[str, str]] = []
    for entry in raw.split(","):
        entry = entry.strip()
        if not entry:
            continue
        parts = entry.split("|")
        layer_id = parts[0].strip()
        title = parts[1].strip() if len(parts) > 1 else layer_id
        layers.append(
            {
                "id": f"custom:{layer_id}",
                "title": title,
                "description": f"Custom Bhuvan layer: {layer_id}",
                "layer": layer_id,
            }
        )
    return layers or list(DEFAULT_BHUVAN_LAYERS)


def wms_get_capabilities_url() -> str:
    base = settings.bhuvan_wms_base_url.rstrip("/")
    return f"{base}?SERVICE=WMS&REQUEST=GetCapabilities"


def layer_wms_url(layer_name: str, *, bbox: str | None = None) -> str:
    base = settings.bhuvan_wms_base_url.rstrip("/")
    params = [
        "SERVICE=WMS",
        "REQUEST=GetMap",
        "VERSION=1.1.1",
        f"LAYERS={layer_name}",
        "STYLES=",
        "FORMAT=image/png",
        "TRANSPARENT=TRUE",
        "SRS=EPSG:4326",
        "WIDTH=512",
        "HEIGHT=512",
    ]
    if bbox:
        params.append(f"BBOX={bbox}")
    else:
        params.append("BBOX=68.0,6.0,97.0,37.0")
    return f"{base}?{'&'.join(params)}"


def list_bhuvan_layers() -> list[dict[str, Any]]:
    layers = _parse_layer_overrides()
    return [
        {
            **layer,
            "wms_url_template": layer_wms_url(layer["layer"]),
            "capabilities_url": wms_get_capabilities_url(),
            "service": "WMS",
            "provider": "ISRO Bhuvan",
        }
        for layer in layers
    ]


def bhuvan_status() -> dict[str, Any]:
    return {
        "enabled": True,
        "base_url": settings.bhuvan_wms_base_url,
        "capabilities_url": wms_get_capabilities_url(),
        "layer_count": len(_parse_layer_overrides()),
        "companion": "bhoonidhi_stac",
        "message": "Use Bhuvan WMS for basemap overlays; Bhoonidhi STAC for scene search.",
    }
