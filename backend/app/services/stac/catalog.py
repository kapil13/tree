"""STAC catalog builder for plantation NDVI assets and evidence bundles."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from geoalchemy2.shape import to_shape
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.plantation_fence import PlantationFence
from app.models.plantation_satellite_record import PlantationSatelliteRecord
from app.models.planting_project import PlantingProject

STAC_VERSION = "1.0.0"


def _geojson_from_fence(fence: PlantationFence) -> dict[str, Any] | None:
    if fence.boundary is None:
        return None
    try:
        shape = to_shape(fence.boundary)
        return shape.__geo_interface__
    except Exception:
        return None


async def build_stac_catalog(
    db: AsyncSession,
    *,
    organization: Organization,
    api_base: str,
) -> dict[str, Any]:
    projects = list(
        (
            await db.execute(
                select(PlantingProject)
                .where(PlantingProject.organization_id == organization.id)
                .order_by(PlantingProject.code.asc())
            )
        ).scalars().all()
    )
    slug = (organization.slug or "org").replace("/", "-")
    links = [
        {"rel": "self", "href": f"{api_base}/ogc/stac/catalog", "type": "application/json"},
        {"rel": "root", "href": f"{api_base}/ogc/stac/catalog", "type": "application/json"},
    ]
    for project in projects:
        links.append(
            {
                "rel": "child",
                "href": f"{api_base}/ogc/stac/projects/{project.id}/items",
                "type": "application/json",
                "title": project.name,
            }
        )
    return {
        "type": "Catalog",
        "stac_version": STAC_VERSION,
        "id": f"byot-{slug}",
        "title": f"BYOT STAC — {organization.name}",
        "description": "Plantation NDVI tiles and evidence bundle references",
        "links": links,
    }


async def build_project_stac_items(
    db: AsyncSession,
    *,
    project: PlantingProject,
    api_base: str,
) -> dict[str, Any]:
    fences = list(
        (
            await db.execute(
                select(PlantationFence).where(PlantationFence.project_id == project.id)
            )
        ).scalars().all()
    )
    features: list[dict[str, Any]] = []
    for fence in fences:
        rec = (
            await db.execute(
                select(PlantationSatelliteRecord)
                .where(PlantationSatelliteRecord.fence_id == fence.id)
                .order_by(PlantationSatelliteRecord.scene_acquired_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()

        geom = _geojson_from_fence(fence)
        dt = rec.scene_acquired_at.isoformat() if rec and rec.scene_acquired_at else None
        assets: dict[str, Any] = {}
        if rec and rec.thumbnail_s3_key:
            assets["ndvi-thumbnail"] = {
                "href": rec.thumbnail_s3_key,
                "type": "image/png",
                "title": "NDVI thumbnail",
                "roles": ["thumbnail"],
            }
        assets["evidence-bundle"] = {
            "href": f"{api_base}/planting-projects/{project.id}/evidence-bundle",
            "type": "application/zip",
            "title": "Signed MRV evidence bundle",
            "roles": ["metadata"],
        }
        if rec and rec.ndvi_mean is not None:
            assets["ndvi-data"] = {
                "href": f"{api_base}/plantation-fences/{fence.id}/satellite-monitoring",
                "type": "application/json",
                "title": "NDVI time series",
                "roles": ["data"],
            }

        features.append(
            {
                "type": "Feature",
                "stac_version": STAC_VERSION,
                "id": f"byot-fence-{fence.id}",
                "geometry": geom,
                "bbox": None,
                "properties": {
                    "datetime": dt,
                    "title": fence.name,
                    "byot:project_code": project.code,
                    "byot:ndvi_mean": float(rec.ndvi_mean) if rec and rec.ndvi_mean else None,
                    "byot:ndvi_max": float(rec.ndvi_max) if rec and rec.ndvi_max else None,
                    "byot:provider": rec.provider if rec else None,
                    "byot:area_ha": float(fence.area_ha) if fence.area_ha else None,
                },
                "assets": assets,
                "links": [
                    {
                        "rel": "self",
                        "href": f"{api_base}/ogc/stac/projects/{project.id}/items",
                        "type": "application/json",
                    }
                ],
            }
        )

    return {
        "type": "FeatureCollection",
        "stac_version": STAC_VERSION,
        "features": features,
        "links": [
            {
                "rel": "self",
                "href": f"{api_base}/ogc/stac/projects/{project.id}/items",
                "type": "application/json",
            },
            {"rel": "root", "href": f"{api_base}/ogc/stac/catalog", "type": "application/json"},
        ],
        "generated_at": datetime.now(UTC).isoformat(),
    }
