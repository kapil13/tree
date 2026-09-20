"""Server-side attestation policy for Estate Watch P1."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_cycle import AuditCycle
from app.models.audit_engagement import AuditEngagement
from app.models.audit_finality import AuditPolicyEvaluation
from app.services.audit_attestation.review import anomaly_review_queue

POLICY_VERSION = "1.0"


async def evaluate_attestation_policy(
    db: AsyncSession,
    engagement: AuditEngagement,
    cycle: AuditCycle,
    *,
    evaluated_by_user_id: uuid.UUID | None = None,
    persist: bool = True,
) -> dict[str, Any]:
    blocking: list[str] = []
    warnings: list[str] = []

    meta = engagement.metadata_ or {}
    if not meta.get("export_bundle_sha256"):
        blocking.append("export_not_generated")

    if cycle.status not in {"export_ready", "under_review"}:
        blocking.append("cycle_not_ready_for_attestation")

    queue = await anomaly_review_queue(db, engagement.id)
    if queue["pending_review_count"] > 0:
        blocking.append("pending_anomaly_reviews")

    if engagement.status not in {"export_ready", "under_review"}:
        blocking.append("engagement_not_ready_for_attestation")

    result = "pass" if not blocking else "blocked"
    payload = {
        "policy_version": POLICY_VERSION,
        "result": result,
        "blocking_items": blocking,
        "warnings": warnings,
        "waivers": [],
        "evaluated_at": datetime.now(UTC).isoformat(),
    }

    if persist:
        row = AuditPolicyEvaluation(
            cycle_id=cycle.id,
            engagement_id=engagement.id,
            policy_version=POLICY_VERSION,
            result=result,
            blocking_items=blocking,
            warnings=warnings,
            waivers=[],
            evaluated_at=datetime.now(UTC),
            evaluated_by_user_id=evaluated_by_user_id,
        )
        db.add(row)
        await db.flush()
        payload["evaluation_id"] = str(row.id)

    return payload


def assert_policy_allows_attestation(evaluation: dict[str, Any]) -> None:
    if evaluation["result"] != "pass":
        blocking = evaluation.get("blocking_items") or []
        if "pending_anomaly_reviews" in blocking:
            raise ValueError("pending_anomaly_reviews")
        if "export_not_generated" in blocking:
            raise ValueError("export_not_generated")
        if "cycle_not_ready_for_attestation" in blocking:
            raise ValueError("audit_cycle_not_ready_for_attestation")
        raise ValueError("attestation_policy_blocked")
