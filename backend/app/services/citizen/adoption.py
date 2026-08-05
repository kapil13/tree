"""Citizen tree adoption and stewardship."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.tree import Tree
from app.models.tree_steward import TreeSteward
from app.models.user import User
from app.services.citizen.gamification import record_tree_adopted

MAX_ADOPTERS_PER_TREE = 10
CITIZEN_SURVEY_INTERVAL_DAYS = 30


class AdoptionError(Exception):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


def tree_is_adoptable(tree: Tree) -> bool:
    meta = tree.metadata_ or {}
    if tree.status == "removed":
        return False
    if tree.project_id is not None:
        return False
    return bool(meta.get("visibility_public", True))


async def adopt_tree(
    db: AsyncSession,
    *,
    user: User,
    tree_id: uuid.UUID,
    nickname: str | None = None,
) -> TreeSteward:
    tree = await db.get(Tree, tree_id)
    if tree is None:
        raise AdoptionError("tree_not_found")
    if tree.owner_user_id == user.id:
        raise AdoptionError("cannot_adopt_own_tree")
    if not tree_is_adoptable(tree):
        raise AdoptionError("tree_not_adoptable")

    existing = await db.execute(
        select(TreeSteward).where(TreeSteward.tree_id == tree_id, TreeSteward.user_id == user.id)
    )
    if existing.scalar_one_or_none():
        raise AdoptionError("already_adopted")

    count = int(
        (
            await db.execute(
                select(func.count())
                .select_from(TreeSteward)
                .where(TreeSteward.tree_id == tree_id, TreeSteward.role == "adopter")
            )
        ).scalar_one()
    )
    if count >= MAX_ADOPTERS_PER_TREE:
        raise AdoptionError("adopter_limit_reached")

    steward = TreeSteward(
        tree_id=tree_id,
        user_id=user.id,
        role="adopter",
        nickname=nickname,
        adopted_at=datetime.now(UTC),
    )
    db.add(steward)
    await db.flush()
    await record_tree_adopted(db, user)
    return steward


async def relinquish_adoption(db: AsyncSession, *, user: User, tree_id: uuid.UUID) -> None:
    row = (
        await db.execute(
            select(TreeSteward).where(
                TreeSteward.tree_id == tree_id,
                TreeSteward.user_id == user.id,
                TreeSteward.role == "adopter",
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise AdoptionError("not_adopted")
    await db.delete(row)


async def list_adoptable_trees(
    db: AsyncSession,
    *,
    user: User,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[dict[str, Any]], int]:
    page_size = min(max(page_size, 1), 50)
    page = max(page, 1)

    adopted_ids = select(TreeSteward.tree_id).where(TreeSteward.user_id == user.id)

    base = (
        select(Tree, User.full_name)
        .join(User, User.id == Tree.owner_user_id)
        .where(
            Tree.owner_user_id != user.id,
            Tree.project_id.is_(None),
            Tree.status != "removed",
            Tree.id.not_in(adopted_ids),
        )
    )
    rows = (await db.execute(base.order_by(Tree.created_at.desc()))).all()
    adoptable = [(tree, owner_name) for tree, owner_name in rows if tree_is_adoptable(tree)]
    total = len(adoptable)
    start = (page - 1) * page_size
    page_rows = adoptable[start : start + page_size]

    return [
        _serialize_stewardship_tree(tree, owner_name=owner_name, relationship="adoptable")
        for tree, owner_name in page_rows
    ], total


async def list_stewardship(
    db: AsyncSession,
    *,
    user: User,
) -> dict[str, Any]:
    owned_res = await db.execute(
        select(Tree)
        .where(Tree.owner_user_id == user.id, Tree.status != "removed")
        .order_by(Tree.created_at.desc())
        .limit(100)
    )
    owned = [_serialize_stewardship_tree(t, relationship="owner") for t in owned_res.scalars().all()]

    adopted_res = await db.execute(
        select(Tree, TreeSteward)
        .join(TreeSteward, TreeSteward.tree_id == Tree.id)
        .where(TreeSteward.user_id == user.id, TreeSteward.role == "adopter")
        .order_by(TreeSteward.adopted_at.desc())
        .limit(100)
    )
    adopted = [
        _serialize_stewardship_tree(tree, relationship="adopter", steward=steward)
        for tree, steward in adopted_res.all()
    ]

    now = datetime.now(UTC)
    due_owned = [t for t in owned if _is_due(t, now)]
    due_adopted = [t for t in adopted if _is_due(t, now)]

    return {
        "owned": owned,
        "adopted": adopted,
        "due_count": len(due_owned) + len(due_adopted),
        "due_tree_ids": [t["id"] for t in due_owned + due_adopted],
    }


def _is_due(tree_row: dict[str, Any], now: datetime) -> bool:
    last = tree_row.get("last_geotag_at") or tree_row.get("registered_at")
    if not last:
        return True
    if isinstance(last, str):
        last = datetime.fromisoformat(last.replace("Z", "+00:00"))
    return last <= now - timedelta(days=CITIZEN_SURVEY_INTERVAL_DAYS)


def _serialize_stewardship_tree(
    tree: Tree,
    *,
    relationship: str,
    owner_name: str | None = None,
    steward: TreeSteward | None = None,
) -> dict[str, Any]:
    meta = tree.metadata_ or {}
    return {
        "id": str(tree.id),
        "public_code": tree.public_code,
        "species_text": tree.species_text,
        "relationship": relationship,
        "owner_name": owner_name,
        "nickname": steward.nickname if steward else meta.get("tree_nickname"),
        "current_health": tree.current_health,
        "survival_status": meta.get("survival_status"),
        "registered_at": tree.registered_at,
        "last_geotag_at": tree.last_geotag_at,
        "stewardship_checkins": meta.get("stewardship_checkins", 0),
        "days_since_planted": _days_since(tree),
        "next_checkin_due": _next_checkin_due(tree),
        "adopted_at": steward.adopted_at if steward else None,
    }


def _days_since(tree: Tree) -> int | None:
    anchor = tree.planted_at or (tree.registered_at.date() if tree.registered_at else None)
    if not anchor:
        return None
    return (datetime.now(UTC).date() - anchor).days


def _next_checkin_due(tree: Tree) -> bool:
    now = datetime.now(UTC)
    last = tree.last_geotag_at or tree.registered_at
    if last is None:
        return True
    return last <= now - timedelta(days=CITIZEN_SURVEY_INTERVAL_DAYS)


async def user_can_steward_tree(db: AsyncSession, user: User, tree: Tree) -> bool:
    if tree.owner_user_id == user.id:
        return True
    row = (
        await db.execute(
            select(TreeSteward.id).where(TreeSteward.tree_id == tree.id, TreeSteward.user_id == user.id)
        )
    ).scalar_one_or_none()
    return row is not None


async def adopt_tree_by_public_code(
    db: AsyncSession,
    *,
    user: User,
    public_code: str,
    nickname: str | None = None,
) -> TreeSteward:
    tree = (
        await db.execute(select(Tree).where(Tree.public_code == public_code.strip().upper()))
    ).scalar_one_or_none()
    if tree is None:
        raise AdoptionError("tree_not_found")
    return await adopt_tree(db, user=user, tree_id=tree.id, nickname=nickname)


async def get_tree_with_stewards(db: AsyncSession, tree_id: uuid.UUID) -> Tree | None:
    res = await db.execute(
        select(Tree).options(selectinload(Tree.stewards)).where(Tree.id == tree_id)
    )
    return res.scalar_one_or_none()
