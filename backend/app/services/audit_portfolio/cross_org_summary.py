"""Platform-admin cross-organization Estate Watch audit visibility."""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_engagement import AuditEngagement
from app.models.organization import Organization
from app.models.planting_project import PlantingProject


async def build_cross_org_audit_summary(db: AsyncSession, user) -> dict[str, Any]:
    if user.role != "admin":
        raise PermissionError("platform_admin_required")

    rows = (
        await db.execute(
            select(PlantingProject, AuditEngagement, Organization)
            .outerjoin(AuditEngagement, AuditEngagement.project_id == PlantingProject.id)
            .outerjoin(Organization, Organization.id == PlantingProject.organization_id)
            .where(PlantingProject.scheme_code == "estate_monitoring")
            .order_by(Organization.name.asc(), PlantingProject.name.asc())
        )
    ).all()

    by_org: dict[str, dict[str, Any]] = {}
    total_engagements = 0
    total_attested = 0
    total_in_field = 0

    for project, engagement, org in rows:
        org_id = str(org.id) if org else "unassigned"
        org_name = org.name if org else "Unassigned"
        bucket = by_org.setdefault(
            org_id,
            {
                "organization_id": org_id if org else None,
                "organization_name": org_name,
                "project_count": 0,
                "engagement_count": 0,
                "attested_count": 0,
                "in_field_count": 0,
                "projects": [],
            },
        )
        bucket["project_count"] += 1

        status = engagement.status if engagement else "no_engagement"
        if engagement:
            bucket["engagement_count"] += 1
            total_engagements += 1
            if status == "attested":
                bucket["attested_count"] += 1
                total_attested += 1
            if status in {"sampling_planned", "field_verified"}:
                bucket["in_field_count"] += 1
                total_in_field += 1

        meta = (engagement.metadata_ or {}) if engagement else {}
        bucket["projects"].append(
            {
                "id": str(project.id),
                "code": project.code,
                "name": project.name,
                "engagement_id": str(engagement.id) if engagement else None,
                "engagement_status": status,
                "cycle_number": int(meta.get("cycle_number", 1)) if engagement else 1,
            }
        )

    organizations = sorted(by_org.values(), key=lambda row: row["organization_name"])

    return {
        "organization_count": len(organizations),
        "engagement_count": total_engagements,
        "attested_count": total_attested,
        "in_field_count": total_in_field,
        "organizations": organizations,
    }
