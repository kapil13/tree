"""Superadmin / platform admin API schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class AdminOverview(BaseModel):
    users_total: int
    users_active: int
    users_by_role: dict[str, int]
    organizations_total: int
    trees_total: int
    trees_by_status: dict[str, int]
    plantation_fences_total: int
    planting_projects_total: int
    bioacoustic_recordings_total: int
    compliance_violations_open: int
    module_rules_total: int
    audit_events_24h: int


class AdminUserOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    organization_id: UUID | None
    organization_name: str | None
    created_at: datetime
    updated_at: datetime


class AdminUserCreate(BaseModel):
    email: str
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1, max_length=255)
    role: str = Field(default="user")
    organization_id: UUID | None = None
    is_active: bool = True


class AdminUserUpdate(BaseModel):
    email: str | None = None
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    role: str | None = None
    organization_id: UUID | None = None
    is_active: bool | None = None


class AdminPasswordReset(BaseModel):
    new_password: str = Field(min_length=8)


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class AdminOrgOut(BaseModel):
    id: UUID
    name: str
    slug: str
    created_at: datetime
    user_count: int
    tree_count: int
    plantation_fence_count: int


class ModuleRuleOut(BaseModel):
    id: UUID
    module_key: str
    label: str
    description: str
    enabled: bool
    allowed_roles: list[str]
    config: dict[str, Any]
    updated_at: datetime


class ModuleRuleUpdate(BaseModel):
    enabled: bool | None = None
    allowed_roles: list[str] | None = None
    label: str | None = None
    description: str | None = None
    config: dict[str, Any] | None = None


class AuditLogOut(BaseModel):
    id: UUID
    actor_user_id: UUID | None
    actor_email: str | None
    action: str
    resource_type: str | None
    resource_id: UUID | None
    diff: dict[str, Any] | None
    ip: str | None
    created_at: datetime


class RolePermissionOut(BaseModel):
    role: str
    permissions: list[str]
    is_platform_admin: bool


class ModuleCatalogItem(BaseModel):
    module_key: str
    label: str
    description: str
    allowed_roles: list[str]
