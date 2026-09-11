"""Schemas for Estate Watch Phase 7 auditor attestation."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class AnomalyReviewCreate(BaseModel):
    disposition: Literal["uphold", "overturn", "defer"]
    rationale: str = Field(min_length=1, max_length=4000)


class AnomalyReviewOut(BaseModel):
    id: str
    anomaly_id: str
    disposition: str
    previous_status: str
    new_status: str
    rationale: str
    reviewed_at: datetime
    epistemic_label: str


class AnomalyReviewQueueOut(BaseModel):
    engagement_id: str
    anomaly_count: int
    pending_review_count: int
    items: list[dict[str, Any]] = Field(default_factory=list)


class AttestationSignCreate(BaseModel):
    verdict: Literal["approved", "rejected", "conditional"]
    summary: str = Field(min_length=1, max_length=2000)
    notes: str | None = None
    allow_pending_reviews: bool = False


class AttestationCosignCreate(BaseModel):
    notes: str | None = None


class AttestationSignatureOut(BaseModel):
    id: str
    role: str
    verdict: str
    summary: str
    notes: str | None = None
    signature_hash: str
    epistemic_label: str
    signed_at: datetime
    reviewer_id: str | None = None


class AttestationOut(BaseModel):
    id: str
    verdict: str
    summary: str
    notes: str | None = None
    status: str
    export_bundle_sha256: str | None = None
    attestation_hash: str | None = None
    epistemic_label: str
    signed_at: datetime | None = None
    reviewer_id: str | None = None


class AttestationSummaryOut(BaseModel):
    engagement_id: str
    status: str
    export_bundle_sha256: str | None = None
    attestation: AttestationOut | None = None
    signatures: list[AttestationSignatureOut] = Field(default_factory=list)
    required_signatures: int = 2
    pending_cosignatures: int = 0
    review_queue: AnomalyReviewQueueOut
    can_sign: bool
    can_cosign: bool = False
    public_verify_url: str | None = None
