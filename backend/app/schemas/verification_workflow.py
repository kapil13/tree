"""Verifier sample workflow schemas."""

from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, Field


class VerificationSampleCreate(BaseModel):
    sample_pct: float = Field(ge=1, le=100)
    method: Literal["random", "stratified"] = "random"


class VerificationAttestRequest(BaseModel):
    status: Literal["approved", "rejected"]
    notes: str | None = None


class VerificationItemOut(BaseModel):
    id: uuid.UUID
    tree_id: uuid.UUID
    tree_public_code: str | None = None
    status: str
    verifier_id: uuid.UUID | None = None
    signed_at: str | None = None
    notes: str | None = None
    attestation_hash: str | None = None
