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


class PaymentOrderAdminOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    user_email: str
    user_full_name: str
    sku: str
    credits_granted: int
    amount_paise: int
    currency: str
    status: str
    paid_at: datetime | None = None
    created_at: datetime


class PlatformBillingSummaryOut(BaseModel):
    payments_enabled: bool
    orders: dict[str, int]
    revenue_paise: int
    credits_sold: int
    wallets: dict[str, int]


class PlatformOpsSummaryOut(BaseModel):
    status: str
    workers: dict
    integrations: dict
    jobs: dict


class OrgMemberAdminOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: str
    org_role: str | None = None
    is_org_admin: bool = False
    is_active: bool
    last_login_at: datetime | None = None
    created_at: datetime


class OrgProjectAdminOut(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    status: str
    segment: str
    program_code: str | None = None
    created_at: datetime


class PlatformAuditLogOut(BaseModel):
    id: uuid.UUID
    actor_user_id: uuid.UUID | None
    organization_id: uuid.UUID | None
    action: str
    resource_type: str | None
    resource_id: uuid.UUID | None
    ip: str | None
    user_agent: str | None
    diff: dict | None = None
    created_at: datetime


class PlatformSettingsOut(BaseModel):
    app_env: str
    app_version: str
    payments_enabled: bool
    captcha_enabled: bool
    sms_auth_configured: bool
    google_oauth_configured: bool
    razorpay_configured: bool
    sentinel_configured: bool
    bhoonidhi_configured: bool
    bioacoustic_pipeline: str
    bioacoustic_perch_enabled: bool
    iucn_configured: bool


class ImpersonationOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int
    impersonated_by_id: uuid.UUID
    impersonated_by_email: EmailStr
    target_user: UserAdminOut


class PlatformSchemeRowOut(BaseModel):
    scheme_code: str
    scheme_label: str
    ministry: str | None = None
    project_count: int
    tree_count: int
    kpi_targets: dict[str, float | int] = Field(default_factory=dict)


class PlatformSchemeSummaryOut(BaseModel):
    scheme_count: int
    tagged_project_count: int
    untagged_project_count: int
    by_scheme: list[PlatformSchemeRowOut]


class CampaApoImportResultOut(BaseModel):
    imported: int
    unmatched: list[str] = Field(default_factory=list)
    parse_errors: list[str] = Field(default_factory=list)
    applied: list[dict] = Field(default_factory=list)


class CampaApoImportRequest(BaseModel):
    csv_text: str = Field(..., min_length=10)
