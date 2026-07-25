"""Organization schemas."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class OrganizationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    type: str
    program_codes: list[str] = Field(default_factory=list)


class OrgMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: str
    org_role: str | None
    is_org_admin: bool
    is_active: bool
    phone: str | None = None
    created_at: datetime


class OrgInviteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str | None
    phone: str | None
    full_name: str
    org_role: str
    platform_role: str
    status: str
    invite_token: str
    expires_at: datetime
    created_at: datetime


class OrgMembersOut(BaseModel):
    organization: OrganizationOut
    members: list[OrgMemberOut]
    pending_invites: list[OrgInviteOut] = Field(default_factory=list)


class OrgMemberInviteCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=32)
    org_role: Literal["manager", "supervisor", "worker", "viewer"] = "worker"


class OrgMemberInviteResult(BaseModel):
    status: str
    member: OrgMemberOut | None = None
    invite: OrgInviteOut | None = None


class OrgMemberUpdate(BaseModel):
    org_role: Literal["manager", "supervisor", "worker", "viewer"] | None = None
    is_active: bool | None = None
    is_org_admin: bool | None = None


class OrgBulkInviteRow(BaseModel):
    full_name: str
    email: str | None = None
    phone: str | None = None
    org_role: Literal["manager", "supervisor", "worker", "viewer"] = "worker"


class OrgBulkInviteCreate(BaseModel):
    rows: list[OrgBulkInviteRow] = Field(min_length=1, max_length=500)


class OrgBulkInviteResult(BaseModel):
    added: int
    invited: int
    errors: int


class OrgInvitePreviewOut(BaseModel):
    organization_name: str
    org_role: str
    full_name: str
    email: str | None
    phone: str | None
    expires_at: datetime


class OrgInviteAccept(BaseModel):
    invite_token: str
    full_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    password: str | None = Field(default=None, min_length=12, max_length=128)
