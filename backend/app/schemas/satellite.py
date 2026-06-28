from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SatelliteRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tree_id: uuid.UUID
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
    thumbnail_s3_key: str | None
    created_at: datetime


class NDVIPoint(BaseModel):
    ts: datetime
    ndvi: float
    provider: str | None = None


class SatelliteSeries(BaseModel):
    tree_id: uuid.UUID
    points: list[NDVIPoint]
    latest: SatelliteRecordOut | None
