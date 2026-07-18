"""Survival survey / re-geotagging reminder alerts."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.alert import Alert
from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.models.user import User

log = get_logger("survival_survey")

DEFAULT_SURVEY_INTERVAL_DAYS = 30


def survey_interval_days(project: PlantingProject) -> int:
    meta = project.metadata_ or {}
    if meta.get("survey_interval_days") in (15, 30):
        return int(meta["survey_interval_days"])
    rules = meta.get("survey_interval_days")
    if rules in (15, 30):
        return int(rules)
    return DEFAULT_SURVEY_INTERVAL_DAYS


async def _recent_alert_exists(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    kind: str,
    within_days: int = 7,
) -> bool:
    since = datetime.now(UTC) - timedelta(days=within_days)
    res = await db.execute(
        select(Alert)
        .where(
            Alert.user_id == user_id,
            Alert.kind == kind,
            Alert.created_at >= since,
        )
        .order_by(Alert.created_at.desc())
        .limit(20)
    )
    pid = str(project_id)
    for alert in res.scalars().all():
        payload = alert.payload or {}
        if payload.get("project_id") == pid:
            return True
    return False


async def create_survival_survey_alerts(db: AsyncSession) -> dict[str, Any]:
    """Create re-geotagging / survival survey alerts for due projects."""
    now = datetime.now(UTC)
    created = 0
    projects_res = await db.execute(
        select(PlantingProject).where(PlantingProject.status.in_(("active", "planning")))
    )
    projects = list(projects_res.scalars().all())

    for project in projects:
        interval = survey_interval_days(project)
        cutoff = now - timedelta(days=interval)

        trees_res = await db.execute(
            select(Tree).where(
                Tree.project_id == project.id,
                Tree.status != "removed",
            )
        )
        trees = list(trees_res.scalars().all())
        if not trees:
            continue

        due_trees = [
            t
            for t in trees
            if (t.last_geotag_at or t.registered_at) <= cutoff
        ]
        if not due_trees:
            continue

        owner_res = await db.execute(select(User).where(User.id == project.owner_user_id))
        owner = owner_res.scalar_one_or_none()
        if owner is None:
            continue

        kind = "survival_survey_due"
        if await _recent_alert_exists(db, user_id=owner.id, project_id=project.id, kind=kind):
            continue

        title = f"Survival survey due — {project.name}"
        message = (
            f"{len(due_trees)} of {len(trees)} trees are due for re-geotagging "
            f"(every {interval} days). Verify live count, update GPS, and record survival status."
        )
        alert = Alert(
            user_id=owner.id,
            tree_id=None,
            kind=kind,
            severity="warning",
            title=title,
            message=message,
            channels=["in_app", "email"],
            delivered={"in_app": {"delivered": True}},
            payload={
                "project_id": str(project.id),
                "project_code": project.code,
                "survey_interval_days": interval,
                "trees_due": len(due_trees),
                "trees_total": len(trees),
                "due_tree_ids": [str(t.id) for t in due_trees[:50]],
            },
        )
        db.add(alert)
        created += 1

    if created:
        await db.commit()
    log.info("survival_survey.alerts_created", count=created)
    return {"alerts_created": created, "projects_checked": len(projects)}
