from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PlantingProgramOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str
    description: str
    audience: str
    min_photos: int
    is_default: bool
    is_public: bool
    form_schema: dict[str, Any]
    enrolled: bool = False


class PlantingProgramListOut(BaseModel):
    items: list[PlantingProgramOut]
    enrolled_codes: list[str]


class UserProgramsUpdate(BaseModel):
    program_codes: list[str] = Field(default_factory=list, min_length=0)


class UserProgramsOut(BaseModel):
    enrolled: list[PlantingProgramOut]
    available: list[PlantingProgramOut]
