"""Continuous re-audit cycle management for Estate Watch engagements."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_attestation import AuditAttestationSignature, AuditReviewerAttestation
from app.models.audit_engagement import AuditEngagement
from app.models.audit_sampling import AuditFieldPlot

_CYCLE_ARCHIVE_KEYS = (
    "attested_at",
    "attestation_hash",
    "attestation_verdict",
    "export_bundle_sha256",
    "exported_at",
    "public_verify_url",
    "signature_count",
)


def cycle_summary(engagement: AuditEngagement) -> dict[str, Any]:
    meta = engagement.metadata_ or {}
    return {
        "engagement_id": str(engagement.id),
        "current_cycle": int(meta.get("cycle_number", 1)),
        "status": engagement.status,
        "cycles": list(meta.get("audit_cycles", [])),
        "reaudit_started_at": meta.get("reaudit_started_at"),
    }


async def start_reaudit_cycle(
    db: AsyncSession,
    engagement: AuditEngagement,
    *,
    notes: str | None = None,
) -> dict[str, Any]:
    if engagement.status != "attested":
        raise ValueError("engagement_not_attested")

    meta = dict(engagement.metadata_ or {})
    cycles: list[dict[str, Any]] = list(meta.get("audit_cycles", []))
    cycle_number = int(meta.get("cycle_number", 1))

    cycles.append(
        {
            "cycle_number": cycle_number,
            "attested_at": meta.get("attested_at"),
            "attestation_hash": meta.get("attestation_hash"),
            "export_bundle_sha256": meta.get("export_bundle_sha256"),
            "verdict": meta.get("attestation_verdict"),
            "status": "attested",
            "archived_at": datetime.now(UTC).isoformat(),
            "notes": notes,
        }
    )

    next_cycle = cycle_number + 1
    meta["audit_cycles"] = cycles
    meta["cycle_number"] = next_cycle
    meta["reaudit_started_at"] = datetime.now(UTC).isoformat()
    for key in _CYCLE_ARCHIVE_KEYS:
        meta.pop(key, None)
    engagement.metadata_ = meta
    engagement.status = "analysis_ready"

    await db.execute(
        delete(AuditAttestationSignature).where(
            AuditAttestationSignature.engagement_id == engagement.id
        )
    )
    await db.execute(
        delete(AuditReviewerAttestation).where(
            AuditReviewerAttestation.engagement_id == engagement.id
        )
    )

    plots = (
        (
            await db.execute(
                select(AuditFieldPlot).where(AuditFieldPlot.engagement_id == engagement.id)
            )
        )
        .scalars()
        .all()
    )
    plots_reset = 0
    for plot in plots:
        if plot.status == "visited":
            plot.status = "planned"
            plots_reset += 1

    await db.flush()

    return {
        "engagement_id": str(engagement.id),
        "status": engagement.status,
        "current_cycle": next_cycle,
        "archived_cycles": len(cycles),
        "plots_reset": plots_reset,
        "message": "reaudit_cycle_started",
    }
