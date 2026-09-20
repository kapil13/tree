"""Persist export package records (Wave A / P11 partial)."""

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
from app.models.audit_export_entity import AuditExport, AuditExportFile
from app.services.audit_export.context import EXPORT_VERSION
from app.services.evidence.signing import EvidenceSignature


def content_manifest_hash(files: list[dict[str, Any]]) -> str:
    payload = [{"path": f["path"], "sha256": f["sha256"], "size_bytes": f["size_bytes"]} for f in files]
    raw = json.dumps(payload, sort_keys=True).encode()
    return hashlib.sha256(raw).hexdigest()


async def persist_audit_export(
    db: AsyncSession,
    *,
    engagement: AuditEngagement,
    cycle: AuditCycle,
    manifest_files: list[dict[str, Any]],
    unsigned_bundle_hash: str,
    package_sha256: str,
    zip_size_bytes: int,
    created_by_user_id: uuid.UUID | None,
    signature: EvidenceSignature | None,
    bundle_manifest: dict[str, Any],
) -> AuditExport:
    prior = (
        await db.execute(
            select(AuditExport)
            .where(
                AuditExport.cycle_id == cycle.id,
                AuditExport.status == "generated",
            )
            .order_by(AuditExport.generated_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    manifest_hash = content_manifest_hash(manifest_files)
    export = AuditExport(
        cycle_id=cycle.id,
        engagement_id=engagement.id,
        status="generated",
        export_version=EXPORT_VERSION,
        methodology_version=cycle.methodology_version,
        content_manifest_hash=manifest_hash,
        unsigned_bundle_hash=unsigned_bundle_hash,
        package_sha256=package_sha256,
        file_count=len(manifest_files),
        zip_size_bytes=zip_size_bytes,
        signature_key_id=signature.key_id if signature else None,
        manifest_json=bundle_manifest,
        generated_at=datetime.now(UTC),
        created_by_user_id=created_by_user_id,
    )
    db.add(export)
    await db.flush()

    for entry in manifest_files:
        db.add(
            AuditExportFile(
                export_id=export.id,
                path=entry["path"],
                sha256=entry["sha256"],
                size_bytes=int(entry.get("size_bytes") or 0),
            )
        )

    if prior is not None and prior.id != export.id:
        prior.status = "superseded"
        prior.superseded_by_export_id = export.id

    await db.flush()
    return export
