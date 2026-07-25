"""Organization member listing, invites, and role updates."""

from __future__ import annotations

import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import hash_password
from app.models.organization import Organization
from app.models.organization_invite import OrganizationInvite
from app.models.user import User
from app.services.auth.otp import normalize_phone, phone_placeholder_email
from app.services.organizations.invite_notifications import notify_org_invite
from app.services.organizations.onboarding import (
    ORG_ROLES,
    org_program_codes,
    platform_role_for_org_member,
)
from app.services.planting_programs.enrollment import list_user_program_codes, set_user_programs

INVITE_TTL_DAYS = 14


class OrgMemberError(Exception):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


def user_is_org_admin(user: User) -> bool:
    return bool(user.organization_id and user.is_org_admin)


async def get_user_org(db: AsyncSession, user: User) -> Organization | None:
    if not user.organization_id:
        return None
    return await db.get(Organization, user.organization_id)


async def list_org_members(db: AsyncSession, org_id: uuid.UUID) -> list[User]:
    res = await db.execute(
        select(User)
        .where(User.organization_id == org_id)
        .order_by(User.is_org_admin.desc(), User.full_name.asc())
    )
    return list(res.scalars().all())


async def list_pending_invites(db: AsyncSession, org_id: uuid.UUID) -> list[OrganizationInvite]:
    res = await db.execute(
        select(OrganizationInvite)
        .where(
            OrganizationInvite.organization_id == org_id,
            OrganizationInvite.status == "pending",
        )
        .order_by(OrganizationInvite.created_at.desc())
    )
    return list(res.scalars().all())


async def _apply_org_membership(
    db: AsyncSession,
    *,
    org: Organization,
    target: User,
    org_role: str,
    platform_role: str,
    is_org_admin: bool = False,
) -> None:
    target.organization_id = org.id
    target.org_role = org_role
    target.role = platform_role
    target.is_org_admin = is_org_admin
    codes = await org_program_codes(org)
    if codes:
        enrolled = await list_user_program_codes(db, target.id)
        merged = list(dict.fromkeys([*enrolled, *codes]))
        await set_user_programs(db, target.id, merged)


def _user_matches_invite(user: User, invite: OrganizationInvite) -> bool:
    if invite.email and user.email.lower() != invite.email.lower():
        return False
    return not (invite.phone and user.phone != invite.phone)


async def invite_org_member(
    db: AsyncSession,
    *,
    org: Organization,
    inviter: User,
    full_name: str,
    email: str | None = None,
    phone: str | None = None,
    org_role: str = "worker",
) -> tuple[User | None, OrganizationInvite | None, dict[str, Any] | None]:
    if org_role not in ORG_ROLES:
        raise OrgMemberError("invalid_org_role")
    if not email and not phone:
        raise OrgMemberError("email_or_phone_required")

    normalized_phone = None
    if phone:
        try:
            normalized_phone = normalize_phone(phone)
        except ValueError as exc:
            raise OrgMemberError("invalid_phone") from exc

    email_lower = email.strip().lower() if email else None
    platform_role = platform_role_for_org_member(org_role, org.type)

    if email_lower:
        res = await db.execute(select(User).where(User.email == email_lower))
        existing = res.scalar_one_or_none()
        if existing:
            if existing.organization_id and existing.organization_id != org.id:
                raise OrgMemberError("user_in_other_org")
            await _apply_org_membership(
                db,
                org=org,
                target=existing,
                org_role=org_role,
                platform_role=platform_role,
            )
            return existing, None, None

    if normalized_phone:
        res = await db.execute(select(User).where(User.phone == normalized_phone))
        existing = res.scalar_one_or_none()
        if existing:
            if existing.organization_id and existing.organization_id != org.id:
                raise OrgMemberError("user_in_other_org")
            await _apply_org_membership(
                db,
                org=org,
                target=existing,
                org_role=org_role,
                platform_role=platform_role,
            )
            return existing, None, None

    token = secrets.token_urlsafe(32)
    invite = OrganizationInvite(
        organization_id=org.id,
        email=email_lower,
        phone=normalized_phone,
        full_name=full_name.strip(),
        org_role=org_role,
        platform_role=platform_role,
        invited_by=inviter.id,
        status="pending",
        invite_token=token,
        expires_at=datetime.now(UTC) + timedelta(days=INVITE_TTL_DAYS),
    )
    db.add(invite)
    await db.flush()
    delivery = await notify_org_invite(invite=invite, org=org)
    return None, invite, delivery


async def update_org_member(
    db: AsyncSession,
    *,
    org: Organization,
    actor: User,
    member_id: uuid.UUID,
    org_role: str | None = None,
    is_active: bool | None = None,
    is_org_admin: bool | None = None,
) -> User:
    member = await db.get(User, member_id)
    if member is None or member.organization_id != org.id:
        raise OrgMemberError("member_not_found")
    if member.id == actor.id and is_org_admin is False:
        raise OrgMemberError("cannot_remove_own_admin")
    if org_role is not None:
        if org_role not in ORG_ROLES:
            raise OrgMemberError("invalid_org_role")
        member.org_role = org_role
        member.role = platform_role_for_org_member(org_role, org.type)
    if is_active is not None:
        member.is_active = is_active
    if is_org_admin is not None:
        member.is_org_admin = is_org_admin
    await db.flush()
    return member


async def get_invite_preview(db: AsyncSession, *, invite_token: str) -> dict:
    res = await db.execute(
        select(OrganizationInvite)
        .options(selectinload(OrganizationInvite.organization))
        .where(OrganizationInvite.invite_token == invite_token)
    )
    invite = res.scalar_one_or_none()
    if invite is None or invite.status != "pending":
        raise OrgMemberError("invite_not_found" if invite is None else "invite_revoked")
    if invite.expires_at < datetime.now(UTC):
        invite.status = "expired"
        await db.flush()
        raise OrgMemberError("invite_expired")
    org = invite.organization
    return {
        "organization_name": org.name,
        "org_role": invite.org_role,
        "full_name": invite.full_name,
        "email": invite.email,
        "phone": invite.phone,
        "expires_at": invite.expires_at,
    }


async def accept_org_invite(
    db: AsyncSession,
    *,
    invite_token: str,
    user: User | None = None,
    full_name: str | None = None,
    email: str | None = None,
    phone: str | None = None,
    password: str | None = None,
) -> User:
    res = await db.execute(
        select(OrganizationInvite)
        .options(selectinload(OrganizationInvite.organization))
        .where(OrganizationInvite.invite_token == invite_token)
    )
    invite = res.scalar_one_or_none()
    if invite is None or invite.status != "pending":
        raise OrgMemberError("invite_not_found" if invite is None else "invite_revoked")
    if invite.expires_at < datetime.now(UTC):
        invite.status = "expired"
        raise OrgMemberError("invite_expired")

    org = invite.organization
    if user is None:
        if not email and not phone:
            raise OrgMemberError("registration_required")
        email_lower = email.strip().lower() if email else None
        normalized_phone = None
        if phone:
            normalized_phone = normalize_phone(phone)
        if not email_lower and normalized_phone:
            email_lower = phone_placeholder_email(normalized_phone)
        existing = None
        if email_lower:
            row = await db.execute(select(User).where(User.email == email_lower))
            existing = row.scalar_one_or_none()
        if existing is None and normalized_phone:
            row = await db.execute(select(User).where(User.phone == normalized_phone))
            existing = row.scalar_one_or_none()
        if existing:
            user = existing
        else:
            if not password or len(password) < 12:
                raise OrgMemberError("password_required")
            user = User(
                email=email_lower or phone_placeholder_email(normalized_phone or ""),
                phone=normalized_phone,
                full_name=full_name or invite.full_name,
                hashed_password=hash_password(password),
                role=invite.platform_role,
                org_role=invite.org_role,
                is_org_admin=False,
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            await db.flush()

    if user.organization_id and user.organization_id != org.id:
        raise OrgMemberError("user_in_other_org")
    if not _user_matches_invite(user, invite):
        raise OrgMemberError("invite_contact_mismatch")

    await _apply_org_membership(
        db,
        org=org,
        target=user,
        org_role=invite.org_role,
        platform_role=invite.platform_role,
    )
    invite.status = "accepted"
    await db.flush()
    return user


async def bulk_invite_from_rows(
    db: AsyncSession,
    *,
    org: Organization,
    inviter: User,
    rows: list[dict[str, str]],
) -> dict[str, Any]:
    created = 0
    invited = 0
    errors = 0
    row_errors: list[dict[str, Any]] = []
    for idx, row in enumerate(rows, start=1):
        email = (row.get("email") or "").strip() or None
        phone = (row.get("phone") or "").strip() or None
        org_role = (row.get("org_role") or row.get("role") or "worker").strip().lower()
        full_name = row.get("full_name") or row.get("name") or "Team member"
        try:
            user, invite, _delivery = await invite_org_member(
                db,
                org=org,
                inviter=inviter,
                full_name=full_name,
                email=email,
                phone=phone,
                org_role=org_role,
            )
            if user:
                created += 1
            elif invite:
                invited += 1
        except OrgMemberError as exc:
            errors += 1
            row_errors.append(
                {
                    "row": idx,
                    "full_name": full_name,
                    "email": email,
                    "phone": phone,
                    "org_role": org_role,
                    "error": exc.code,
                }
            )
    return {"added": created, "invited": invited, "errors": errors, "row_errors": row_errors}


async def revoke_org_invite(
    db: AsyncSession,
    *,
    org_id: uuid.UUID,
    invite_id: uuid.UUID,
) -> OrganizationInvite:
    res = await db.execute(
        select(OrganizationInvite).where(
            OrganizationInvite.id == invite_id,
            OrganizationInvite.organization_id == org_id,
        )
    )
    invite = res.scalar_one_or_none()
    if invite is None:
        raise OrgMemberError("invite_not_found")
    if invite.status == "accepted":
        raise OrgMemberError("invite_already_accepted")
    if invite.status == "revoked":
        raise OrgMemberError("invite_already_revoked")
    invite.status = "revoked"
    await db.flush()
    return invite


async def resend_org_invite(
    db: AsyncSession,
    *,
    org: Organization,
    invite_id: uuid.UUID,
) -> tuple[OrganizationInvite, dict[str, Any]]:
    res = await db.execute(
        select(OrganizationInvite).where(
            OrganizationInvite.id == invite_id,
            OrganizationInvite.organization_id == org.id,
        )
    )
    invite = res.scalar_one_or_none()
    if invite is None:
        raise OrgMemberError("invite_not_found")
    if invite.status != "pending":
        raise OrgMemberError("invite_revoked" if invite.status == "revoked" else "invite_already_accepted")
    if invite.expires_at < datetime.now(UTC):
        invite.expires_at = datetime.now(UTC) + timedelta(days=INVITE_TTL_DAYS)
    delivery = await notify_org_invite(invite=invite, org=org)
    await db.flush()
    return invite, delivery


async def search_org_user_candidates(
    db: AsyncSession, org_id: uuid.UUID, query: str, limit: int = 20
) -> list[User]:
    q = f"%{query.strip().lower()}%"
    res = await db.execute(
        select(User)
        .where(
            User.organization_id == org_id,
            or_(User.email.ilike(q), User.full_name.ilike(q)),
        )
        .limit(limit)
    )
    return list(res.scalars().all())
