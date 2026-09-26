"""Threat / hazard map API schemas."""

from __future__ import annotations

import uuid

from pydantic import BaseModel, Field


class FireDetectionOut(BaseModel):
    latitude: float
    longitude: float
    confidence: str
    frp: float | None = None
    acq_date: str
    satellite: str
    brightness: float | None = None


class FenceFiresOut(BaseModel):
    fence_id: uuid.UUID
    fence_name: str
    centroid_lat: float
    centroid_lon: float
    radius_km: float
    days: int
    firms_configured: bool
    fire_count: int
    nearest_km: float | None = None
    risk_level: str
    detections: list[FireDetectionOut] = Field(default_factory=list)
