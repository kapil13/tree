"""Public verification link schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class VerificationLinkCreate(BaseModel):
    resource_type: str = Field(pattern="^(planting_project|tree)$")
    resource_id: uuid.UUID
    label: str = Field(default="", max_length=120)
    expires_in_days: int | None = Field(default=None, ge=1, le=365)


class VerificationLinkOut(BaseModel):
    id: uuid.UUID
    token: str
    resource_type: str
    resource_id: uuid.UUID
    label: str
    public_url: str
    expires_at: datetime | None
    revoked_at: datetime | None
    view_count: int
    last_viewed_at: datetime | None
    created_at: datetime
