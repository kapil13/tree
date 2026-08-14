from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

MeasurementMethod = Literal[
    "tape",
    "caliper",
    "clinometer",
    "photogrammetry",
    "ai_estimate",
    "visual_estimate",
]

MeasurementSource = Literal[
    "registration",
    "survival_survey",
    "field_survey",
    "import",
]


class TreeMeasurementCreate(BaseModel):
    measured_at: datetime | None = None
    source: MeasurementSource = "field_survey"
    method: MeasurementMethod = "tape"
    instrument: str | None = Field(default=None, max_length=64)
    dbh_cm: float | None = Field(default=None, ge=0, le=500)
    height_m: float | None = Field(default=None, ge=0, le=200)
    canopy_m: float | None = Field(default=None, ge=0, le=200)
    gps_accuracy_m: float | None = Field(default=None, ge=0)
    photo_key: str | None = Field(default=None, max_length=512)
    notes: str | None = Field(default=None, max_length=2000)
    uncertainty_dbh_pct: float | None = Field(default=None, ge=0, le=100)
    uncertainty_height_pct: float | None = Field(default=None, ge=0, le=100)


class TreeInitialMeasurement(BaseModel):
    """Optional metrics captured at tree registration."""

    dbh_cm: float | None = Field(default=None, ge=0, le=500)
    height_m: float | None = Field(default=None, ge=0, le=200)
    canopy_m: float | None = Field(default=None, ge=0, le=200)
    method: MeasurementMethod = "visual_estimate"
    instrument: str | None = Field(default=None, max_length=64)
    photo_key: str | None = Field(default=None, max_length=512)
    notes: str | None = Field(default=None, max_length=2000)


class TreeMeasurementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tree_id: uuid.UUID
    measured_at: datetime
    source: str
    method: str
    instrument: str | None
    measurer_id: uuid.UUID | None
    dbh_cm: float | None
    height_m: float | None
    canopy_m: float | None
    gps_accuracy_m: float | None
    photo_key: str | None
    notes: str | None
    uncertainty_dbh_pct: float | None
    uncertainty_height_pct: float | None
    created_at: datetime
