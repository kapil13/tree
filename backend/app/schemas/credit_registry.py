"""Registry credit serial and claim schemas."""

from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, Field


class CreditSerialRetireRequest(BaseModel):
    beneficiary: str = Field(min_length=1, max_length=255)
    retirement_reason: str | None = None
    paris_article6: bool = False
    corresponding_adjustment_ref: str | None = None


class CreditTransferRequest(BaseModel):
    to_org_id: uuid.UUID
    notes: str | None = None


class TreeClaimCreate(BaseModel):
    tree_id: uuid.UUID
    scheme_code: str = Field(min_length=1, max_length=64)
    claim_type: str = "carbon"
    exclusive: bool = True
