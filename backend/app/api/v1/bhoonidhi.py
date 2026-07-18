"""ISRO Bhoonidhi Earth observation catalog API."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, status

from app.api.v1.deps import CurrentUser, DB
from app.api.v1.plantation_fences import _load_fence
from app.core.config import settings
from app.schemas.bhoonidhi import (
    BhoonidhiFenceCatalogOut,
    BhoonidhiSceneOut,
    BhoonidhiSearchOut,
    BhoonidhiSearchRequest,
    BhoonidhiStatusOut,
)
from app.services.geo import geography_to_geojson_polygon
from app.services.satellite.bhoonidhi_client import (
    DEFAULT_VEGETATION_COLLECTIONS,
    get_bhoonidhi_client,
    has_bhoonidhi_credentials,
    summarize_stac_features,
)

router = APIRouter(prefix="/bhoonidhi", tags=["bhoonidhi"])


def _require_client():
    if not has_bhoonidhi_credentials():
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="bhoonidhi_credentials_missing",
        )
    try:
        return get_bhoonidhi_client()
    except Exception as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"bhoonidhi_unavailable: {exc}",
        ) from exc


@router.get("/status", response_model=BhoonidhiStatusOut)
async def bhoonidhi_status(user: CurrentUser) -> BhoonidhiStatusOut:
    """Whether Bhoonidhi API credentials are configured on the server."""
    configured = has_bhoonidhi_credentials()
    msg = (
        "Bhoonidhi STAC catalog ready. Ensure VPS public IP is whitelisted by NRSC."
        if configured
        else "Set BHOONIDHI_USER_ID and BHOONIDHI_PASSWORD. Register VPS IP at bhoonidhi@nrsc.gov.in."
    )
    return BhoonidhiStatusOut(
        configured=configured,
        api_url=settings.bhoonidhi_api_url,
        default_collections=list(DEFAULT_VEGETATION_COLLECTIONS),
        message=msg,
    )


@router.get("/collections")
async def list_collections(user: CurrentUser) -> dict:
    client = _require_client()
    try:
        return await client.list_collections()
    except Exception as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@router.post("/search", response_model=BhoonidhiSearchOut)
async def search_catalog(
    payload: BhoonidhiSearchRequest,
    user: CurrentUser,
) -> BhoonidhiSearchOut:
    client = _require_client()
    body: dict = {"limit": payload.limit}
    if payload.collections:
        body["collections"] = payload.collections
    if payload.datetime:
        body["datetime"] = payload.datetime
    if payload.bbox:
        body["bbox"] = payload.bbox
    if payload.intersects:
        body["intersects"] = payload.intersects
    if payload.online_only:
        body["filter"] = {"args": [{"property": "Online"}, "Y"], "op": "eq"}
        body["filter-lang"] = "cql2-json"

    try:
        raw = await client.search_stac(body)
    except Exception as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    return _to_search_out(raw, client)


@router.get("/plantation-fences/{fence_id}/catalog", response_model=BhoonidhiFenceCatalogOut)
async def fence_bhoonidhi_catalog(
    fence_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
    days_back: int = Query(90, ge=1, le=365),
    limit: int = Query(20, ge=1, le=100),
) -> BhoonidhiFenceCatalogOut:
    """Search Bhoonidhi STAC catalog for open satellite scenes overlapping a plantation fence."""
    fence = await _load_fence(fence_id, user, db)
    boundary = geography_to_geojson_polygon(fence.boundary)
    client = _require_client()
    try:
        raw = await client.search_polygon(
            boundary,
            days_back=days_back,
            limit=limit,
            online_only=True,
        )
    except Exception as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    search = _to_search_out(raw, client)
    return BhoonidhiFenceCatalogOut(
        fence_id=str(fence.id),
        fence_name=fence.name,
        search=search,
    )


def _to_search_out(raw: dict, client) -> BhoonidhiSearchOut:
    ctx = raw.get("context") or {}
    features = summarize_stac_features(raw)
    scenes: list[BhoonidhiSceneOut] = []
    for row in features:
        coll = row.get("collection")
        item_id = row.get("id")
        download_path = None
        if coll and item_id:
            download_path = client.download_url(item_id=item_id, collection=coll)
        scenes.append(
            BhoonidhiSceneOut(
                id=item_id or "",
                collection=coll,
                datetime=row.get("datetime"),
                online=row.get("online"),
                download_path=download_path,
                properties=row.get("properties") or {},
            )
        )
    return BhoonidhiSearchOut(
        returned=int(ctx.get("returned") or len(scenes)),
        limit=int(ctx.get("limit") or len(scenes)),
        scenes=scenes,
        raw_links=raw.get("links") or [],
    )
