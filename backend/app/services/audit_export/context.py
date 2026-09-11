"""Assemble full audit engagement context for export."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_engagement import AuditEngagement
from app.models.planting_project import PlantingProject
from app.services.audit_confidence.compute import confidence_map_summary
from app.services.audit_intake.ops import engagement_detail
from app.services.audit_risk.queue import anomalies_summary, auditor_queue_summary
from app.services.audit_sampling.summary import sampling_plan_summary
from app.services.audit_satellite.timeline import satellite_timeline_summary

EXPORT_VERSION = "estate-watch-audit-1.0.0"

EPISTEMIC_DISCLAIMER = (
    "This export bundles CLAIM, OBSERVATION, and ESTIMATION artefacts from the "
    "Estate Watch audit engine. It supports third-party review preparation only — "
    "not certification, legal compliance, fraud findings, or carbon credit issuance."
)


def _json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    return value


async def build_audit_engagement_context(
    db: AsyncSession,
    engagement: AuditEngagement,
    project: PlantingProject,
) -> dict[str, Any]:
    intake = await engagement_detail(db, engagement, project)
    return {
        "export_version": EXPORT_VERSION,
        "generated_at": datetime.now(UTC).isoformat(),
        "epistemic_disclaimer": EPISTEMIC_DISCLAIMER,
        "project": {
            "id": str(project.id),
            "code": project.code,
            "name": project.name,
            "scheme_code": project.scheme_code,
        },
        "engagement": {
            "id": str(engagement.id),
            "status": engagement.status,
            "intake_completed_at": (
                engagement.intake_completed_at.isoformat()
                if engagement.intake_completed_at
                else None
            ),
            "metadata": engagement.metadata_ or {},
        },
        "intake": _json_safe(intake),
        "satellite": await satellite_timeline_summary(db, engagement.id),
        "confidence": await confidence_map_summary(db, engagement.id),
        "risk": {
            "queue": await auditor_queue_summary(db, engagement.id),
            "anomalies": await anomalies_summary(db, engagement.id),
        },
        "sampling": await sampling_plan_summary(db, engagement.id),
    }
