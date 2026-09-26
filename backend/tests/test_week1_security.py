"""Week 1 security hardening: OAuth state, S3 keys, invite pending-only, Google profile."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.auth.google_oauth import GoogleProfile
from app.services.auth.oauth_state import consume_oauth_state, issue_oauth_state
from app.services.organizations.members import OrgMemberError, invite_org_member
from app.services.storage.key_ownership import assert_owned_upload_key


@pytest.mark.asyncio
async def test_oauth_state_issue_and_consume_once():
    with patch("app.services.auth.oauth_state._client", new=AsyncMock(return_value=None)):
        state = await issue_oauth_state()
        assert state
        assert await consume_oauth_state(state) is True
        assert await consume_oauth_state(state) is False


@pytest.mark.asyncio
async def test_oauth_state_rejects_empty():
    with patch("app.services.auth.oauth_state._client", new=AsyncMock(return_value=None)):
        assert await consume_oauth_state("") is False
        assert await consume_oauth_state("unknown") is False


def test_google_profile_email_verified_defaults_false():
    profile = GoogleProfile(sub="sub", email="a@b.com", name="A")
    assert profile.email_verified is False


def test_s3_key_ownership_helper():
    uid = uuid.uuid4()
    assert_owned_upload_key(uid, f"images/{uid}/ok.png")
    with pytest.raises(ValueError, match="invalid_s3_key"):
        assert_owned_upload_key(uid, "")
    with pytest.raises(ValueError, match="s3_key_forbidden"):
        assert_owned_upload_key(uid, f"images/{uuid.uuid4()}/x.png")


def test_google_link_requires_verified_rule():
    """Document linking rule: unverified local accounts must not receive google_sub."""
    user = MagicMock(email_verified_at=None, is_verified=False, google_sub=None)
    may_link = user.email_verified_at is not None or user.is_verified is True
    assert may_link is False

    user.is_verified = True
    may_link = user.email_verified_at is not None or user.is_verified is True
    assert may_link is True

    user.is_verified = False
    user.email_verified_at = datetime.now(UTC)
    may_link = user.email_verified_at is not None or user.is_verified is True
    assert may_link is True


@pytest.mark.asyncio
async def test_invite_existing_user_without_org_creates_pending_invite():
    org = MagicMock(id=uuid.uuid4(), type="government")
    inviter = MagicMock(id=uuid.uuid4())
    existing = MagicMock(id=uuid.uuid4(), organization_id=None, email="free@example.com")

    db = AsyncMock()
    db.execute = AsyncMock(
        return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=existing))
    )
    db.add = MagicMock()
    db.flush = AsyncMock()

    with (
        patch(
            "app.services.organizations.members._apply_org_membership",
            new_callable=AsyncMock,
        ) as apply_mock,
        patch(
            "app.services.organizations.members.notify_org_invite",
            new_callable=AsyncMock,
            return_value={"sms_sent": False, "email_sent": False, "invite_link": "x"},
        ),
    ):
        member, invite, delivery = await invite_org_member(
            db,
            org=org,
            inviter=inviter,
            full_name="Free User",
            email="free@example.com",
            phone=None,
            org_role="worker",
        )

    assert member is None
    assert invite is not None
    assert delivery is not None
    apply_mock.assert_not_awaited()
    db.add.assert_called_once()


@pytest.mark.asyncio
async def test_invite_already_member_raises():
    org_id = uuid.uuid4()
    org = MagicMock(id=org_id, type="government")
    inviter = MagicMock(id=uuid.uuid4())
    existing = MagicMock(id=uuid.uuid4(), organization_id=org_id, email="in@example.com")

    db = AsyncMock()
    db.execute = AsyncMock(
        return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=existing))
    )

    with pytest.raises(OrgMemberError) as exc:
        await invite_org_member(
            db,
            org=org,
            inviter=inviter,
            full_name="Member",
            email="in@example.com",
            phone=None,
        )
    assert exc.value.code == "already_member"
