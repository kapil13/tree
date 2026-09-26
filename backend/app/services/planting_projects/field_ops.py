"""Org-level field operations summary for supervisors."""

from __future__ import annotations

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.planting_compliance_violation import PlantingComplianceViolation
from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.services.audit_portfolio.portfolio_summary import count_audit_plots_due_for_projects
from app.services.compliance.workflow import build_compliance_workflow
from app.services.planting_projects.access import list_accessible_project_ids, project_list_filter
from app.services.planting_projects.closure_milestones import compute_closure_milestones
from app.services.planting_projects.service import project_summary
from app.services.planting_projects.survival_survey import survival_due_summary

_TASK_TONE_BY_KIND = {
    "violation": "critical",
    "closure": "critical",
    "workflow": "warning",
    "audit": "warning",
    "survival": "warning",
    "project": "info",
}

_TASK_PRIORITY = {
    "violation": 10,
    "closure": 20,
    "workflow": 30,
    "audit": 40,
    "survival": 50,
    "project": 60,
}


def _task_tone(kind: str, *, severity: str | None = None) -> str:
    if kind == "violation" and severity in ("critical", "high", "block"):
        return "critical"
    return _TASK_TONE_BY_KIND.get(kind, "info")


async def build_field_ops_priority_tasks(
    db: AsyncSession,
    projects: list[PlantingProject],
    *,
    violation_feed: list[dict[str, Any]],
    audit_due_by_project: dict[str, int],
    project_rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Unified actionable task feed for field supervisors."""
    tasks: list[dict[str, Any]] = []
    row_by_id = {row["id"]: row for row in project_rows}

    for violation in violation_feed[:8]:
        severity = violation.get("severity")
        tree_id = violation.get("tree_id")
        project_id = violation.get("project_id")
        href = (
            f"/trees/{tree_id}"
            if tree_id
            else f"/projects/{project_id}/compliance?section=issues"
        )
        tasks.append(
            {
                "id": f"violation-{violation.get('id')}",
                "kind": "violation",
                "title": violation.get("project_name") or "Compliance violation",
                "detail": violation.get("message") or violation.get("violation_type") or "",
                "href": href,
                "tone": _task_tone("violation", severity=severity),
                "project_id": project_id,
                "priority": _TASK_PRIORITY["violation"],
            }
        )

    for row in project_rows:
        project_id = row["id"]
        audit_due = int(audit_due_by_project.get(project_id, 0))
        if audit_due > 0:
            tasks.append(
                {
                    "id": f"audit-{project_id}",
                    "kind": "audit",
                    "title": row.get("name") or row.get("code") or "Project",
                    "detail": (
                        f"{audit_due} audit plot visit"
                        f"{'s' if audit_due != 1 else ''} due"
                    ),
                    "href": "/field-ops?section=audit",
                    "tone": _task_tone("audit"),
                    "project_id": project_id,
                    "priority": _TASK_PRIORITY["audit"],
                }
            )

        survival_due = int(row.get("survival_due") or 0)
        if survival_due > 0:
            tasks.append(
                {
                    "id": f"survival-{project_id}",
                    "kind": "survival",
                    "title": row.get("name") or row.get("code") or "Project",
                    "detail": (
                        f"{survival_due} survival / geotag check"
                        f"{'s' if survival_due != 1 else ''} due"
                    ),
                    "href": f"/trees?project={project_id}&category=geotag_due",
                    "tone": _task_tone("survival"),
                    "project_id": project_id,
                    "priority": _TASK_PRIORITY["survival"],
                }
            )

        open_v = int(row.get("open_violations") or 0)
        if open_v > 0 and not any(
            t["kind"] == "violation" and t.get("project_id") == project_id for t in tasks
        ):
            tasks.append(
                {
                    "id": f"compliance-{project_id}",
                    "kind": "violation",
                    "title": row.get("name") or row.get("code") or "Project",
                    "detail": (
                        f"{open_v} open compliance violation"
                        f"{'s' if open_v != 1 else ''}"
                    ),
                    "href": f"/projects/{project_id}/compliance?section=issues",
                    "tone": _task_tone("violation"),
                    "project_id": project_id,
                    "priority": _TASK_PRIORITY["violation"] + 1,
                }
            )

    mining_projects = [p for p in projects if p.scheme_code == "mining_reclamation"][:6]
    for project in mining_projects:
        project_id = str(project.id)
        closure = await compute_closure_milestones(db, project)
        if not closure.get("applicable"):
            continue
        for alert in closure.get("alerts") or []:
            tasks.append(
                {
                    "id": f"closure-{project_id}-{alert.get('kind')}-{alert.get('phase_code')}",
                    "kind": "closure",
                    "title": row_by_id.get(project_id, {}).get("name") or project.name,
                    "detail": alert.get("message") or "Closure milestone attention needed",
                    "href": f"/projects/{project_id}",
                    "tone": _task_tone("closure"),
                    "project_id": project_id,
                    "priority": _TASK_PRIORITY["closure"],
                }
            )

    workflow_candidates = [
        p
        for p in projects
        if p.scheme_code == "mining_reclamation"
        or int(row_by_id.get(str(p.id), {}).get("open_violations") or 0) > 0
    ][:5]
    for project in workflow_candidates:
        project_id = str(project.id)
        workflow = await build_compliance_workflow(db, project)
        pending = [
            step
            for step in workflow.get("steps") or []
            if step.get("status") in ("pending", "partial") and not step.get("optional")
        ]
        if not pending:
            continue
        step = pending[0]
        tasks.append(
            {
                "id": f"workflow-{project_id}-{step.get('id')}",
                "kind": "workflow",
                "title": row_by_id.get(project_id, {}).get("name") or project.name,
                "detail": step.get("title") or "Compliance workflow step",
                "href": step.get("action_href") or f"/projects/{project_id}/compliance",
                "tone": _task_tone("workflow"),
                "project_id": project_id,
                "priority": _TASK_PRIORITY["workflow"],
            }
        )

    tasks.sort(key=lambda t: (t.get("priority", 99), t.get("title") or ""))
    return tasks[:25]


async def build_field_ops_summary(db: AsyncSession, user) -> dict[str, Any]:
    stmt = select(PlantingProject).order_by(PlantingProject.created_at.desc())
    stmt = project_list_filter(user, stmt)
    projects = list((await db.execute(stmt)).scalars().all())

    total_open_violations = 0
    total_survival_due = 0
    total_audit_plots_due = 0
    total_trees = 0
    by_segment: dict[str, int] = {}
    by_scheme: dict[str, int] = {}
    project_rows: list[dict[str, Any]] = []
    violation_feed: list[dict[str, Any]] = []

    for project in projects:
        summary = await project_summary(db, project)
        survival = await survival_due_summary(db, project=project)
        open_v = int(summary.get("open_violations") or 0)
        due = int(survival.get("trees_due") or 0)
        trees = int(summary.get("tree_count") or 0)
        total_open_violations += open_v
        total_survival_due += due
        total_trees += trees
        by_segment[project.segment] = by_segment.get(project.segment, 0) + 1
        if project.scheme_code:
            by_scheme[project.scheme_code] = by_scheme.get(project.scheme_code, 0) + 1
        project_rows.append(
            {
                "id": str(project.id),
                "code": project.code,
                "name": project.name,
                "segment": project.segment,
                "scheme_code": project.scheme_code,
                "compliance_mode": project.compliance_mode,
                "status": project.status,
                "open_violations": open_v,
                "survival_due": due,
                "tree_count": trees,
                "target_tree_count": project.target_tree_count,
                "progress_pct": summary.get("progress_pct"),
            }
        )

        if open_v:
            v_rows = (
                await db.execute(
                    select(PlantingComplianceViolation)
                    .where(
                        PlantingComplianceViolation.project_id == project.id,
                        PlantingComplianceViolation.resolved_at.is_(None),
                    )
                    .order_by(PlantingComplianceViolation.created_at.desc())
                    .limit(5)
                )
            ).scalars().all()
            for v in v_rows:
                violation_feed.append(
                    {
                        "id": str(v.id),
                        "project_id": str(project.id),
                        "project_code": project.code,
                        "project_name": project.name,
                        "segment": project.segment,
                        "violation_type": v.violation_type,
                        "severity": v.severity,
                        "message": v.message,
                        "tree_id": str(v.tree_id) if v.tree_id else None,
                        "created_at": v.created_at.isoformat() if v.created_at else None,
                    }
                )

    violation_feed.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    violation_feed = violation_feed[:25]

    audit_due_by_project = await count_audit_plots_due_for_projects(
        db, [project.id for project in projects]
    )
    for row in project_rows:
        due = audit_due_by_project.get(row["id"], 0)
        row["audit_plots_due"] = due
        total_audit_plots_due += due

    accessible = await list_accessible_project_ids(user, db)
    if accessible is not None:
        tree_total_stmt = select(func.count()).where(
            Tree.project_id.in_(accessible),
            Tree.status != "removed",
        )
    else:
        tree_total_stmt = select(func.count()).where(Tree.status != "removed")
    total_trees = int((await db.execute(tree_total_stmt)).scalar_one() or 0)

    priority_tasks = await build_field_ops_priority_tasks(
        db,
        projects,
        violation_feed=violation_feed,
        audit_due_by_project=audit_due_by_project,
        project_rows=project_rows,
    )

    return {
        "project_count": len(projects),
        "tree_count": total_trees,
        "open_violations": total_open_violations,
        "survival_due": total_survival_due,
        "audit_plots_due": total_audit_plots_due,
        "by_segment": by_segment,
        "by_scheme": by_scheme,
        "projects": project_rows,
        "recent_violations": violation_feed,
        "priority_tasks": priority_tasks,
    }
