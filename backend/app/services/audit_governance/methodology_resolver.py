"""Runtime methodology registry resolution (Wave D / P17–P21)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_engagement import AuditEngagement
from app.models.audit_methodology import AuditMethodology, AuditRuleVersion, AuditThresholdSet
from app.models.audit_methodology_governance import (
    AuditEngagementMethodologyOverride,
    AuditMethodologyChangeLog,
)
from app.services.audit_governance.methodology import (
    ESTATE_WATCH_METHODOLOGY_VERSION,
    RULE_VERSION_SEED,
    THRESHOLD_SET_SEED,
)


async def list_methodologies(db: AsyncSession) -> list[AuditMethodology]:
    return list(
        (
            await db.execute(
                select(AuditMethodology).order_by(AuditMethodology.version.asc())
            )
        ).scalars().all()
    )


async def get_methodology_bundle(
    db: AsyncSession,
    version: str,
) -> dict[str, Any] | None:
    methodology = await db.get(AuditMethodology, version)
    if methodology is None:
        return None

    rules = list(
        (
            await db.execute(
                select(AuditRuleVersion).where(AuditRuleVersion.methodology_version == version)
            )
        ).scalars().all()
    )
    thresholds = list(
        (
            await db.execute(
                select(AuditThresholdSet).where(AuditThresholdSet.methodology_version == version)
            )
        ).scalars().all()
    )

    return {
        "version": methodology.version,
        "name": methodology.name,
        "description": methodology.description,
        "status": methodology.status,
        "effective_from": methodology.effective_from.isoformat()
        if methodology.effective_from
        else None,
        "rules": [
            {
                "rule_code": r.rule_code,
                "version": r.version,
                "parameters": r.parameters,
            }
            for r in rules
        ],
        "threshold_sets": [
            {"name": t.name, "thresholds": t.thresholds} for t in thresholds
        ],
    }


async def resolve_engagement_methodology_version(
    db: AsyncSession,
    engagement: AuditEngagement,
) -> str:
    override = (
        await db.execute(
            select(AuditEngagementMethodologyOverride).where(
                AuditEngagementMethodologyOverride.engagement_id == engagement.id
            )
        )
    ).scalar_one_or_none()
    if override is not None:
        return override.methodology_version

    from app.services.audit_cycles.queries import get_cycle
    from app.services.audit_cycles.scope import resolve_read_cycle_id

    cycle_id = await resolve_read_cycle_id(db, engagement.id)
    if cycle_id is not None:
        cycle = await get_cycle(db, cycle_id)
        if cycle and cycle.methodology_version:
            return cycle.methodology_version

    return ESTATE_WATCH_METHODOLOGY_VERSION


async def resolve_thresholds(
    db: AsyncSession,
    *,
    engagement: AuditEngagement,
    set_name: str = "default",
) -> dict[str, Any]:
    version = await resolve_engagement_methodology_version(db, engagement)
    row = (
        await db.execute(
            select(AuditThresholdSet).where(
                AuditThresholdSet.methodology_version == version,
                AuditThresholdSet.name == set_name,
            )
        )
    ).scalar_one_or_none()

    thresholds: dict[str, Any] = {}
    if row is not None:
        thresholds.update(row.thresholds)
    else:
        for seed in THRESHOLD_SET_SEED:
            if seed["name"] == set_name:
                thresholds.update(seed["thresholds"])
                break

    override = (
        await db.execute(
            select(AuditEngagementMethodologyOverride).where(
                AuditEngagementMethodologyOverride.engagement_id == engagement.id
            )
        )
    ).scalar_one_or_none()
    if override and override.threshold_overrides:
        thresholds.update(override.threshold_overrides)

    return thresholds


async def bind_engagement_methodology(
    db: AsyncSession,
    *,
    engagement: AuditEngagement,
    methodology_version: str,
    threshold_overrides: dict[str, Any] | None = None,
    changed_by_user_id: uuid.UUID | None = None,
    reason: str = "",
) -> AuditEngagementMethodologyOverride:
    methodology = await db.get(AuditMethodology, methodology_version)
    if methodology is None:
        raise ValueError("methodology_not_found")

    from_version = await resolve_engagement_methodology_version(db, engagement)
    existing = (
        await db.execute(
            select(AuditEngagementMethodologyOverride).where(
                AuditEngagementMethodologyOverride.engagement_id == engagement.id
            )
        )
    ).scalar_one_or_none()

    now = datetime.now(UTC)
    if existing:
        existing.methodology_version = methodology_version
        if threshold_overrides is not None:
            existing.threshold_overrides = threshold_overrides
        row = existing
    else:
        row = AuditEngagementMethodologyOverride(
            engagement_id=engagement.id,
            methodology_version=methodology_version,
            threshold_overrides=threshold_overrides or {},
        )
        db.add(row)

    if from_version != methodology_version:
        db.add(
            AuditMethodologyChangeLog(
                engagement_id=engagement.id,
                from_version=from_version,
                to_version=methodology_version,
                reason=reason,
                changed_by_user_id=changed_by_user_id,
                changed_at=now,
            )
        )

    await db.flush()
    return row


async def list_methodology_change_log(
    db: AsyncSession,
    *,
    engagement_id: uuid.UUID,
    limit: int = 20,
) -> list[AuditMethodologyChangeLog]:
    return list(
        (
            await db.execute(
                select(AuditMethodologyChangeLog)
                .where(AuditMethodologyChangeLog.engagement_id == engagement_id)
                .order_by(AuditMethodologyChangeLog.changed_at.desc())
                .limit(limit)
            )
        ).scalars().all()
    )


def fallback_rule_parameters(rule_code: str) -> dict[str, Any]:
    for seed in RULE_VERSION_SEED:
        if seed["rule_code"] == rule_code:
            return dict(seed["parameters"])
    return {}
