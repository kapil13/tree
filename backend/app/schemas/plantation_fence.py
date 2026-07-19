from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class GeoJsonPolygon(BaseModel):
    type: str = "Polygon"
    coordinates: list[list[list[float]]]

    @field_validator("type")
    @classmethod
    def _type_polygon(cls, v: str) -> str:
        if v != "Polygon":
            raise ValueError("only Polygon geometry is supported")
        return v

    @field_validator("coordinates")
    @classmethod
    def _valid_ring(cls, v: list[list[list[float]]]) -> list[list[list[float]]]:
        if not v or not v[0]:
            raise ValueError("polygon must have at least one ring")
        ring = v[0]
        if len(ring) < 4:
            raise ValueError("polygon ring needs at least 4 positions")
        if len(ring) > 200:
            raise ValueError("polygon has too many vertices (max 200)")
        for lng, lat in ring:
            if not (-180 <= lng <= 180 and -90 <= lat <= 90):
                raise ValueError("invalid coordinates")
        first, last = ring[0], ring[-1]
        if first[0] != last[0] or first[1] != last[1]:
            ring = [*ring, first]
            v = [ring, *v[1:]]
        return v


class PlantationFenceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    boundary: GeoJsonPolygon


class PlantationFenceUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)


class PlantationFenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    organization_id: uuid.UUID | None
    owner_user_id: uuid.UUID
    boundary: GeoJsonPolygon
    area_ha: float | None
    last_satellite_at: datetime | None
    created_at: datetime
    updated_at: datetime
    ndvi_image_url: str | None = None
    latest_ndvi_mean: float | None = None


class PlantationFenceListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    area_ha: float | None
    last_satellite_at: datetime | None
    latest_ndvi_mean: float | None = None
    boundary: GeoJsonPolygon


class PlantationSatelliteRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    fence_id: uuid.UUID
    provider: str
    scene_id: str
    scene_acquired_at: datetime
    cloud_cover_pct: float | None
    ndvi_mean: float | None
    ndvi_max: float | None
    ndvi_min: float | None
    evi_mean: float | None
    presence_confirmed: bool | None
    change_vs_baseline: float | None
    created_at: datetime


class PlantationNDVIPoint(BaseModel):
    ts: datetime
    ndvi: float
    provider: str | None = None


class PlantationSatelliteSeries(BaseModel):
    fence_id: uuid.UUID
    points: list[PlantationNDVIPoint]
    latest: PlantationSatelliteRecordOut | None
    ndvi_image_url: str | None = None
