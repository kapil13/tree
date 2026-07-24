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


class ProgramAccessRequestCreate(BaseModel):
    program_code: str = Field(min_length=1, max_length=64)
    message: str | None = Field(default=None, max_length=2000)


class ProgramAccessRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    program_code: str
    program_name: str
    status: str
    message: str | None = None
    admin_note: str | None = None
    created_at: datetime
    reviewed_at: datetime | None = None


class UserProgramsOut(BaseModel):
    enrolled: list[PlantingProgramOut]
    available: list[PlantingProgramOut]
    access_requests: list[ProgramAccessRequestOut] = Field(default_factory=list)


class ProgramAccessRequestAdminOut(ProgramAccessRequestOut):
    user_id: uuid.UUID
    user_email: str
    user_full_name: str


class ProgramAccessRequestReview(BaseModel):
    action: str = Field(pattern="^(approve|reject)$")
    admin_note: str | None = Field(default=None, max_length=2000)
