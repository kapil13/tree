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
    phone: str | None = None
    email_verified_at: datetime | None = None
    sessions_invalidated_at: datetime | None = None
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
    password_confirm: str | None = Field(default=None, min_length=1)


class ImpersonateRequest(BaseModel):
    password: str = Field(min_length=1)
    reason: str | None = Field(default=None, max_length=500)
    read_only: bool = False


class StepUpPasswordRequest(BaseModel):
    password: str = Field(min_length=1)


class ResendVerificationRequest(BaseModel):
    password: str = Field(min_length=1)
    mark_verified: bool = False


class SupportActionOut(BaseModel):
    status: str = "ok"
    dev_hint: str | None = None


class UserPlatformGrantsOut(BaseModel):
    user_id: uuid.UUID
    role: str
    role_modules: dict[str, bool]
    user_grants: list[str]
    effective_access: dict[str, bool]


class UserPlatformGrantsUpdate(BaseModel):
    module_keys: list[str] = Field(default_factory=list)
    password: str = Field(min_length=1)


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
    owner_user_id: uuid.UUID | None = None
    reason: str | None = Field(default=None, max_length=500)
    revoke_member_sessions: bool = False
    password_confirm: str | None = Field(default=None, min_length=1)


class BulkUserActionRequest(BaseModel):
    user_ids: list[uuid.UUID] = Field(..., min_length=1, max_length=100)
    action: Literal["activate", "deactivate", "revoke_sessions"]
    password: str = Field(min_length=1)


class BulkOrgActionRequest(BaseModel):
    org_ids: list[uuid.UUID] = Field(..., min_length=1, max_length=50)
    is_active: bool
    reason: str | None = Field(default=None, max_length=500)
    revoke_member_sessions: bool = False
    password: str | None = Field(default=None, min_length=1)


class BulkActionResultOut(BaseModel):
    processed: int
    skipped: int = 0
    sessions_revoked: int = 0
    details: list[dict] = Field(default_factory=list)


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
    razorpay_order_id: str | None = None
    razorpay_payment_id: str | None = None
    paid_at: datetime | None = None
    created_at: datetime


class PaymentEventAdminOut(BaseModel):
    id: str
    event_type: str
    event_id: str
    created_at: datetime


class PaymentOrderDetailOut(PaymentOrderAdminOut):
    user_wallet_balance: int
    payment_events: list[PaymentEventAdminOut] = Field(default_factory=list)


class GrantCreditsRequest(BaseModel):
    credits: int = Field(..., ge=-1000, le=10000)
    reason: str = Field(..., min_length=3, max_length=500)
    password: str = Field(min_length=1)


class GrantCreditsOut(BaseModel):
    user_id: uuid.UUID
    credits_delta: int
    new_balance: int


class WebhookDeliveryAdminOut(BaseModel):
    id: uuid.UUID
    event_type: str
    status: str
    attempt_count: int
    error_message: str | None = None
    response_status: int | None = None
    created_at: datetime
    webhook_id: uuid.UUID
    webhook_label: str
    webhook_url: str
    organization_id: uuid.UUID
    organization_name: str


class PaymentWebhookEventOut(BaseModel):
    id: str
    event_id: str
    event_type: str
    provider: str
    created_at: datetime
    payload_preview: str


class TriggerJobRequest(BaseModel):
    job_name: str = Field(..., min_length=3, max_length=64)
    password: str = Field(min_length=1)


class JobTriggerOut(BaseModel):
    job_name: str
    celery_task_id: str | None = None
    status: str


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


class PlatformSatelliteHealthOut(BaseModel):
    generated_at: str
    status: str
    providers: dict
    scans: dict
    recent_jobs: list[dict]


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
    actor_email: str | None = None
    actor_full_name: str | None = None
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
    read_only: bool = False
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


class PublicGovernanceStatusOut(BaseModel):
    maintenance_mode: bool
    maintenance_message: str | None = None
    registration_enabled: bool


class GovernanceSettingsOut(BaseModel):
    maintenance_mode: bool
    maintenance_message: str
    registration_enabled: bool
    updated_at: datetime | None = None
    updated_by_user_id: uuid.UUID | None = None


class GovernanceSettingsUpdate(BaseModel):
    maintenance_mode: bool | None = None
    maintenance_message: str | None = Field(default=None, max_length=1000)
    registration_enabled: bool | None = None
    password: str = Field(min_length=1)


class OrgFeatureFlagOut(BaseModel):
    key: str
    label: str
    enabled: bool


class OrgFeatureFlagsOut(BaseModel):
    organization_id: uuid.UUID
    flags: list[OrgFeatureFlagOut]


class OrgFeatureFlagsUpdate(BaseModel):
    flags: dict[str, bool] = Field(default_factory=dict)
    password_confirm: str = Field(min_length=1)


class BulkProgramAccessReviewRequest(BaseModel):
    request_ids: list[uuid.UUID] = Field(..., min_length=1, max_length=50)
    action: Literal["approve", "reject"]
    admin_note: str | None = Field(default=None, max_length=2000)
    password: str = Field(min_length=1)
