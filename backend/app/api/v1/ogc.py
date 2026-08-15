"""OGC API Features and STAC catalog endpoints for GIS interoperability."""

from __future__ import annotations

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query, Request, status
from geoalchemy2.shape import to_shape
from sqlalchemy import select

from app.api.v1.deps import DB, CurrentUser
from app.core.config import get_settings
from app.models.organization import Organization
from app.models.plantation_fence import PlantationFence
from app.models.tree import Tree
from app.services.planting_projects.access import load_project
from app.services.platform.governance import assert_org_feature_enabled
from app.services.stac.catalog import build_project_stac_items, build_stac_catalog

router = APIRouter(prefix="/ogc", tags=["ogc"])


def _api_base(request: Request) -> str:
    settings = get_settings()
    base = str(request.base_url).rstrip("/")
    if settings.app_env != "test" and "localhost" not in base:
        return base
    return base


def _feature_from_fence(fence: PlantationFence) -> dict[str, Any]:
    geom = None
    if fence.boundary is not None:
        try:
            geom = to_shape(fence.boundary).__geo_interface__
        except Exception:
            geom = None
    return {
        "type": "Feature",
        "id": str(fence.id),
        "geometry": geom,
        "properties": {
            "feature_type": "work_area",
            "name": fence.name,
            "area_ha": float(fence.area_ha) if fence.area_ha else None,
            "project_id": str(fence.project_id) if fence.project_id else None,
            "segment_code": fence.segment_code,
        },
    }


def _feature_from_tree(tree: Tree) -> dict[str, Any]:
    return {
        "type": "Feature",
        "id": str(tree.id),
        "geometry": {
            "type": "Point",
            "coordinates": [float(tree.longitude), float(tree.latitude)],
        }
        if tree.latitude is not None and tree.longitude is not None
        else None,
        "properties": {
            "feature_type": "tree",
            "public_code": tree.public_code,
            "species": tree.species_text,
            "health": tree.current_health,
            "carbon_kg": float(tree.current_carbon_kg or 0),
            "project_id": str(tree.project_id) if tree.project_id else None,
        },
    }


@router.get("/stac/catalog")
async def stac_catalog(request: Request, user: CurrentUser, db: DB) -> dict[str, Any]:
    """STAC 1.0 catalog for organization plantation assets."""
    if user.organization_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="org_member_required")
    await assert_org_feature_enabled(db, user, "reports")
    org = await db.get(Organization, user.organization_id)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="organization_not_found")
    return await build_stac_catalog(db, organization=org, api_base=_api_base(request))


@router.get("/stac/projects/{project_id}/items")
async def stac_project_items(
    project_id: uuid.UUID,
    request: Request,
    user: CurrentUser,
    db: DB,
) -> dict[str, Any]:
    """STAC FeatureCollection of work-area NDVI items for a planting project."""
    if user.organization_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="org_member_required")
    await assert_org_feature_enabled(db, user, "reports")
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    return await build_project_stac_items(db, project=project, api_base=_api_base(request))


@router.get("/projects/{project_id}/features")
async def ogc_project_features(
    project_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
    feature_type: Annotated[str, Query(pattern="^(trees|work_areas|all)$")] = "all",
    limit: Annotated[int, Query(ge=1, le=5000)] = 2000,
) -> dict[str, Any]:
    """OGC API Features-style GeoJSON FeatureCollection for trees and work areas."""
    if user.organization_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="org_member_required")
    await assert_org_feature_enabled(db, user, "reports")
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    features: list[dict[str, Any]] = []
    if feature_type in ("work_areas", "all"):
        fences = list(
            (
                await db.execute(
                    select(PlantationFence).where(PlantationFence.project_id == project.id)
                )
            ).scalars().all()
        )
        features.extend(_feature_from_fence(f) for f in fences)

    if feature_type in ("trees", "all"):
        remaining = max(0, limit - len(features))
        trees = list(
            (
                await db.execute(
                    select(Tree)
                    .where(Tree.project_id == project.id, Tree.status != "removed")
                    .limit(remaining)
                )
            ).scalars().all()
        )
        features.extend(_feature_from_tree(t) for t in trees)

    return {
        "type": "FeatureCollection",
        "name": project.code,
        "features": features[:limit],
        "numberMatched": len(features),
        "numberReturned": min(len(features), limit),
    }
