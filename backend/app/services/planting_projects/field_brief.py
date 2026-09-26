"""Aggregated field operations brief for web and mobile home screens."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert
from app.models.planting_project import PlantingProject
from app.services.audit_portfolio.field_plot_queue import build_audit_field_plot_queue
from app.services.planting_projects.access import project_list_filter
from app.services.planting_projects.field_ops import build_field_ops_summary
from app.services.plot_monitoring.ops import list_plots


async def build_field_brief(
    db: AsyncSession,
    user,
    *,
    project_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    summary = await build_field_ops_summary(db, user)

    projects = summary.get("projects") or []
    if project_id is not None:
        pid = str(project_id)
        projects = [p for p in projects if p.get("id") == pid]
        summary = {
            **summary,
            "project_count": len(projects),
            "open_violations": sum(int(p.get("open_violations") or 0) for p in projects),
            "survival_due": sum(int(p.get("survival_due") or 0) for p in projects),
            "tree_count": sum(int(p.get("tree_count") or 0) for p in projects),
            "projects": projects,
            "recent_violations": [
                v for v in summary.get("recent_violations") or [] if v.get("project_id") == pid
            ],
        }

    unread_stmt = (
        select(func.count())
        .select_from(Alert)
        .where(Alert.user_id == user.id, Alert.is_read.is_(False))
    )
    unread_alerts = int((await db.execute(unread_stmt)).scalar_one() or 0)

    plots_due = 0
    plots_due_preview: list[dict[str, Any]] = []
    stmt = select(PlantingProject.id, PlantingProject.name, PlantingProject.code)
    stmt = project_list_filter(user, stmt)
    if project_id is not None:
        stmt = stmt.where(PlantingProject.id == project_id)
    project_rows = (await db.execute(stmt)).all()
    for row in project_rows:
        plots = await list_plots(db, row.id)
        for plot in plots:
            if plot.get("status") == "visited":
                continue
            plots_due += 1
            if len(plots_due_preview) < 12:
                plots_due_preview.append(
                    {
                        "plot_id": plot.get("id"),
                        "plot_code": plot.get("plot_code"),
                        "project_id": str(row.id),
                        "project_name": row.name,
                        "status": plot.get("status"),
                    }
                )

    audit_queue = await build_audit_field_plot_queue(
        db, user, project_id=project_id, limit=12
    )
    audit_plots_due_preview = audit_queue.get("items") or []
    audit_plots_due = int(audit_queue.get("total_due") or 0)

    return {
        "project_count": summary.get("project_count", 0),
        "tree_count": summary.get("tree_count", 0),
        "open_violations": summary.get("open_violations", 0),
        "survival_due": summary.get("survival_due", 0),
        "unread_alerts": unread_alerts,
        "plots_due": plots_due,
        "audit_plots_due": audit_plots_due,
        "projects": projects,
        "recent_violations": summary.get("recent_violations") or [],
        "plots_due_preview": plots_due_preview,
        "audit_plots_due_preview": audit_plots_due_preview,
        "scoped_project_id": str(project_id) if project_id else None,
    }
