"""Citizen gamification — points, badges, and survival milestones."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.citizen_profile import CitizenProfile
from app.models.tree import Tree
from app.models.tree_steward import TreeSteward
from app.models.user import User

BADGE_CATALOG: dict[str, dict[str, Any]] = {
    "first_tree": {
        "label": "First Tree",
        "description": "Registered your first tree",
        "points": 50,
    },
    "adopter": {
        "label": "Tree Adopter",
        "description": "Adopted a community tree to steward",
        "points": 75,
    },
    "steward_30": {
        "label": "30-Day Steward",
        "description": "Kept a tree alive for 30 days with check-ins",
        "points": 100,
    },
    "steward_90": {
        "label": "90-Day Guardian",
        "description": "Ninety days of stewardship",
        "points": 200,
    },
    "steward_365": {
        "label": "One-Year Guardian",
        "description": "One full year caring for your grove",
        "points": 500,
    },
    "checkin_streak_3": {
        "label": "3-Week Streak",
        "description": "Three consecutive weekly stewardship check-ins",
        "points": 150,
    },
    "survival_champion": {
        "label": "Survival Champion",
        "description": "Completed 5 survival check-ins",
        "points": 125,
    },
}

MILESTONE_DAYS = (30, 90, 365)
MILESTONE_BADGES = {30: "steward_30", 90: "steward_90", 365: "steward_365"}


async def ensure_citizen_profile(db: AsyncSession, user_id: uuid.UUID) -> CitizenProfile:
    profile = await db.get(CitizenProfile, user_id)
    if profile is None:
        profile = CitizenProfile(user_id=user_id)
        db.add(profile)
        await db.flush()
    return profile


def _badge_ids(profile: CitizenProfile) -> set[str]:
    return {b.get("id") for b in (profile.badges or []) if isinstance(b, dict) and b.get("id")}


def _award_badge(profile: CitizenProfile, badge_id: str) -> dict[str, Any] | None:
    if badge_id not in BADGE_CATALOG or badge_id in _badge_ids(profile):
        return None
    spec = BADGE_CATALOG[badge_id]
    badge = {
        "id": badge_id,
        "label": spec["label"],
        "description": spec["description"],
        "earned_at": datetime.now(UTC).isoformat(),
    }
    profile.badges = [*list(profile.badges or []), badge]
    profile.points = int(profile.points or 0) + int(spec.get("points", 0))
    return badge


async def record_tree_created(db: AsyncSession, user: User) -> dict[str, Any]:
    profile = await ensure_citizen_profile(db, user.id)
    newly: list[dict[str, Any]] = []
    badge = _award_badge(profile, "first_tree")
    if badge:
        newly.append(badge)
    await db.flush()
    return {"points": profile.points, "new_badges": newly}


async def record_tree_adopted(db: AsyncSession, user: User) -> dict[str, Any]:
    profile = await ensure_citizen_profile(db, user.id)
    newly: list[dict[str, Any]] = []
    badge = _award_badge(profile, "adopter")
    if badge:
        newly.append(badge)
    await db.flush()
    return {"points": profile.points, "new_badges": newly}


async def record_stewardship_checkin(
    db: AsyncSession,
    *,
    user: User,
    tree: Tree,
) -> dict[str, Any]:
    """Award points/badges after a survival check-in (re-geotag)."""
    profile = await ensure_citizen_profile(db, user.id)
    newly: list[dict[str, Any]] = []
    now = datetime.now(UTC)

    profile.points = int(profile.points or 0) + 25

    if profile.last_stewardship_at:
        delta = now - profile.last_stewardship_at
        if delta <= timedelta(days=8):
            profile.stewardship_streak = int(profile.stewardship_streak or 0) + 1
        elif delta > timedelta(days=14):
            profile.stewardship_streak = 1
    else:
        profile.stewardship_streak = 1
    profile.last_stewardship_at = now

    if profile.stewardship_streak >= 3:
        badge = _award_badge(profile, "checkin_streak_3")
        if badge:
            newly.append(badge)

    anchor = tree.planted_at or (tree.registered_at.date() if tree.registered_at else None)
    if anchor:
        age_days = (now.date() - anchor).days
        for days, badge_id in MILESTONE_BADGES.items():
            if age_days >= days:
                badge = _award_badge(profile, badge_id)
                if badge:
                    newly.append(badge)

    checkin_count = int((tree.metadata_ or {}).get("stewardship_checkins", 0)) + 1
    meta = dict(tree.metadata_ or {})
    meta["stewardship_checkins"] = checkin_count
    tree.metadata_ = meta
    if checkin_count >= 5:
        badge = _award_badge(profile, "survival_champion")
        if badge:
            newly.append(badge)

    await db.flush()
    return {
        "points": profile.points,
        "stewardship_streak": profile.stewardship_streak,
        "new_badges": newly,
    }


async def build_citizen_profile_out(db: AsyncSession, user: User) -> dict[str, Any]:
    profile = await ensure_citizen_profile(db, user.id)

    owned = int(
        (
            await db.execute(
                select(func.count()).select_from(Tree).where(Tree.owner_user_id == user.id)
            )
        ).scalar_one()
    )
    adopted = int(
        (
            await db.execute(
                select(func.count())
                .select_from(TreeSteward)
                .where(TreeSteward.user_id == user.id, TreeSteward.role == "adopter")
            )
        ).scalar_one()
    )

    return {
        "user_id": user.id,
        "points": profile.points,
        "badges": profile.badges or [],
        "stewardship_streak": profile.stewardship_streak,
        "last_stewardship_at": profile.last_stewardship_at,
        "onboarding_steps": profile.onboarding_steps or [],
        "trees_owned": owned,
        "trees_adopted": adopted,
        "badge_catalog": [
            {"id": k, **v} for k, v in BADGE_CATALOG.items()
        ],
    }


async def mark_onboarding_step(db: AsyncSession, user: User, step_id: str) -> None:
    profile = await ensure_citizen_profile(db, user.id)
    steps = list(profile.onboarding_steps or [])
    if step_id not in steps:
        steps.append(step_id)
        profile.onboarding_steps = steps
        await db.flush()
