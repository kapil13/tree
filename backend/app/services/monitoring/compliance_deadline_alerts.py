"""Compliance deadline reminders — approaching and overdue alerts."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.compliance_checklist import ProjectChecklistResponse
from app.models.planting_compliance_violation import PlantingComplianceViolation
from app.models.planting_project import PlantingProject
from app.models.user import User
from app.services.monitoring.alert_engine import create_monitoring_alert

log = get_logger("monitoring.compliance_deadlines")

VIOLATION_RESOLVE_DAYS = 7
CHECKLIST_DEFAULT_DAYS = 90
REMINDER_DAYS = (7, 3, 1, 0)


def _days_until(due_at: datetime) -> int:
    now = datetime.now(UTC)
    return (due_at.date() - now.date()).days


def _reminder_tier(days_until: int) -> str | None:
    if days_until < 0:
        return "overdue"
    if days_until in REMINDER_DAYS:
        return f"d{days_until}"
    return None


async def _alert_violation_deadline(
    db: AsyncSession,
    *,
    user: User,
    project: PlantingProject,
    violation: PlantingComplianceViolation,
    due_at: datetime,
    tier: str,
) -> bool:
    days = _days_until(due_at)
    overdue = days < 0
    kind = "compliance_deadline_overdue" if overdue else "compliance_deadline_approaching"
    severity = "high" if overdue or violation.severity == "block" else "medium"
    when = f"{abs(days)} day{'s' if abs(days) != 1 else ''}"
    title = (
        f"Compliance overdue — {project.name}"
        if overdue
        else f"Compliance due in {when} — {project.name}"
    )
    message = (
        f"{violation.message[:300]} "
        f"({'Overdue' if overdue else f'Due in {when}'} — resolve by "
        f"{due_at.date().isoformat()}.)"
    )
    alert = await create_monitoring_alert(
        db,
        user=user,
        kind=kind,
        severity=severity,
        title=title,
        message=message,
        payload={
            "deadline_id": str(violation.id),
            "deadline_type": "violation_resolve",
            "project_id": str(project.id),
            "violation_id": str(violation.id),
            "due_at": due_at.isoformat(),
            "reminder_tier": tier,
            "days_until": days,
        },
        prefs_key="compliance",
        dedupe_hours=20,
        dedupe_keys=("deadline_id", "reminder_tier"),
    )
    return alert is not None


async def _alert_checklist_deadline(
    db: AsyncSession,
    *,
    user: User,
    project: PlantingProject,
    checklist: ProjectChecklistResponse,
    due_at: datetime,
    tier: str,
) -> bool:
    days = _days_until(due_at)
    overdue = days < 0
    kind = "compliance_deadline_overdue" if overdue else "compliance_deadline_approaching"
    severity = "medium" if not overdue else "high"
    when = f"{abs(days)} day{'s' if abs(days) != 1 else ''}"
    title = (
        f"Checklist overdue — {project.name} ({checklist.checklist_code})"
        if overdue
        else f"Checklist due in {when} — {project.name}"
    )
    message = (
        f"{checklist.checklist_code} checklist is {checklist.completion_pct:.0f}% complete "
        f"({checklist.eligibility_status}). "
        f"{'Overdue' if overdue else f'Target completion by {due_at.date().isoformat()}.'}"
    )
    alert = await create_monitoring_alert(
        db,
        user=user,
        kind=kind,
        severity=severity,
        title=title,
        message=message,
        payload={
            "deadline_id": f"{checklist.id}",
            "deadline_type": "checklist_complete",
            "project_id": str(project.id),
            "checklist_code": checklist.checklist_code,
            "due_at": due_at.isoformat(),
            "reminder_tier": tier,
            "days_until": days,
            "completion_pct": checklist.completion_pct,
        },
        prefs_key="compliance",
        dedupe_hours=20,
        dedupe_keys=("deadline_id", "reminder_tier"),
    )
    return alert is not None


async def scan_compliance_deadline_alerts(db: AsyncSession) -> dict[str, Any]:
    """Scan violations and incomplete checklists for approaching/overdue deadlines."""
    alerts_created = 0
    scanned = 0

    viol_res = await db.execute(
        select(PlantingComplianceViolation, PlantingProject)
        .join(PlantingProject, PlantingProject.id == PlantingComplianceViolation.project_id)
        .where(PlantingComplianceViolation.resolved_at.is_(None))
    )
    for violation, project in viol_res.all():
        scanned += 1
        due_at = violation.created_at + timedelta(days=VIOLATION_RESOLVE_DAYS)
        tier = _reminder_tier(_days_until(due_at))
        if tier is None:
            continue
        owner = await db.get(User, project.owner_user_id)
        if owner is None:
            continue
        if await _alert_violation_deadline(
            db, user=owner, project=project, violation=violation, due_at=due_at, tier=tier
        ):
            alerts_created += 1

    checklist_res = await db.execute(
        select(ProjectChecklistResponse, PlantingProject)
        .join(PlantingProject, PlantingProject.id == ProjectChecklistResponse.project_id)
        .where(ProjectChecklistResponse.eligibility_status.notin_(("eligible",)))
    )
    for checklist, project in checklist_res.all():
        if checklist.completion_pct >= 100:
            continue
        scanned += 1
        meta = project.metadata_ or {}
        audit_raw = meta.get("audit_target_date")
        if audit_raw:
            try:
                due_at = datetime.fromisoformat(str(audit_raw).replace("Z", "+00:00"))
                if due_at.tzinfo is None:
                    due_at = due_at.replace(tzinfo=UTC)
            except ValueError:
                due_at = project.created_at + timedelta(days=CHECKLIST_DEFAULT_DAYS)
        else:
            due_at = project.created_at + timedelta(days=CHECKLIST_DEFAULT_DAYS)

        tier = _reminder_tier(_days_until(due_at))
        if tier is None:
            continue
        owner = await db.get(User, project.owner_user_id)
        if owner is None:
            continue
        if await _alert_checklist_deadline(
            db, user=owner, project=project, checklist=checklist, due_at=due_at, tier=tier
        ):
            alerts_created += 1

    await db.commit()
    result = {"alerts_created": alerts_created, "items_scanned": scanned}
    log.info("compliance_deadline_scan.complete", **result)
    return result
