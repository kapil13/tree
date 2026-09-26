"""Immutable verification snapshots for attested audit cycles."""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_cycle import AuditCycle
from app.models.audit_engagement import AuditEngagement
from app.models.audit_finality import AuditVerificationSnapshot
from app.models.planting_project import PlantingProject


def snapshot_hash(payload: dict[str, Any]) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode()).hexdigest()


async def get_verification_snapshot_by_digest(
    db: AsyncSession, digest: str
) -> AuditVerificationSnapshot | None:
    from app.models.audit_export_entity import AuditExport

    return (
        await db.execute(
            select(AuditVerificationSnapshot)
            .outerjoin(AuditExport, AuditVerificationSnapshot.export_id == AuditExport.id)
            .where(
                (AuditVerificationSnapshot.attestation_hash == digest)
                | (AuditVerificationSnapshot.snapshot_hash == digest)
                | (AuditVerificationSnapshot.export_hash == digest)
                | (AuditExport.package_sha256 == digest)
                | (AuditExport.unsigned_bundle_hash == digest)
                | (AuditExport.content_manifest_hash == digest)
            )
        )
    ).scalar_one_or_none()


async def create_verification_snapshot(
    db: AsyncSession,
    *,
    engagement: AuditEngagement,
    cycle: AuditCycle,
    project: PlantingProject,
    attestation_hash: str,
    export_hash: str | None,
    content_manifest_hash: str | None,
    snapshot_body: dict[str, Any],
    export_id: uuid.UUID | None = None,
) -> AuditVerificationSnapshot:
    core = {
        k: v
        for k, v in snapshot_body.items()
        if k not in ("generated_at", "disclaimer", "snapshot_sha256")
    }
    body_hash = snapshot_hash(core)
    row = AuditVerificationSnapshot(
        cycle_id=cycle.id,
        engagement_id=engagement.id,
        attestation_hash=attestation_hash,
        export_hash=export_hash,
        export_id=export_id,
        content_manifest_hash=content_manifest_hash,
        snapshot_json=snapshot_body,
        snapshot_hash=body_hash,
        captured_at=datetime.now(UTC),
    )
    db.add(row)
    await db.flush()
    return row
