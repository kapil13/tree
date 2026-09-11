"""Public verification payloads for Estate Watch audit engagements."""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.audit_attestation import AuditAttestationSignature, AuditReviewerAttestation
from app.models.audit_engagement import AuditEngagement
from app.models.planting_project import PlantingProject
from app.services.audit_export.reconciliation import build_confidence_field_reconciliation

DISCLAIMER = (
    "Public Estate Watch audit verification snapshot. "
    "Supports third-party review — not certification, legal compliance, or fraud findings."
)


def public_audit_verify_url(digest: str) -> str:
    base = settings.app_frontend_url.rstrip("/")
    return f"{base}/verify/audit/{digest}"


def _snapshot_hash(payload: dict[str, Any]) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode()).hexdigest()


async def build_audit_engagement_verification_payload(
    db: AsyncSession,
    engagement: AuditEngagement,
    project: PlantingProject,
) -> dict[str, Any]:
    attestation = (
        await db.execute(
            select(AuditReviewerAttestation).where(
                AuditReviewerAttestation.engagement_id == engagement.id
            )
        )
    ).scalar_one_or_none()

    signatures = (
        (
            await db.execute(
                select(AuditAttestationSignature)
                .where(AuditAttestationSignature.engagement_id == engagement.id)
                .order_by(AuditAttestationSignature.signed_at.asc())
            )
        )
        .scalars()
        .all()
    )

    reconciliation = await build_confidence_field_reconciliation(db, engagement.id)
    meta = engagement.metadata_ or {}

    core = {
        "resource_type": "audit_engagement",
        "project": {
            "id": str(project.id),
            "code": project.code,
            "name": project.name,
            "segment": project.segment,
            "scheme_code": project.scheme_code,
        },
        "engagement": {
            "id": str(engagement.id),
            "status": engagement.status,
            "export_bundle_sha256": meta.get("export_bundle_sha256"),
            "exported_at": meta.get("exported_at"),
            "attested_at": meta.get("attested_at"),
        },
        "attestation": (
            {
                "verdict": attestation.verdict,
                "summary": attestation.summary,
                "status": attestation.status,
                "attestation_hash": attestation.attestation_hash,
                "export_bundle_sha256": attestation.export_bundle_sha256,
                "signed_at": attestation.signed_at.isoformat() if attestation.signed_at else None,
            }
            if attestation and attestation.status == "signed"
            else None
        ),
        "signatures": [
            {
                "role": s.role,
                "verdict": s.verdict,
                "summary": s.summary,
                "signature_hash": s.signature_hash,
                "signed_at": s.signed_at.isoformat(),
            }
            for s in signatures
        ],
        "reconciliation": {
            "aligned_count": reconciliation.get("aligned_count", 0),
            "mismatch_count": reconciliation.get("mismatch_count", 0),
            "no_field_data_count": reconciliation.get("no_field_data_count", 0),
        },
        "generated_at": datetime.now(UTC).isoformat(),
        "disclaimer": DISCLAIMER,
    }
    core["snapshot_sha256"] = _snapshot_hash(
        {k: v for k, v in core.items() if k not in ("generated_at", "disclaimer")}
    )
    if attestation and attestation.attestation_hash:
        core["public_verify_url"] = public_audit_verify_url(attestation.attestation_hash)
    elif meta.get("export_bundle_sha256"):
        core["public_verify_url"] = public_audit_verify_url(meta["export_bundle_sha256"])
    return core


async def resolve_audit_verification_by_digest(
    db: AsyncSession, digest: str
) -> dict[str, Any]:
    if len(digest) != 64 or not all(c in "0123456789abcdef" for c in digest.lower()):
        raise ValueError("invalid_digest")

    attestation = (
        await db.execute(
            select(AuditReviewerAttestation).where(AuditReviewerAttestation.attestation_hash == digest)
        )
    ).scalar_one_or_none()

    engagement: AuditEngagement | None = None
    if attestation is not None:
        engagement = await db.get(AuditEngagement, attestation.engagement_id)
    else:
        res = await db.execute(
            select(AuditEngagement).where(
                AuditEngagement.metadata_["export_bundle_sha256"].astext == digest
            )
        )
        engagement = res.scalar_one_or_none()

    if engagement is None:
        sig = (
            await db.execute(
                select(AuditAttestationSignature).where(
                    AuditAttestationSignature.signature_hash == digest
                )
            )
        ).scalar_one_or_none()
        if sig is not None:
            engagement = await db.get(AuditEngagement, sig.engagement_id)

    if engagement is None:
        raise ValueError("record_not_found")

    project = await db.get(PlantingProject, engagement.project_id)
    if project is None:
        raise ValueError("resource_not_found")

    return await build_audit_engagement_verification_payload(db, engagement, project)
