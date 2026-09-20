"""Frozen export artifact storage (Wave D / P11)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_export_artifact import AuditExportArtifact
from app.models.audit_export_entity import AuditExport


async def store_export_artifact(
    db: AsyncSession,
    *,
    export: AuditExport,
    zip_bytes: bytes,
) -> AuditExportArtifact:
    now = datetime.now(UTC)
    existing = (
        await db.execute(
            select(AuditExportArtifact).where(AuditExportArtifact.export_id == export.id)
        )
    ).scalar_one_or_none()

    if existing:
        existing.zip_bytes = zip_bytes
        existing.stored_at = now
        artifact = existing
    else:
        artifact = AuditExportArtifact(
            export_id=export.id,
            zip_bytes=zip_bytes,
            stored_at=now,
        )
        db.add(artifact)

    export.frozen_at = now
    await db.flush()
    return artifact


async def get_export_artifact_bytes(
    db: AsyncSession,
    *,
    export_id: uuid.UUID,
) -> bytes | None:
    row = (
        await db.execute(
            select(AuditExportArtifact).where(AuditExportArtifact.export_id == export_id)
        )
    ).scalar_one_or_none()
    return row.zip_bytes if row is not None else None
