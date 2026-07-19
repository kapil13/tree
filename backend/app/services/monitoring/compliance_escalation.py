"""Escalate long-open compliance violations."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.planting_compliance_violation import PlantingComplianceViolation
from app.models.planting_project import PlantingProject
from app.models.user import User
from app.services.monitoring.alert_engine import create_monitoring_alert

log = get_logger("monitoring.compliance")

ESCALATION_DAYS = 7


async def create_compliance_escalation_alerts(db: AsyncSession) -> dict[str, Any]:
    cutoff = datetime.now(UTC) - timedelta(days=ESCALATION_DAYS)
    res = await db.execute(
        select(PlantingComplianceViolation, PlantingProject)
        .join(PlantingProject, PlantingProject.id == PlantingComplianceViolation.project_id)
        .where(
            PlantingComplianceViolation.resolved_at.is_(None),
            PlantingComplianceViolation.created_at <= cutoff,
        )
    )
    created = 0
    for violation, project in res.all():
        owner = await db.get(User, project.owner_user_id)
        if owner is None:
            continue
        alert = await create_monitoring_alert(
            db,
            user=owner,
            kind="compliance_open",
            severity="medium" if violation.severity != "block" else "high",
            title=f"Open compliance issue — {project.name}",
            message=violation.message[:500],
            payload={
                "violation_id": str(violation.id),
                "project_id": str(project.id),
                "violation_type": violation.violation_type,
                "tree_id": str(violation.tree_id) if violation.tree_id else None,
            },
            prefs_key="monitoring",
            dedupe_hours=168,
            dedupe_keys=("violation_id",),
        )
        if alert:
            created += 1
    await db.commit()
    log.info("compliance_escalation.complete", created=created)
    return {"alerts_created": created}
