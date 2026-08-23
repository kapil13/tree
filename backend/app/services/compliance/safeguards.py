"""Safeguards and tenure document management (Compliance Phase A)."""

from __future__ import annotations

import uuid
from typing import Any, Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project_safeguard_document import ProjectSafeguardDocument
from app.models.planting_project import PlantingProject

SafeguardDocType = Literal[
    "gram_sabha_resolution",
    "fpic_minutes",
    "patta_cfr_reference",
    "stakeholder_consultation_log",
]

ALLOWED_DOC_TYPES: frozenset[str] = frozenset(
    [
        "gram_sabha_resolution",
        "fpic_minutes",
        "patta_cfr_reference",
        "stakeholder_consultation_log",
    ]
)

DOC_TYPE_LABELS: dict[str, str] = {
    "gram_sabha_resolution": "Gram sabha resolution",
    "fpic_minutes": "FPIC / consultation minutes",
    "patta_cfr_reference": "Patta / CFR tenure reference",
    "stakeholder_consultation_log": "Stakeholder engagement log",
}


async def list_safeguard_documents(
    db: AsyncSession, project: PlantingProject
) -> list[dict[str, Any]]:
    rows = (
        await db.execute(
            select(ProjectSafeguardDocument)
            .where(ProjectSafeguardDocument.project_id == project.id)
            .order_by(ProjectSafeguardDocument.created_at.desc())
        )
    ).scalars().all()
    return [_serialize_doc(d) for d in rows]


def _serialize_doc(doc: ProjectSafeguardDocument) -> dict[str, Any]:
    return {
        "id": str(doc.id),
        "project_id": str(doc.project_id),
        "doc_type": doc.doc_type,
        "doc_type_label": DOC_TYPE_LABELS.get(doc.doc_type, doc.doc_type),
        "title": doc.title,
        "s3_key": doc.s3_key,
        "metadata": doc.doc_metadata or {},
        "uploaded_by_user_id": str(doc.uploaded_by_user_id) if doc.uploaded_by_user_id else None,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
    }


async def create_safeguard_document(
    db: AsyncSession,
    *,
    project: PlantingProject,
    doc_type: str,
    title: str,
    s3_key: str,
    uploaded_by_user_id: uuid.UUID | None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if doc_type not in ALLOWED_DOC_TYPES:
        raise ValueError("invalid_safeguard_doc_type")

    row = ProjectSafeguardDocument(
        project_id=project.id,
        organization_id=project.organization_id,
        doc_type=doc_type,
        title=title.strip() or DOC_TYPE_LABELS.get(doc_type, doc_type),
        s3_key=s3_key,
        doc_metadata=metadata or {},
        uploaded_by_user_id=uploaded_by_user_id,
    )
    db.add(row)
    await db.flush()
    return _serialize_doc(row)


async def delete_safeguard_document(
    db: AsyncSession, project: PlantingProject, document_id: uuid.UUID
) -> bool:
    row = (
        await db.execute(
            select(ProjectSafeguardDocument).where(
                ProjectSafeguardDocument.id == document_id,
                ProjectSafeguardDocument.project_id == project.id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        return False
    await db.delete(row)
    await db.flush()
    return True


async def safeguard_doc_types_present(
    db: AsyncSession, project_id: uuid.UUID
) -> set[str]:
    rows = (
        await db.execute(
            select(ProjectSafeguardDocument.doc_type).where(
                ProjectSafeguardDocument.project_id == project_id
            )
        )
    ).scalars().all()
    return set(rows)
