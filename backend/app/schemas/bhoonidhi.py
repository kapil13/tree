from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class BhoonidhiStatusOut(BaseModel):
    configured: bool
    api_url: str
    ip_whitelist_required: bool = True
    registration_email: str = "bhoonidhi@nrsc.gov.in"
    default_collections: list[str] = Field(default_factory=list)
    message: str = ""


class BhoonidhiSearchRequest(BaseModel):
    collections: list[str] | None = None
    datetime: str | None = Field(
        None,
        description="RFC3339 range e.g. 2024-01-01T00:00:00Z/2024-12-31T23:59:59Z",
    )
    bbox: list[float] | None = Field(None, min_length=4, max_length=4)
    intersects: dict[str, Any] | None = None
    limit: int = Field(default=20, ge=1, le=500)
    online_only: bool = True


class BhoonidhiSceneOut(BaseModel):
    id: str
    collection: str | None = None
    datetime: str | None = None
    online: str | None = None
    download_path: str | None = None
    properties: dict[str, Any] = Field(default_factory=dict)


class BhoonidhiSearchOut(BaseModel):
    provider: str = "bhoonidhi"
    returned: int
    limit: int
    scenes: list[BhoonidhiSceneOut]
    raw_links: list[dict[str, Any]] = Field(default_factory=list)


class BhoonidhiFenceCatalogOut(BaseModel):
    fence_id: str
    fence_name: str
    search: BhoonidhiSearchOut
