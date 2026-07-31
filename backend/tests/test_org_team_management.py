"""Tests for organization onboarding and team management."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.auth.user_profile import user_has_professional_program
from app.services.organizations.members import (
    OrgMemberError,
    _user_matches_invite,
    accept_org_invite,
    user_is_org_admin,
)
from app.services.organizations.onboarding import (
    default_platform_role_for_program,
    platform_role_for_org_member,
    slugify_org_name,
)


def test_slugify_org_name():
    assert slugify_org_name("NHAI Regional Office") == "nhai-regional-office"


def test_default_platform_role_for_program():
    assert default_platform_role_for_program("government_nhai") == "government"
    assert default_platform_role_for_program("corporate_esg") == "corporate"


def test_platform_role_for_org_member():
    assert platform_role_for_org_member("supervisor", "government") == "field_supervisor"
    assert platform_role_for_org_member("worker", "corporate") == "field_worker"


def test_user_is_org_admin():
    user = MagicMock(organization_id=uuid.uuid4(), is_org_admin=True)
    assert user_is_org_admin(user) is True
    user.is_org_admin = False
    assert user_is_org_admin(user) is False


def test_user_has_professional_program():
    assert user_has_professional_program(["byot", "government_nhai"]) is True
    assert user_has_professional_program(["byot"]) is False


@pytest.mark.asyncio
async def test_invite_requires_contact():
    from app.services.organizations.members import invite_org_member

    org = MagicMock(id=uuid.uuid4(), type="government")
    inviter = MagicMock(id=uuid.uuid4())
    db = MagicMock()
    with pytest.raises(OrgMemberError) as exc:
        await invite_org_member(
            db,
            org=org,
            inviter=inviter,
            full_name="Worker",
            email=None,
            phone=None,
        )
    assert exc.value.code == "email_or_phone_required"


@pytest.mark.asyncio
async def test_invite_existing_user_without_org_is_pending_only():
    """Existing account with no org gets a pending invite; membership is not auto-applied."""
    from app.services.organizations.members import invite_org_member

    org = MagicMock(id=uuid.uuid4(), type="government")
    inviter = MagicMock(id=uuid.uuid4())
    existing = MagicMock(organization_id=None, email="solo@example.com")
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
        member, invite, _delivery = await invite_org_member(
            db,
            org=org,
            inviter=inviter,
            full_name="Solo",
            email="solo@example.com",
        )

    assert member is None
    assert invite is not None
    assert invite.status == "pending"
    apply_mock.assert_not_awaited()


def test_user_matches_invite():
    invite = MagicMock(email="worker@example.com", phone="+919876543210")
    user = MagicMock(email="worker@example.com", phone="+919876543210")
    assert _user_matches_invite(user, invite) is True

    user.email = "other@example.com"
    assert _user_matches_invite(user, invite) is False


@pytest.mark.asyncio
async def test_accept_invite_contact_mismatch():
    org_id = uuid.uuid4()
    org = MagicMock(id=org_id, type="government")
    invite = MagicMock(
        organization_id=org_id,
        organization=org,
        status="pending",
        expires_at=datetime.now(UTC) + timedelta(days=1),
        email="invited@example.com",
        phone=None,
        org_role="worker",
        platform_role="field_worker",
        full_name="Invited User",
    )
    user = MagicMock(
        id=uuid.uuid4(),
        email="other@example.com",
        phone=None,
        organization_id=None,
    )

    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=invite)))

    with pytest.raises(OrgMemberError) as exc:
        await accept_org_invite(db, invite_token="token", user=user)
    assert exc.value.code == "invite_contact_mismatch"
