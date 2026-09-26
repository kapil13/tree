"""Project NPRT risk assessment persistence."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.planting_project import PlantingProject
from app.models.project_risk_assessment import ProjectRiskAssessment
from app.models.user import User
from app.schemas.project_risk import ProjectRiskAssessmentCreate, ProjectRiskAssessmentOut
from app.services.carbon.buffer import resolve_buffer_pct


async def latest_risk_assessment(
    db: AsyncSession, project_id: uuid.UUID
) -> ProjectRiskAssessment | None:
    res = await db.execute(
        select(ProjectRiskAssessment)
        .where(ProjectRiskAssessment.project_id == project_id)
        .order_by(ProjectRiskAssessment.assessed_at.desc())
        .limit(1)
    )
    return res.scalar_one_or_none()


async def create_risk_assessment(
    db: AsyncSession,
    *,
    project: PlantingProject,
    payload: ProjectRiskAssessmentCreate,
    assessor: User,
    methodology: str = "VERRA_VM0047",
) -> ProjectRiskAssessmentOut:
    factors = (
        payload.factors.model_dump(exclude_none=True)
        if hasattr(payload.factors, "model_dump")
        else dict(payload.factors or {})
    )
    buffer_pct = resolve_buffer_pct(
        methodology,  # type: ignore[arg-type]
        nprt_score=payload.nprt_score,
    )
    row = ProjectRiskAssessment(
        project_id=project.id,
        nprt_score=payload.nprt_score,
        buffer_pct=buffer_pct,
        assessed_at=datetime.now(UTC),
        assessor_id=assessor.id,
        factors=factors,
        notes=payload.notes,
    )
    db.add(row)
    await db.flush()
    return ProjectRiskAssessmentOut.model_validate(row)


async def list_risk_assessments(
    db: AsyncSession, project_id: uuid.UUID, *, limit: int = 20
) -> list[ProjectRiskAssessmentOut]:
    res = await db.execute(
        select(ProjectRiskAssessment)
        .where(ProjectRiskAssessment.project_id == project_id)
        .order_by(ProjectRiskAssessment.assessed_at.desc())
        .limit(limit)
    )
    return [ProjectRiskAssessmentOut.model_validate(r) for r in res.scalars().all()]


def buffer_pct_for_project(
    assessment: ProjectRiskAssessment | None,
    methodology: str,
) -> tuple[float, bool]:
    """Return (buffer_pct, from_nprt)."""
    if assessment is not None:
        return float(assessment.buffer_pct), True
    return resolve_buffer_pct(methodology), False  # type: ignore[arg-type]
