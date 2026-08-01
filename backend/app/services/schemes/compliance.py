"""Scheme compliance checklist seeding and resolution."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.compliance_checklist import ProjectChecklistResponse
from app.models.planting_project import PlantingProject
from app.services.compliance.checklists import get_checklist
from app.services.compliance.evaluator import build_auto_signals, score_checklist
from app.services.schemes.registry import get_scheme


def checklists_for_scheme(scheme_code: str | None) -> list[str]:
    if not scheme_code:
        return []
    scheme = get_scheme(scheme_code)
    if scheme is None:
        return []
    return list(scheme.get("checklist_codes") or [])


def checklists_for_project(project: PlantingProject) -> list[str]:
    codes = checklists_for_scheme(project.scheme_code)
    if codes:
        return codes
    from app.services.compliance.workflow import SEGMENT_RECOMMENDED_CHECKLIST

    fallback = SEGMENT_RECOMMENDED_CHECKLIST.get(project.segment, "esg_general")
    return [fallback]


async def seed_project_scheme_checklists(db: AsyncSession, project: PlantingProject) -> list[str]:
    """Create empty checklist response rows for scheme-required checklists."""
    seeded: list[str] = []
    for code in checklists_for_project(project):
        if get_checklist(code) is None:
            continue
        existing = (
            await db.execute(
                select(ProjectChecklistResponse).where(
                    ProjectChecklistResponse.project_id == project.id,
                    ProjectChecklistResponse.checklist_code == code,
                )
            )
        ).scalar_one_or_none()
        if existing is not None:
            continue
        auto_signals = await build_auto_signals(db, project)
        checklist = get_checklist(code)
        assert checklist is not None
        metrics = score_checklist(checklist, {}, auto_signals)
        row = ProjectChecklistResponse(
            project_id=project.id,
            organization_id=project.organization_id,
            checklist_code=code,
            responses={},
            completion_pct=metrics["completion_pct"],
            score_pct=metrics["score_pct"],
            eligibility_status=metrics["eligibility_status"],
        )
        db.add(row)
        seeded.append(code)
    if seeded:
        await db.flush()
    return seeded


async def notify_scheme_compliance_gaps(
    db: AsyncSession,
    project: PlantingProject,
    checklist_code: str,
    eligibility_status: str,
) -> None:
    """Enqueue webhook when scheme checklist shows compliance gaps."""
    if eligibility_status != "gaps_identified" or not project.organization_id:
        return
    from app.services.webhooks.dispatcher import enqueue_webhook_event

    scheme = get_scheme(project.scheme_code) if project.scheme_code else None
    await enqueue_webhook_event(
        db,
        organization_id=project.organization_id,
        event_type="compliance.scheme.gaps_identified",
        payload={
            "project_id": str(project.id),
            "project_code": project.code,
            "scheme_code": project.scheme_code,
            "scheme_label": scheme["label"] if scheme else None,
            "checklist_code": checklist_code,
            "eligibility_status": eligibility_status,
        },
    )
