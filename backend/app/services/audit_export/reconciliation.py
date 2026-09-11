"""Confidence vs field verification reconciliation for audit export."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_confidence import AuditConfidenceAssessment
from app.models.audit_engagement import BoundaryVersion
from app.services.audit_confidence.field_signals import (
    derive_field_grade,
    field_signals_by_boundary,
)


def _grades_aligned(confidence_grade: str, field_grade: str | None) -> bool:
    if field_grade is None:
        return False
    if confidence_grade == field_grade:
        return True
    adjacent = {
        ("green", "amber"),
        ("amber", "green"),
        ("amber", "red"),
        ("red", "amber"),
    }
    return (confidence_grade, field_grade) in adjacent


async def build_confidence_field_reconciliation(
    db: AsyncSession, engagement_id: uuid.UUID
) -> dict[str, Any]:
    assessments = (
        (
            await db.execute(
                select(AuditConfidenceAssessment).where(
                    AuditConfidenceAssessment.engagement_id == engagement_id
                )
            )
        )
        .scalars()
        .all()
    )
    boundaries = (
        (
            await db.execute(
                select(BoundaryVersion).where(BoundaryVersion.engagement_id == engagement_id)
            )
        )
        .scalars()
        .all()
    )
    name_map = {b.id: b.name for b in boundaries}
    field_by_boundary = await field_signals_by_boundary(db, engagement_id)

    blocks: list[dict[str, Any]] = []
    aligned_count = 0
    mismatch_count = 0
    no_field_count = 0

    for assessment in assessments:
        field = field_by_boundary.get(assessment.boundary_version_id, {})
        field_grade = field.get("field_grade")
        visit_count = field.get("visit_count", 0)
        aligned = _grades_aligned(assessment.confidence_grade, field_grade)

        if visit_count == 0:
            no_field_count += 1
            reconciliation = "no_field_data"
        elif aligned:
            aligned_count += 1
            reconciliation = "aligned"
        else:
            mismatch_count += 1
            reconciliation = "mismatch"

        blocks.append(
            {
                "boundary_version_id": str(assessment.boundary_version_id),
                "boundary_name": name_map.get(assessment.boundary_version_id),
                "confidence_grade": assessment.confidence_grade,
                "confidence_score": assessment.confidence_score,
                "field_grade": field_grade,
                "field_signal": field.get("field_signal"),
                "visit_count": visit_count,
                "tree_presence_counts": field.get("tree_presence_counts", {}),
                "outcome_counts": field.get("outcome_counts", {}),
                "reconciliation": reconciliation,
                "aligned": aligned if visit_count > 0 else None,
            }
        )

    for boundary_id, field in field_by_boundary.items():
        if any(a.boundary_version_id == boundary_id for a in assessments):
            continue
        field_grade, field_signal = derive_field_grade(
            visit_count=field.get("visit_count", 0),
            tree_presence_counts=field.get("tree_presence_counts", {}),
            outcome_counts=field.get("outcome_counts", {}),
        )
        blocks.append(
            {
                "boundary_version_id": str(boundary_id),
                "boundary_name": name_map.get(boundary_id),
                "confidence_grade": None,
                "confidence_score": None,
                "field_grade": field_grade,
                "field_signal": field_signal,
                "visit_count": field.get("visit_count", 0),
                "tree_presence_counts": field.get("tree_presence_counts", {}),
                "outcome_counts": field.get("outcome_counts", {}),
                "reconciliation": "confidence_missing",
                "aligned": None,
            }
        )

    return {
        "engagement_id": str(engagement_id),
        "block_count": len(blocks),
        "aligned_count": aligned_count,
        "mismatch_count": mismatch_count,
        "no_field_data_count": no_field_count,
        "blocks": blocks,
    }
