"""Platform admin schemas — users and module access."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.security import Role

ASSIGNABLE_ROLES = tuple(r.value for r in Role)


class UserAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: str
    organization_id: uuid.UUID | None
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login_at: datetime | None


class UserRoleUpdate(BaseModel):
    role: Literal[
        "user",
        "farmer",
        "ngo",
        "corporate",
        "government",
        "field_worker",
        "field_supervisor",
        "admin",
    ]
    is_active: bool | None = None


class ModuleRuleOut(BaseModel):
    module_key: str
    label: str
    description: str
    enabled: bool
    allowed_roles: list[str]
    config: dict
    updated_at: str | None = None


class ModuleRuleUpdate(BaseModel):
    enabled: bool | None = None
    allowed_roles: list[str] | None = Field(default=None, max_length=20)


class PlatformAccessOut(BaseModel):
    website_cms: bool
    users_admin: bool
