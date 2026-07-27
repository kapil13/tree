from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


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
    org_profile: dict[str, Any] | None = None
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
    user_phone: str | None = None


class ProgramAccessRequestReview(BaseModel):
    action: str = Field(pattern="^(approve|reject)$")
    admin_note: str | None = Field(default=None, max_length=2000)
    organization_name: str | None = Field(default=None, max_length=255)
    organization_slug: str | None = Field(default=None, max_length=120)
    organization_id: uuid.UUID | None = None
    platform_role: Literal["government", "corporate", "ngo"] | None = None
    make_org_admin: bool = True


class OrgProfileSubmit(BaseModel):
    organization_name: str = Field(min_length=2, max_length=255)
    organization_type: Literal["government", "corporate", "ngo"]
    designation: str = Field(min_length=2, max_length=120)
    city: str = Field(min_length=2, max_length=120)
    state: str = Field(min_length=2, max_length=120)
    country: str = Field(default="IN", min_length=2, max_length=64)
    work_email: EmailStr | None = None
    contact_phone: str | None = Field(default=None, max_length=32)
    website: str | None = Field(default=None, max_length=255)
    registered_address: str | None = Field(default=None, max_length=500)
    registration_id: str | None = Field(default=None, max_length=64)
    department: str | None = Field(default=None, max_length=255)
    use_case_summary: str = Field(min_length=10, max_length=2000)
