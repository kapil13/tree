"""Tests for citizen BYOT engagement — adoption, gamification, fast signup."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.auth.signup import (
    SignupError,
    start_citizen_fast_signup,
)
from app.services.citizen.adoption import AdoptionError, adopt_tree, tree_is_adoptable
from app.services.citizen.gamification import record_stewardship_checkin, record_tree_created


def test_tree_is_adoptable_byot_public():
    tree = MagicMock(status="active", project_id=None, metadata_={"visibility_public": True})
    assert tree_is_adoptable(tree) is True


def test_tree_is_not_adoptable_when_project_linked():
    tree = MagicMock(status="active", project_id=uuid.uuid4(), metadata_={"visibility_public": True})
    assert tree_is_adoptable(tree) is False


@pytest.mark.asyncio
async def test_record_tree_created_awards_first_tree_badge():
    user = MagicMock(id=uuid.uuid4())
    db = AsyncMock()
    profile = MagicMock(points=0, badges=[], stewardship_streak=0)

    with patch("app.services.citizen.gamification.ensure_citizen_profile", AsyncMock(return_value=profile)):
        result = await record_tree_created(db, user)

    assert result["new_badges"]
    assert profile.points >= 50


@pytest.mark.asyncio
async def test_record_stewardship_checkin_adds_points():
    user = MagicMock(id=uuid.uuid4())
    tree = MagicMock(
        planted_at=datetime.now(UTC).date() - timedelta(days=35),
        registered_at=datetime.now(UTC),
        metadata_={"stewardship_checkins": 0},
    )
    profile = MagicMock(points=0, badges=[], stewardship_streak=0, last_stewardship_at=None)
    db = AsyncMock()

    with patch("app.services.citizen.gamification.ensure_citizen_profile", AsyncMock(return_value=profile)):
        result = await record_stewardship_checkin(db, user=user, tree=tree)

    assert result["points"] >= 25
    assert tree.metadata_["stewardship_checkins"] == 1


@pytest.mark.asyncio
async def test_adopt_tree_rejects_owner():
    user = MagicMock(id=uuid.uuid4())
    tree = MagicMock(
        id=uuid.uuid4(),
        owner_user_id=user.id,
        status="active",
        project_id=None,
        metadata_={"visibility_public": True},
    )
    db = AsyncMock()
    db.get = AsyncMock(return_value=tree)
    db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))

    with pytest.raises(AdoptionError, match="cannot_adopt_own_tree"):
        await adopt_tree(db, user=user, tree_id=tree.id)


@pytest.mark.asyncio
async def test_start_citizen_fast_signup_rejects_short_password():
    db = AsyncMock()
    with pytest.raises(SignupError, match="password_too_short"):
        await start_citizen_fast_signup(db, full_name="Test User", phone="+919876543210", password="short")
