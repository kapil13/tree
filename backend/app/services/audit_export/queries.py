"""Export record queries (Wave D / P11)."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_export_entity import AuditExport


async def list_exports_for_engagement(
    db: AsyncSession,
    *,
    engagement_id: uuid.UUID,
    limit: int = 20,
) -> list[AuditExport]:
    return list(
        (
            await db.execute(
                select(AuditExport)
                .where(AuditExport.engagement_id == engagement_id)
                .order_by(AuditExport.generated_at.desc())
                .limit(limit)
            )
        ).scalars().all()
    )


async def get_export_for_engagement(
    db: AsyncSession,
    *,
    engagement_id: uuid.UUID,
    export_id: uuid.UUID,
) -> AuditExport | None:
    return (
        await db.execute(
            select(AuditExport).where(
                AuditExport.id == export_id,
                AuditExport.engagement_id == engagement_id,
            )
        )
    ).scalar_one_or_none()


async def latest_export_for_engagement(
    db: AsyncSession,
    *,
    engagement_id: uuid.UUID,
) -> AuditExport | None:
    return (
        await db.execute(
            select(AuditExport)
            .where(AuditExport.engagement_id == engagement_id)
            .order_by(AuditExport.generated_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()


async def get_export_by_package_sha256(
    db: AsyncSession,
    package_sha256: str,
) -> AuditExport | None:
    return (
        await db.execute(
            select(AuditExport).where(AuditExport.package_sha256 == package_sha256).limit(1)
        )
    ).scalar_one_or_none()


def export_to_dict(row: AuditExport, *, include_files: bool = False) -> dict[str, Any]:
    payload = {
        "export_id": str(row.id),
        "cycle_id": str(row.cycle_id),
        "engagement_id": str(row.engagement_id),
        "status": row.status,
        "export_version": row.export_version,
        "methodology_version": row.methodology_version,
        "content_manifest_hash": row.content_manifest_hash,
        "unsigned_bundle_hash": row.unsigned_bundle_hash,
        "package_sha256": row.package_sha256,
        "file_count": row.file_count,
        "zip_size_bytes": row.zip_size_bytes,
        "signature_key_id": row.signature_key_id,
        "signed": row.signature_json is not None,
        "frozen_at": row.frozen_at.isoformat() if row.frozen_at else None,
        "generated_at": row.generated_at.isoformat() if row.generated_at else None,
    }
    if include_files and row.files:
        payload["files"] = [
            {"path": f.path, "sha256": f.sha256, "size_bytes": f.size_bytes} for f in row.files
        ]
    return payload
