"""SAR alert → field verification tasks (compliance violations)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.planting_compliance_violation import PlantingComplianceViolation
from app.services.monitoring.sar_alert_links import parse_uuid

log = get_logger("monitoring.sar_field_tasks")

FIELD_VERIFICATION_TYPE = "sar_field_verification"
DEDUPE_DAYS = 7


async def _open_verification_exists(
    db: AsyncSession,
    *,
    work_area_id: uuid.UUID | None,
    tree_id: uuid.UUID | None,
    alert_kind: str,
) -> bool:
    since = datetime.now(UTC) - timedelta(days=DEDUPE_DAYS)
    stmt = select(PlantingComplianceViolation).where(
        PlantingComplianceViolation.violation_type == FIELD_VERIFICATION_TYPE,
        PlantingComplianceViolation.resolved_at.is_(None),
        PlantingComplianceViolation.created_at >= since,
    )
    if work_area_id:
        stmt = stmt.where(PlantingComplianceViolation.work_area_id == work_area_id)
    elif tree_id:
        stmt = stmt.where(PlantingComplianceViolation.tree_id == tree_id)
    else:
        return False
    res = await db.execute(stmt.limit(20))
    for row in res.scalars().all():
        meta = row.metadata_ or {}
        if meta.get("alert_kind") == alert_kind:
            return True
    return False


async def maybe_create_sar_field_verification(
    db: AsyncSession,
    *,
    project_id: str | uuid.UUID | None,
    work_area_id: str | uuid.UUID | None,
    tree_id: str | uuid.UUID | None,
    alert_kind: str,
    severity: str,
    message: str,
    fusion: dict[str, Any] | None = None,
) -> PlantingComplianceViolation | None:
    """Create an open field verification task for high-severity SAR alerts."""
    if severity not in {"high", "critical"}:
        return None

    pid = parse_uuid(project_id)
    wid = parse_uuid(work_area_id)
    tid = parse_uuid(tree_id)
    if wid is None and tid is None:
        return None

    if await _open_verification_exists(db, work_area_id=wid, tree_id=tid, alert_kind=alert_kind):
        return None

    score = (fusion or {}).get("forest_integrity_score")
    mode = (fusion or {}).get("monitoring_mode")
    violation = PlantingComplianceViolation(
        project_id=pid,
        work_area_id=wid,
        tree_id=tid,
        violation_type=FIELD_VERIFICATION_TYPE,
        severity=severity,
        message=message[:2000],
        metadata_={
            "alert_kind": alert_kind,
            "forest_integrity_score": score,
            "monitoring_mode": mode,
            "action": "field_verify_drainage_and_ground_conditions",
            "source": "sar_fusion_alert",
        },
    )
    db.add(violation)
    await db.flush()
    log.info(
        "sar_field_verification_created",
        violation_id=str(violation.id),
        work_area_id=str(wid) if wid else None,
        alert_kind=alert_kind,
    )
    return violation
