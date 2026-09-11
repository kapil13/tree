"""Reviewer attestation sign-off with multi-auditor co-sign."""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_attestation import (
    AuditAnomalyReview,
    AuditAttestationSignature,
    AuditReviewerAttestation,
)
from app.models.audit_engagement import AuditEngagement
from app.services.audit_attestation.review import anomaly_review_queue
from app.services.webhooks.audit_events import emit_audit_webhook

VALID_VERDICTS = {"approved", "rejected", "conditional"}
DEFAULT_REQUIRED_SIGNATURES = 2


def required_signatures(engagement: AuditEngagement) -> int:
    raw = (engagement.metadata_ or {}).get("required_signatures", DEFAULT_REQUIRED_SIGNATURES)
    try:
        count = int(raw)
    except (TypeError, ValueError):
        count = DEFAULT_REQUIRED_SIGNATURES
    return max(1, count)


def _signature_hash(
    *,
    engagement_id: uuid.UUID,
    export_sha: str | None,
    verdict: str,
    reviewer_id: uuid.UUID,
    role: str,
    summary: str,
    signed_at: datetime,
) -> str:
    payload = {
        "engagement_id": str(engagement_id),
        "export_bundle_sha256": export_sha,
        "verdict": verdict,
        "reviewer_id": str(reviewer_id),
        "role": role,
        "summary": summary,
        "signed_at": signed_at.isoformat(),
    }
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode()).hexdigest()


def _combined_attestation_hash(
    *,
    engagement_id: uuid.UUID,
    export_sha: str | None,
    verdict: str,
    summary: str,
    signature_hashes: list[str],
    signed_at: datetime,
) -> str:
    payload = {
        "engagement_id": str(engagement_id),
        "export_bundle_sha256": export_sha,
        "verdict": verdict,
        "summary": summary,
        "signature_hashes": sorted(signature_hashes),
        "finalized_at": signed_at.isoformat(),
    }
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode()).hexdigest()


async def _load_signatures(db: AsyncSession, engagement_id: uuid.UUID) -> list[AuditAttestationSignature]:
    return list(
        (
            await db.execute(
                select(AuditAttestationSignature)
                .where(AuditAttestationSignature.engagement_id == engagement_id)
                .order_by(AuditAttestationSignature.signed_at.asc())
            )
        )
        .scalars()
        .all()
    )


async def _finalize_attestation(
    db: AsyncSession,
    engagement: AuditEngagement,
    signatures: list[AuditAttestationSignature],
) -> AuditReviewerAttestation:
    lead = next((s for s in signatures if s.role == "lead"), signatures[0])
    export_sha = (engagement.metadata_ or {}).get("export_bundle_sha256")
    signed_at = datetime.now(UTC)

    reviews = (
        (
            await db.execute(
                select(AuditAnomalyReview).where(AuditAnomalyReview.engagement_id == engagement.id)
            )
        )
        .scalars()
        .all()
    )

    combined_hash = _combined_attestation_hash(
        engagement_id=engagement.id,
        export_sha=export_sha,
        verdict=lead.verdict,
        summary=lead.summary,
        signature_hashes=[s.signature_hash for s in signatures],
        signed_at=signed_at,
    )

    existing = (
        await db.execute(
            select(AuditReviewerAttestation).where(
                AuditReviewerAttestation.engagement_id == engagement.id
            )
        )
    ).scalar_one_or_none()

    if existing:
        row = existing
    else:
        row = AuditReviewerAttestation(engagement_id=engagement.id)
        db.add(row)

    row.reviewer_id = lead.reviewer_id
    row.verdict = lead.verdict
    row.summary = lead.summary
    row.notes = lead.notes
    row.export_bundle_sha256 = export_sha
    row.status = "signed"
    row.signed_at = signed_at
    row.attestation_hash = combined_hash

    engagement.status = "attested"
    meta = dict(engagement.metadata_ or {})
    meta["attested_at"] = signed_at.isoformat()
    meta["attestation_hash"] = combined_hash
    meta["attestation_verdict"] = lead.verdict
    meta["signature_count"] = len(signatures)
    from app.services.public_verification.audit import public_audit_verify_url

    meta["public_verify_url"] = public_audit_verify_url(combined_hash)
    engagement.metadata_ = meta
    await db.flush()

    await emit_audit_webhook(
        db,
        organization_id=engagement.organization_id,
        event_type="audit.attested",
        payload={
            "engagement_id": str(engagement.id),
            "project_id": str(engagement.project_id),
            "status": engagement.status,
            "verdict": lead.verdict,
            "attestation_hash": combined_hash,
            "export_bundle_sha256": export_sha,
            "signature_count": len(signatures),
            "review_ids": [str(r.id) for r in reviews],
        },
    )
    return row


async def sign_attestation(
    db: AsyncSession,
    engagement: AuditEngagement,
    *,
    reviewer_id: uuid.UUID,
    verdict: str,
    summary: str,
    notes: str | None = None,
    allow_pending_reviews: bool = False,
    role: str = "lead",
) -> AuditReviewerAttestation | AuditAttestationSignature:
    if engagement.status not in {"export_ready", "under_review"}:
        raise ValueError("export_not_ready")

    if verdict not in VALID_VERDICTS:
        raise ValueError("invalid_verdict")

    if role not in {"lead", "cosigner"}:
        raise ValueError("invalid_role")

    meta = engagement.metadata_ or {}
    export_sha = meta.get("export_bundle_sha256")
    if not export_sha:
        raise ValueError("export_not_generated")

    queue = await anomaly_review_queue(db, engagement.id)
    if queue["pending_review_count"] > 0 and not allow_pending_reviews:
        raise ValueError("pending_anomaly_reviews")

    signatures = await _load_signatures(db, engagement.id)
    if any(s.reviewer_id == reviewer_id for s in signatures):
        raise ValueError("already_signed")

    if role == "lead":
        if any(s.role == "lead" for s in signatures):
            raise ValueError("lead_already_signed")
    else:
        lead = next((s for s in signatures if s.role == "lead"), None)
        if lead is None:
            raise ValueError("lead_signature_required")
        verdict = lead.verdict
        summary = lead.summary

    existing_signed = (
        await db.execute(
            select(AuditReviewerAttestation).where(
                AuditReviewerAttestation.engagement_id == engagement.id,
                AuditReviewerAttestation.status == "signed",
            )
        )
    ).scalar_one_or_none()
    if engagement.status == "attested" or existing_signed is not None:
        raise ValueError("already_attested")

    signed_at = datetime.now(UTC)
    signature = AuditAttestationSignature(
        engagement_id=engagement.id,
        reviewer_id=reviewer_id,
        role=role,
        verdict=verdict,
        summary=summary,
        notes=notes,
        signed_at=signed_at,
        signature_hash=_signature_hash(
            engagement_id=engagement.id,
            export_sha=export_sha,
            verdict=verdict,
            reviewer_id=reviewer_id,
            role=role,
            summary=summary,
            signed_at=signed_at,
        ),
    )
    db.add(signature)
    signatures.append(signature)
    await db.flush()

    needed = required_signatures(engagement)
    if len(signatures) >= needed:
        return await _finalize_attestation(db, engagement, signatures)

    if role == "lead":
        engagement.status = "under_review"
        meta = dict(meta)
        meta["under_review_at"] = signed_at.isoformat()
        meta["pending_cosignatures"] = needed - len(signatures)
        engagement.metadata_ = meta
        await db.flush()

    return signature


async def cosign_attestation(
    db: AsyncSession,
    engagement: AuditEngagement,
    *,
    reviewer_id: uuid.UUID,
    notes: str | None = None,
) -> AuditReviewerAttestation | AuditAttestationSignature:
    signatures = await _load_signatures(db, engagement.id)
    lead = next((s for s in signatures if s.role == "lead"), None)
    if lead is None:
        raise ValueError("lead_signature_required")

    return await sign_attestation(
        db,
        engagement,
        reviewer_id=reviewer_id,
        verdict=lead.verdict,
        summary=lead.summary,
        notes=notes,
        role="cosigner",
    )


def _signature_dict(signature: AuditAttestationSignature) -> dict[str, Any]:
    return {
        "id": str(signature.id),
        "role": signature.role,
        "verdict": signature.verdict,
        "summary": signature.summary,
        "notes": signature.notes,
        "signature_hash": signature.signature_hash,
        "epistemic_label": signature.epistemic_label,
        "signed_at": signature.signed_at.isoformat(),
        "reviewer_id": str(signature.reviewer_id) if signature.reviewer_id else None,
    }


async def attestation_summary(
    db: AsyncSession,
    engagement: AuditEngagement,
    *,
    current_user_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    row = (
        await db.execute(
            select(AuditReviewerAttestation).where(
                AuditReviewerAttestation.engagement_id == engagement.id
            )
        )
    ).scalar_one_or_none()

    signatures = await _load_signatures(db, engagement.id)
    queue = await anomaly_review_queue(db, engagement.id)
    meta = engagement.metadata_ or {}
    needed = required_signatures(engagement)
    lead_signed = any(s.role == "lead" for s in signatures)
    user_signed = any(s.reviewer_id == current_user_id for s in signatures) if current_user_id else False

    attestation: dict[str, Any] | None = None
    if row and row.status == "signed":
        attestation = {
            "id": str(row.id),
            "verdict": row.verdict,
            "summary": row.summary,
            "notes": row.notes,
            "status": row.status,
            "export_bundle_sha256": row.export_bundle_sha256,
            "attestation_hash": row.attestation_hash,
            "epistemic_label": row.epistemic_label,
            "signed_at": row.signed_at.isoformat() if row.signed_at else None,
            "reviewer_id": str(row.reviewer_id) if row.reviewer_id else None,
        }

    public_verify_url = meta.get("public_verify_url")
    if not public_verify_url and attestation and attestation.get("attestation_hash"):
        from app.core.config import settings

        base = settings.app_frontend_url.rstrip("/")
        public_verify_url = f"{base}/verify/audit/{attestation['attestation_hash']}"

    return {
        "engagement_id": str(engagement.id),
        "status": engagement.status,
        "export_bundle_sha256": meta.get("export_bundle_sha256"),
        "attestation": attestation,
        "signatures": [_signature_dict(s) for s in signatures],
        "required_signatures": needed,
        "pending_cosignatures": max(0, needed - len(signatures)),
        "review_queue": queue,
        "can_sign": (
            engagement.status in {"export_ready", "under_review"}
            and not lead_signed
            and queue["pending_review_count"] == 0
            and (row is None or row.status != "signed")
        ),
        "can_cosign": (
            engagement.status == "under_review"
            and lead_signed
            and len(signatures) < needed
            and not user_signed
            and (row is None or row.status != "signed")
        ),
        "public_verify_url": public_verify_url,
    }
