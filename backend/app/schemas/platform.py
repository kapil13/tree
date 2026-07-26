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
    organization_name: str | None = None
    org_role: str | None = None
    is_org_admin: bool = False
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login_at: datetime | None
    enrolled_program_codes: list[str] = Field(default_factory=list)


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
    program_access_admin: bool
    billing_admin: bool
    ops_admin: bool


class PlatformOverviewOut(BaseModel):
    users: dict[str, int]
    organizations: dict[str, int]
    program_access: dict[str, int]


class OrganizationAdminOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    type: str
    is_active: bool
    member_count: int = 0
    created_at: datetime


class OrganizationAdminDetailOut(OrganizationAdminOut):
    owner_user_id: uuid.UUID | None = None
    project_count: int = 0


class OrganizationAdminUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    is_active: bool | None = None


class PermissionMatrixOut(BaseModel):
    permissions: list[str]
    roles: dict[str, list[str]]
