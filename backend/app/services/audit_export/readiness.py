"""Export readiness checks for audit engagements."""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_confidence import AuditConfidenceAssessment
from app.models.audit_engagement import AuditEngagement, BoundaryVersion
from app.models.audit_risk import AuditRiskAssessment
from app.models.audit_sampling import AuditSamplingPlan


async def export_readiness(db: AsyncSession, engagement: AuditEngagement) -> dict[str, Any]:
    boundaries = (
        (
            await db.execute(
                select(BoundaryVersion).where(BoundaryVersion.engagement_id == engagement.id)
            )
        )
        .scalars()
        .all()
    )

    confidence_count = (
        (
            await db.execute(
                select(AuditConfidenceAssessment).where(
                    AuditConfidenceAssessment.engagement_id == engagement.id
                )
            )
        )
        .scalars()
        .all()
    )

    risk_count = (
        (
            await db.execute(
                select(AuditRiskAssessment).where(
                    AuditRiskAssessment.engagement_id == engagement.id
                )
            )
        )
        .scalars()
        .all()
    )

    plan = (
        await db.execute(
            select(AuditSamplingPlan).where(AuditSamplingPlan.engagement_id == engagement.id)
        )
    ).scalar_one_or_none()

    meta = engagement.metadata_ or {}
    sections = [
        {
            "id": "intake",
            "label": "Audit intake",
            "met": engagement.status not in {"draft"},
            "detail": None if engagement.status != "draft" else "Complete intake first",
        },
        {
            "id": "satellite",
            "label": "Satellite timeline",
            "met": engagement.status
            in {
                "analysis_ready",
                "confidence_mapped",
                "risk_assessed",
                "sampling_planned",
                "field_verified",
                "export_ready",
            },
            "detail": None,
        },
        {
            "id": "confidence",
            "label": "Confidence map",
            "met": len(confidence_count) > 0,
            "detail": None if confidence_count else "Compute confidence map",
        },
        {
            "id": "risk",
            "label": "Risk assessment",
            "met": len(risk_count) > 0,
            "detail": None if risk_count else "Run risk scan",
        },
        {
            "id": "sampling",
            "label": "Field sampling",
            "met": plan is not None and plan.total_plots > 0,
            "detail": None if plan and plan.total_plots else "Generate sampling plan",
        },
        {
            "id": "field_verification",
            "label": "Field verification",
            "met": engagement.status in {"field_verified", "export_ready"},
            "detail": None
            if engagement.status in {"field_verified", "export_ready"}
            else "Complete all plot visits",
        },
    ]

    ready = all(s["met"] for s in sections)
    exportable = engagement.status in {"field_verified", "export_ready"}

    return {
        "engagement_id": str(engagement.id),
        "status": engagement.status,
        "block_count": len(boundaries),
        "ready": ready,
        "exportable": exportable,
        "sections": sections,
        "last_export_sha256": meta.get("export_bundle_sha256"),
        "exported_at": meta.get("exported_at"),
    }
