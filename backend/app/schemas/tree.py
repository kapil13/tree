from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class TreeCreate(BaseModel):
    program_code: str = Field(default="byot", max_length=64)
    species_id: uuid.UUID | None = None
    species_text: str | None = Field(default=None, max_length=255)
    planted_at: date | None = None
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    altitude_m: float | None = None
    accuracy_m: float | None = Field(default=None, ge=0)
    plantation_id: uuid.UUID | None = Field(
        default=None, description="Work area (plantation fence) UUID"
    )
    work_area_id: uuid.UUID | None = Field(
        default=None, description="Alias for plantation_id"
    )
    photo_keys: list[str] = Field(default_factory=list, max_length=10)
    metadata: dict[str, Any] = Field(default_factory=dict)


class TreeUpdate(BaseModel):
    species_id: uuid.UUID | None = None
    species_text: str | None = None
    planted_at: date | None = None
    status: str | None = None
    metadata: dict[str, Any] | None = None


class TreeImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tree_id: uuid.UUID
    s3_key: str
    cdn_url: str | None
    is_primary: bool
    created_at: datetime


class TreeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    public_code: str
    owner_user_id: uuid.UUID
    organization_id: uuid.UUID | None
    program_id: uuid.UUID | None = None
    program_code: str | None = None
    species_id: uuid.UUID | None
    species_text: str | None
    status: str
    planted_at: date | None
    registered_at: datetime
    latitude: float | None = None
    longitude: float | None = None
    altitude_m: float | None
    accuracy_m: float | None
    current_height_m: float | None
    current_dbh_cm: float | None
    current_canopy_m: float | None
    current_health: str
    current_carbon_kg: float
    satellite_verified: bool
    last_analysis_at: datetime | None
    last_satellite_at: datetime | None
    metadata: dict[str, Any] = Field(default_factory=dict)
    images: list[TreeImageOut] = Field(default_factory=list)
    plantation_id: uuid.UUID | None = None
    project_id: uuid.UUID | None = None
    created_at: datetime


class TreeListItem(BaseModel):
    id: uuid.UUID
    public_code: str
    species_text: str | None
    current_health: str
    current_carbon_kg: float
    satellite_verified: bool
    latitude: float
    longitude: float
    created_at: datetime


class TreePassport(BaseModel):
    id: uuid.UUID
    public_code: str
    species: str | None
    latitude: float
    longitude: float
    planted_at: date | None
    health: str
    carbon_kg: float
    satellite_verified: bool
    qr_url: str
    passport_pdf_url: str
