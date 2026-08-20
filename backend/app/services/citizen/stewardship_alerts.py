"""Citizen stewardship survival reminders for BYOT personal trees."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.alert import Alert
from app.models.tree import Tree
from app.models.tree_steward import TreeSteward
from app.models.user import User
from app.services.alerts.defaults import DEFAULT_SURVIVAL_SURVEY_PREFS
from app.services.alerts.service import dispatch_alert_channels
from app.services.citizen.adoption import CITIZEN_SURVEY_INTERVAL_DAYS

log = get_logger("citizen_stewardship")


def _citizen_survival_prefs(user: User) -> dict[str, Any]:
    from app.services.alerts.defaults import default_notification_preferences

    prefs = user.notification_preferences or default_notification_preferences()
    ss = prefs.get("survival_survey") or {}
    citizen = prefs.get("citizen_stewardship") or {}
    merged = {**DEFAULT_SURVIVAL_SURVEY_PREFS, **ss, **citizen}
    return merged


async def _recent_tree_alert(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    tree_id: uuid.UUID,
    within_days: int = 7,
) -> bool:
    since = datetime.now(UTC) - timedelta(days=within_days)
    res = await db.execute(
        select(Alert)
        .where(
            Alert.user_id == user_id,
            Alert.kind == "citizen_stewardship_due",
            Alert.created_at >= since,
        )
        .order_by(Alert.created_at.desc())
        .limit(20)
    )
    tid = str(tree_id)
    for alert in res.scalars().all():
        payload = alert.payload or {}
        if payload.get("tree_id") == tid:
            return True
    return False


async def create_citizen_stewardship_alerts(db: AsyncSession) -> dict[str, Any]:
    """Remind BYOT owners and adopters when personal trees need a check-in."""
    now = datetime.now(UTC)
    cutoff = now - timedelta(days=CITIZEN_SURVEY_INTERVAL_DAYS)
    created = 0

    trees_res = await db.execute(
        select(Tree).where(
            Tree.project_id.is_(None),
            Tree.status != "removed",
            or_(Tree.last_geotag_at.is_(None), Tree.last_geotag_at <= cutoff),
        )
    )
    due_trees = list(trees_res.scalars().all())
    if not due_trees:
        return {"alerts_created": 0, "trees_checked": 0}

    for tree in due_trees:
        recipients: dict[uuid.UUID, str] = {tree.owner_user_id: "owner"}
        stewards = (
            await db.execute(select(TreeSteward).where(TreeSteward.tree_id == tree.id))
        ).scalars().all()
        for steward in stewards:
            recipients[steward.user_id] = steward.role

        label = tree.species_text or tree.public_code
        for user_id, role in recipients.items():
            if await _recent_tree_alert(db, user_id=user_id, tree_id=tree.id):
                continue
            user = await db.get(User, user_id)
            if user is None or not user.is_active:
                continue
            prefs = _citizen_survival_prefs(user)
            if not prefs.get("enabled", True):
                continue

            title = f"Stewardship check-in due — {label}"
            message = (
                f"Your {'tree' if role == 'owner' else 'adopted tree'} {tree.public_code} "
                f"needs a survival check-in. Open the app to verify it is still alive and update GPS."
            )
            channels = ["in_app"]
            for ch in prefs.get("channels", ["in_app", "push"]):
                if ch not in channels:
                    channels.append(ch)

            payload = {
                "tree_id": str(tree.id),
                "public_code": tree.public_code,
                "relationship": role,
                "deep_link": f"/trees/{tree.id}/survival",
            }
            alert = Alert(
                user_id=user.id,
                tree_id=tree.id,
                kind="citizen_stewardship_due",
                severity="info",
                title=title,
                message=message,
                channels=channels,
                delivered={},
                payload=payload,
            )
            db.add(alert)
            await db.flush()
            alert.delivered = await dispatch_alert_channels(
                user,
                channels,
                title=title,
                message=message,
                push_data=payload,
            )
            created += 1

    if created:
        await db.commit()
    log.info("citizen_stewardship.alerts_created", count=created, trees=len(due_trees))
    return {"alerts_created": created, "trees_checked": len(due_trees)}
