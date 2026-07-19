"""Daily health roundup — trees at risk from health + satellite signals."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.tree import Tree
from app.models.user import User
from app.services.monitoring.alert_engine import create_monitoring_alert

log = get_logger("monitoring.health_roundup")

STALE_ANALYSIS_DAYS = 90


async def run_daily_health_roundup(db: AsyncSession) -> dict[str, Any]:
    cutoff = datetime.now(UTC) - timedelta(days=STALE_ANALYSIS_DAYS)
    res = await db.execute(
        select(Tree).where(Tree.status != "removed")
    )
    trees = list(res.scalars().all())
    at_risk_by_owner: dict[str, list[Tree]] = {}

    for tree in trees:
        stale = tree.last_analysis_at is None or tree.last_analysis_at <= cutoff
        poor_health = tree.current_health in ("poor", "critical", "dead")
        low_satellite = tree.satellite_verified is False and tree.last_satellite_at is not None
        if not (poor_health or stale or low_satellite):
            continue
        key = str(tree.owner_user_id)
        at_risk_by_owner.setdefault(key, []).append(tree)

    alerts_created = 0
    for _owner_id, owner_trees in at_risk_by_owner.items():
        if len(owner_trees) < 1:
            continue
        owner = await db.get(User, owner_trees[0].owner_user_id)
        if owner is None:
            continue
        poor = sum(1 for t in owner_trees if t.current_health in ("poor", "critical", "dead"))
        alert = await create_monitoring_alert(
            db,
            user=owner,
            kind="health_roundup",
            severity="medium" if poor < 3 else "high",
            title=f"Daily health roundup — {len(owner_trees)} trees need attention",
            message=(
                f"{len(owner_trees)} trees flagged: {poor} poor/critical health, "
                "stale analysis, or failed satellite presence. Review on the dashboard."
            ),
            payload={
                "tree_count": len(owner_trees),
                "poor_health_count": poor,
                "tree_ids": [str(t.id) for t in owner_trees[:20]],
                "roundup_date": datetime.now(UTC).strftime("%Y-%m-%d"),
            },
            prefs_key="monitoring",
            dedupe_hours=20,
            dedupe_keys=("roundup_date",),
        )
        if alert:
            alerts_created += 1

    await db.commit()
    result = {"owners_notified": alerts_created, "trees_flagged": sum(len(v) for v in at_risk_by_owner.values())}
    log.info("daily_health_roundup.complete", **result)
    return result
