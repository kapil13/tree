"""ISRO Bhoonidhi STAC API client (NRSC Earth observation catalog)."""

from __future__ import annotations

import time
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx

from app.core.config import settings
from app.core.logging import get_logger
from app.services.geo import polygon_coordinates

log = get_logger("satellite.bhoonidhi")

# Collections useful for plantation / vegetation monitoring over India.
DEFAULT_VEGETATION_COLLECTIONS = [
    "ResourceSat-2A_LISS3_BOA",
    "ResourceSat-2_LISS3_BOA",
    "ResourceSat-2A_AWIFS_BOA",
    "EOS-06_OCM-LAC_L2C-NDVI",
    "EOS-06_OCM-LAC_NDVI_8day_360m",
    "Sentinel-1A_SAR-IW_GRD",
]


def has_bhoonidhi_credentials() -> bool:
    return bool(settings.bhoonidhi_user_id and settings.bhoonidhi_password)


def polygon_bbox_wgs84(geojson: dict[str, Any]) -> list[float]:
    """Return STAC bbox [west, south, east, north]."""
    ring = polygon_coordinates(geojson)
    lons = [pt[0] for pt in ring]
    lats = [pt[1] for pt in ring]
    return [min(lons), min(lats), max(lons), max(lats)]


class BhoonidhiClient:
    """JWT auth + STAC search + product download for Bhoonidhi API."""

    def __init__(
        self,
        *,
        user_id: str,
        password: str,
        api_base_url: str | None = None,
    ) -> None:
        self._user_id = user_id
        self._password = password
        self._base = (api_base_url or settings.bhoonidhi_api_url).rstrip("/")
        self._access_token: str | None = None
        self._refresh_token: str | None = None
        self._token_expires_at: float = 0.0

    def _auth_headers(self) -> dict[str, str]:
        if not self._access_token:
            raise RuntimeError("bhoonidhi_not_authenticated")
        return {"Authorization": f"Bearer {self._access_token}"}

    async def authenticate(self) -> None:
        url = f"{self._base}/auth/token"
        payload = {
            "userId": self._user_id,
            "password": self._password,
            "grant_type": "password",
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
        self._apply_token_response(data)

    async def _refresh_access_token(self) -> None:
        if not self._refresh_token:
            await self.authenticate()
            return
        url = f"{self._base}/auth/token"
        payload = {
            "userId": self._user_id,
            "refresh_token": self._refresh_token,
            "grant_type": "refresh_token",
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 401:
                await self.authenticate()
                return
            resp.raise_for_status()
            self._apply_token_response(resp.json())

    def _apply_token_response(self, data: dict[str, Any]) -> None:
        self._access_token = data.get("access_token")
        self._refresh_token = data.get("refresh_token", self._refresh_token)
        expires_in = int(data.get("expires_in") or 1200)
        self._token_expires_at = time.time() + expires_in

    async def _ensure_token(self) -> None:
        if not self._access_token or time.time() >= self._token_expires_at - 60:
            if self._refresh_token:
                await self._refresh_access_token()
            else:
                await self.authenticate()

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json_body: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
        retry_auth: bool = True,
    ) -> httpx.Response:
        await self._ensure_token()
        url = f"{self._base}{path}"
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.request(
                method,
                url,
                headers=self._auth_headers(),
                json=json_body,
                params=params,
            )
            if resp.status_code == 401 and retry_auth:
                await self.authenticate()
                resp = await client.request(
                    method,
                    url,
                    headers=self._auth_headers(),
                    json=json_body,
                    params=params,
                )
            return resp

    async def list_collections(self) -> dict[str, Any]:
        resp = await self._request("GET", "/data/collections")
        resp.raise_for_status()
        return resp.json()

    async def search_stac(self, body: dict[str, Any]) -> dict[str, Any]:
        resp = await self._request("POST", "/data/search", json_body=body)
        resp.raise_for_status()
        return resp.json()

    async def search_polygon(
        self,
        boundary_geojson: dict[str, Any],
        *,
        collections: list[str] | None = None,
        days_back: int = 90,
        limit: int = 20,
        online_only: bool = True,
    ) -> dict[str, Any]:
        end = datetime.now(UTC)
        start = end - timedelta(days=days_back)
        body: dict[str, Any] = {
            "collections": collections or list(DEFAULT_VEGETATION_COLLECTIONS),
            "datetime": f"{start.strftime('%Y-%m-%dT%H:%M:%SZ')}/{end.strftime('%Y-%m-%dT%H:%M:%SZ')}",
            "intersects": boundary_geojson,
            "limit": min(limit, 500),
            "bbox": polygon_bbox_wgs84(boundary_geojson),
        }
        if online_only:
            body["filter"] = {"args": [{"property": "Online"}, "Y"], "op": "eq"}
            body["filter-lang"] = "cql2-json"
        return await self.search_stac(body)

    def download_url(self, *, item_id: str, collection: str) -> str:
        from urllib.parse import urlencode

        qs = urlencode({"id": item_id, "collection": collection})
        return f"{self._base}/download?{qs}"

    async def logout(self) -> None:
        if not self._refresh_token:
            return
        url = f"{self._base}/auth/logout"
        async with httpx.AsyncClient(timeout=30.0) as client:
            await client.post(url, headers={"Authorization": f"Bearer {self._refresh_token}"})
        self._access_token = None
        self._refresh_token = None


def get_bhoonidhi_client() -> BhoonidhiClient:
    if not has_bhoonidhi_credentials():
        raise RuntimeError("bhoonidhi_credentials_missing")
    return BhoonidhiClient(
        user_id=settings.bhoonidhi_user_id or "",
        password=settings.bhoonidhi_password or "",
    )


def summarize_stac_features(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Flatten STAC features for API responses."""
    items: list[dict[str, Any]] = []
    for feat in payload.get("features") or []:
        props = feat.get("properties") or {}
        collection = feat.get("collection") or props.get("collection")
        item_id = feat.get("id")
        items.append(
            {
                "id": item_id,
                "collection": collection,
                "datetime": props.get("datetime") or props.get("start_datetime"),
                "geometry": feat.get("geometry"),
                "properties": props,
                "online": props.get("Online"),
            }
        )
    return items
