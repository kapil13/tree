"""Organization-level compliance readiness rollup for dashboards."""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.planting_project import PlantingProject
from app.services.compliance.workflow import (
    SEGMENT_CHECKLIST_LABEL,
    _project_metrics,
    build_compliance_workflow,
)
from app.services.planting_projects.access import project_list_filter

SAFEGUARD_SIGNAL_KEYS = (
    "safeguards_gram_sabha",
    "safeguards_fpic",
    "safeguards_tenure_ref",
    "safeguards_stakeholder_log",
)


def _safeguard_gap_count(auto_signals: dict[str, str]) -> int:
    return sum(1 for key in SAFEGUARD_SIGNAL_KEYS if auto_signals.get(key) == "no")


async def build_compliance_portfolio_summary(db: AsyncSession, user) -> dict[str, Any]:
    """Aggregate compliance readiness, violations, and safeguards across accessible projects."""
    stmt = select(PlantingProject).order_by(PlantingProject.created_at.desc())
    stmt = project_list_filter(user, stmt)
    projects = list((await db.execute(stmt)).scalars().all())

    total_open_violations = 0
    total_blocking_violations = 0
    readiness_values: list[float] = []
    projects_with_safeguard_gaps = 0
    total_safeguard_gaps = 0
    projects_below_80 = 0
    project_rows: list[dict[str, Any]] = []

    for project in projects:
        metrics = await _project_metrics(db, project)
        workflow = await build_compliance_workflow(db, project)
        readiness_pct = float(workflow["progress"]["pct"])
        auto_signals = workflow.get("auto_signals") or {}
        safeguard_gaps = _safeguard_gap_count(auto_signals)

        open_v = int(metrics["open_violations"])
        blocking_v = int(metrics["blocking_violations"])
        total_open_violations += open_v
        total_blocking_violations += blocking_v
        readiness_values.append(readiness_pct)
        total_safeguard_gaps += safeguard_gaps
        if safeguard_gaps > 0:
            projects_with_safeguard_gaps += 1
        if readiness_pct < 80:
            projects_below_80 += 1

        recommended_code = workflow.get("recommended_checklist") or "esg_general"
        project_rows.append(
            {
                "id": str(project.id),
                "code": project.code,
                "name": project.name,
                "segment": project.segment,
                "compliance_mode": project.compliance_mode,
                "status": project.status,
                "readiness_pct": readiness_pct,
                "open_violations": open_v,
                "blocking_violations": blocking_v,
                "safeguard_gaps": safeguard_gaps,
                "recommended_checklist": recommended_code,
                "recommended_checklist_label": workflow.get("recommended_checklist_label")
                or SEGMENT_CHECKLIST_LABEL.get(recommended_code, recommended_code),
                "workflow_done": workflow["progress"]["done"],
                "workflow_total": workflow["progress"]["total"],
            }
        )

    project_rows.sort(
        key=lambda row: (
            -row["blocking_violations"],
            -row["open_violations"],
            row["readiness_pct"],
        )
    )

    avg_readiness = round(sum(readiness_values) / len(readiness_values), 1) if readiness_values else 0.0

    return {
        "project_count": len(projects),
        "open_violations": total_open_violations,
        "blocking_violations": total_blocking_violations,
        "avg_readiness_pct": avg_readiness,
        "projects_with_safeguard_gaps": projects_with_safeguard_gaps,
        "safeguard_gap_count": total_safeguard_gaps,
        "projects_below_80_readiness": projects_below_80,
        "report_links": [
            {"label": "BRSR", "tab": "brsr"},
            {"label": "ETF handoff", "tab": "etfHandoff"},
            {"label": "SBTi FLAG", "tab": "sbtiFlag"},
            {"label": "GBF indicators", "tab": "gbf"},
            {"label": "ISO 14064-1 org", "tab": "iso14064Org"},
        ],
        "projects": project_rows,
    }
