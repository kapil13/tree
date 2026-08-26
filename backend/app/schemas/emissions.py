"""Pydantic schemas for GHG emission sources and dispersion."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.plantation_fence import GeoJsonPolygon
from app.services.emissions.constants import GAS_TYPES, SOURCE_TYPES


class GeoJsonPoint(BaseModel):
    type: Literal["Point"] = "Point"
    coordinates: list[float]

    @field_validator("coordinates")
    @classmethod
    def _valid_point(cls, v: list[float]) -> list[float]:
        if len(v) != 2:
            raise ValueError("point needs [lng, lat]")
        lng, lat = v
        if not (-180 <= lng <= 180 and -90 <= lat <= 90):
            raise ValueError("invalid coordinates")
        return v


class EmissionSourceCreate(BaseModel):
    work_area_id: uuid.UUID
    name: str = Field(..., min_length=1, max_length=255)
    source_type: Literal[
        "landfill", "flare", "rice_paddy", "pipeline", "mine", "livestock", "compost", "other"
    ] = "other"
    gas_type: Literal["CH4", "CO2", "N2O", "NO2", "SO2"] = "CH4"
    geometry_kind: Literal["point", "area"] = "point"
    point: GeoJsonPoint | None = None
    area: GeoJsonPolygon | None = None
    emission_rate_g_s: float | None = Field(default=None, gt=0)
    annual_emission_tons: float | None = Field(default=None, gt=0)
    release_height_m: float = Field(default=2.0, ge=0, le=500)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _geometry_matches_kind(self) -> EmissionSourceCreate:
        if self.geometry_kind == "point" and self.point is None:
            raise ValueError("point geometry required for geometry_kind=point")
        if self.geometry_kind == "area" and self.area is None:
            raise ValueError("area geometry required for geometry_kind=area")
        if self.emission_rate_g_s is None and self.annual_emission_tons is None:
            raise ValueError("emission_rate_g_s or annual_emission_tons required")
        if self.source_type not in SOURCE_TYPES:
            raise ValueError("invalid source_type")
        if self.gas_type not in GAS_TYPES:
            raise ValueError("invalid gas_type")
        return self


class EmissionSourceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    source_type: Literal[
        "landfill", "flare", "rice_paddy", "pipeline", "mine", "livestock", "compost", "other"
    ] | None = None
    gas_type: Literal["CH4", "CO2", "N2O", "NO2", "SO2"] | None = None
    emission_rate_g_s: float | None = Field(default=None, gt=0)
    annual_emission_tons: float | None = Field(default=None, gt=0)
    release_height_m: float | None = Field(default=None, ge=0, le=500)
    status: Literal["active", "inactive"] | None = None
    metadata: dict[str, Any] | None = None


class EmissionSourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    work_area_id: uuid.UUID
    name: str
    source_type: str
    gas_type: str
    geometry_kind: str
    geometry: dict[str, Any]
    emission_rate_g_s: float | None
    annual_emission_tons: float | None
    release_height_m: float
    status: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class HourlyDispersionMet(BaseModel):
    time: datetime
    wind_speed_ms: float
    wind_direction_deg: float
    temperature_c: float | None = None
    stability_class: str


class DispersionMetOut(BaseModel):
    latitude: float
    longitude: float
    timezone: str
    provider: str
    era5_available: bool = False
    hours: list[HourlyDispersionMet] = Field(..., min_length=1)


class DispersionRunRequest(BaseModel):
    work_area_id: uuid.UUID
    emission_source_ids: list[uuid.UUID] = Field(..., min_length=1)
    duration_hours: int = Field(default=24, ge=1, le=72)
    downwind_km: float = Field(default=10.0, ge=0.5, le=50.0)
    crosswind_km: float = Field(default=2.0, ge=0.2, le=20.0)
    met_hour_index: int = Field(default=0, ge=0, le=71)


class PlumeContourOut(BaseModel):
    threshold_ug_m3: float
    geojson: dict[str, Any]


class DispersionRunOut(BaseModel):
    simulation_id: uuid.UUID
    project_id: uuid.UUID
    work_area_id: uuid.UUID
    gas_type: str
    emission_rate_g_s: float
    wind_speed_ms: float
    wind_direction_deg: float
    stability_class: str
    max_concentration_ug_m3: float
    downwind_km: float
    crosswind_km: float
    inside_boundary: dict[str, Any]
    downwind_impact: dict[str, Any]
    contours: list[PlumeContourOut]
    met_snapshot: DispersionMetOut
