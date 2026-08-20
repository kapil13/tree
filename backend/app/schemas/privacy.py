from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

ConsentPurpose = Literal["essential", "analytics", "marketing"]
DataRequestType = Literal["access", "correction", "erasure", "portability"]


class ConsentGrantRequest(BaseModel):
    purpose: ConsentPurpose
    policy_version: str = Field(default="2026-08-14", max_length=32)


class ConsentRecordOut(BaseModel):
    id: UUID
    purpose: str
    policy_version: str
    granted_at: datetime
    withdrawn_at: datetime | None
    active: bool

    model_config = {"from_attributes": True}


class DataSubjectRequestCreate(BaseModel):
    request_type: DataRequestType
    notes: str | None = Field(default=None, max_length=2000)


class DataSubjectRequestOut(BaseModel):
    id: UUID
    request_type: str
    status: str
    notes: str | None
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class GrievanceCreate(BaseModel):
    subject: str = Field(min_length=3, max_length=255)
    body: str = Field(min_length=10, max_length=8000)


class GrievanceOut(BaseModel):
    id: UUID
    subject: str
    body: str
    status: str
    resolution: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class DeleteAccountRequest(BaseModel):
    confirm_email: str
    reason: str | None = Field(default=None, max_length=500)


class PrivacySummaryOut(BaseModel):
    policy_version: str
    consents: list[ConsentRecordOut]
    data_requests: list[DataSubjectRequestOut]
    grievances: list[GrievanceOut]
