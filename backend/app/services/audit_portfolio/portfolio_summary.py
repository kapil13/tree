"""Organization-level Estate Watch audit rollup for dashboards."""

from __future__ import annotations

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_engagement import AuditEngagement
from app.models.audit_sampling import AuditFieldPlot
from app.models.planting_project import PlantingProject
from app.services.planting_projects.access import project_list_filter

ENGAGEMENT_STATUSES = (
    "draft",
    "intake_complete",
    "analysis_ready",
    "confidence_mapped",
    "risk_assessed",
    "sampling_planned",
    "field_verified",
    "export_ready",
    "under_review",
    "attested",
)


async def build_audit_portfolio_summary(db: AsyncSession, user) -> dict[str, Any]:
    """Aggregate audit engagement status and field verification workload."""
    stmt = (
        select(PlantingProject, AuditEngagement)
        .outerjoin(AuditEngagement, AuditEngagement.project_id == PlantingProject.id)
        .where(PlantingProject.scheme_code.in_(tuple({"estate_monitoring"})))
        .order_by(PlantingProject.created_at.desc())
    )
    stmt = project_list_filter(user, stmt)
    rows = (await db.execute(stmt)).all()

    by_status: dict[str, int] = {status: 0 for status in ENGAGEMENT_STATUSES}
    by_status["no_engagement"] = 0
    by_segment: dict[str, int] = {}
    by_scheme: dict[str, int] = {}
    total_audit_plots_due = 0
    engagements_in_field = 0
    engagements_export_ready = 0
    engagements_attested = 0
    project_rows: list[dict[str, Any]] = []

    engagement_ids: list[Any] = []
    for project, engagement in rows:
        if project.scheme_code:
            by_scheme[project.scheme_code] = by_scheme.get(project.scheme_code, 0) + 1
        by_segment[project.segment] = by_segment.get(project.segment, 0) + 1

        status = engagement.status if engagement else "no_engagement"
        by_status[status] = by_status.get(status, 0) + 1

        plots_due = 0
        if engagement:
            engagement_ids.append(engagement.id)
            if engagement.status in {"sampling_planned", "field_verified"}:
                engagements_in_field += 1
            if engagement.status in {"export_ready", "under_review"}:
                engagements_export_ready += 1
            if engagement.status == "attested":
                engagements_attested += 1

        project_rows.append(
            {
                "id": str(project.id),
                "code": project.code,
                "name": project.name,
                "segment": project.segment,
                "scheme_code": project.scheme_code,
                "engagement_id": str(engagement.id) if engagement else None,
                "engagement_status": status,
                "audit_plots_due": plots_due,
            }
        )

    if engagement_ids:
        plot_counts = (
            await db.execute(
                select(AuditFieldPlot.engagement_id, func.count())
                .where(
                    AuditFieldPlot.engagement_id.in_(engagement_ids),
                    AuditFieldPlot.status != "visited",
                )
                .group_by(AuditFieldPlot.engagement_id)
            )
        ).all()
        due_by_engagement = {str(eid): int(count) for eid, count in plot_counts}
        for row in project_rows:
            eid = row.get("engagement_id")
            if eid:
                due = due_by_engagement.get(eid, 0)
                row["audit_plots_due"] = due
                total_audit_plots_due += due

    project_rows.sort(
        key=lambda row: (
            -row["audit_plots_due"],
            row["engagement_status"] not in {"sampling_planned", "field_verified"},
            row["name"],
        )
    )

    estate_count = len(rows)
    with_engagement = sum(1 for _, e in rows if e is not None)

    return {
        "estate_project_count": estate_count,
        "engagement_count": with_engagement,
        "audit_plots_due": total_audit_plots_due,
        "engagements_in_field": engagements_in_field,
        "engagements_export_ready": engagements_export_ready,
        "engagements_attested": engagements_attested,
        "by_status": {k: v for k, v in by_status.items() if v > 0},
        "by_segment": by_segment,
        "by_scheme": by_scheme,
        "projects": project_rows,
    }


async def count_audit_plots_due_for_projects(
    db: AsyncSession,
    project_ids: list[Any],
) -> dict[str, int]:
    """Return audit plots due keyed by project id string."""
    if not project_ids:
        return {}

    rows = (
        await db.execute(
            select(PlantingProject.id, func.count())
            .join(AuditEngagement, AuditEngagement.project_id == PlantingProject.id)
            .join(AuditFieldPlot, AuditFieldPlot.engagement_id == AuditEngagement.id)
            .where(
                PlantingProject.id.in_(project_ids),
                PlantingProject.scheme_code == "estate_monitoring",
                AuditFieldPlot.status != "visited",
            )
            .group_by(PlantingProject.id)
        )
    ).all()
    return {str(pid): int(count) for pid, count in rows}
