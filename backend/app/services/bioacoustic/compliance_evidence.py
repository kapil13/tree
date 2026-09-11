"""Link bioacoustic recordings to compliance checklist evidence."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bioacoustic_compliance_evidence import BioacousticComplianceEvidence
from app.models.bioacoustic_recording import BioacousticRecording
from app.models.plantation_fence import PlantationFence
from app.services.bioacoustic.methodology import recording_export_blockers

BIO_CHECKLIST_ITEMS = frozenset({"ps6_biodiversity", "ses_biodiversity", "biodiversity_safeguards"})


async def link_recording_to_checklist(
    db: AsyncSession,
    *,
    recording: BioacousticRecording,
    project_id: uuid.UUID,
    checklist_code: str,
    checklist_item_id: str,
    linked_by_user_id: uuid.UUID,
    notes: str | None = None,
) -> BioacousticComplianceEvidence:
    if checklist_item_id not in BIO_CHECKLIST_ITEMS:
        raise ValueError("invalid_checklist_item")

    existing = (
        await db.execute(
            select(BioacousticComplianceEvidence).where(
                BioacousticComplianceEvidence.recording_id == recording.id,
                BioacousticComplianceEvidence.checklist_code == checklist_code,
                BioacousticComplianceEvidence.checklist_item_id == checklist_item_id,
            )
        )
    ).scalar_one_or_none()
    if existing:
        existing.notes = notes
        existing.linked_by_user_id = linked_by_user_id
        existing.linked_at = datetime.now(UTC)
        await db.flush()
        return existing

    row = BioacousticComplianceEvidence(
        recording_id=recording.id,
        project_id=project_id,
        checklist_code=checklist_code,
        checklist_item_id=checklist_item_id,
        linked_by_user_id=linked_by_user_id,
        linked_at=datetime.now(UTC),
        notes=notes,
    )
    db.add(row)
    await db.flush()
    return row


async def list_project_bioacoustic_evidence(
    db: AsyncSession,
    project_id: uuid.UUID,
    checklist_code: str | None = None,
) -> list[dict[str, Any]]:
    stmt = select(BioacousticComplianceEvidence).where(
        BioacousticComplianceEvidence.project_id == project_id
    )
    if checklist_code:
        stmt = stmt.where(BioacousticComplianceEvidence.checklist_code == checklist_code)
    rows = list((await db.execute(stmt.order_by(BioacousticComplianceEvidence.linked_at.desc()))).scalars().all())

    out: list[dict[str, Any]] = []
    for row in rows:
        rec = (
            await db.execute(
                select(BioacousticRecording).where(BioacousticRecording.id == row.recording_id)
            )
        ).scalar_one_or_none()
        blockers = recording_export_blockers(rec) if rec else ["not_found"]
        out.append(
            {
                "id": str(row.id),
                "recording_id": str(row.recording_id),
                "checklist_code": row.checklist_code,
                "checklist_item_id": row.checklist_item_id,
                "linked_at": row.linked_at.isoformat(),
                "notes": row.notes,
                "export_ready": len(blockers) == 0,
                "export_blockers": blockers,
                "recorded_at": rec.recorded_at.isoformat() if rec and rec.recorded_at else None,
                "accepted_species_count": rec.accepted_species_count if rec else None,
            }
        )
    return out


async def count_export_ready_evidence(db: AsyncSession, project_id: uuid.UUID) -> int:
    rows = list(
        (
            await db.execute(
                select(BioacousticComplianceEvidence).where(
                    BioacousticComplianceEvidence.project_id == project_id
                )
            )
        ).scalars().all()
    )
    count = 0
    for row in rows:
        rec = (
            await db.execute(
                select(BioacousticRecording).where(BioacousticRecording.id == row.recording_id)
            )
        ).scalar_one_or_none()
        if rec and not recording_export_blockers(rec):
            count += 1
    return count


async def resolve_project_for_recording(
    db: AsyncSession,
    recording: BioacousticRecording,
) -> uuid.UUID | None:
    if not recording.plantation_fence_id:
        return None
    fence = (
        await db.execute(
            select(PlantationFence).where(PlantationFence.id == recording.plantation_fence_id)
        )
    ).scalar_one_or_none()
    return fence.project_id if fence and fence.project_id else None
