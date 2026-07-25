"""Organization team management API."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Request, status

from app.api.v1.deps import DB, CurrentUser, OrgAdmin, OrgMember
from app.models.organization import Organization
from app.models.user import User
from app.schemas.organization import (
    OrganizationOut,
    OrgBulkInviteCreate,
    OrgBulkInviteResult,
    OrgInviteAccept,
    OrgInviteOut,
    OrgMemberInviteCreate,
    OrgMemberInviteResult,
    OrgMemberOut,
    OrgMembersOut,
    OrgMemberUpdate,
)
from app.services.audit import record_audit
from app.services.organizations.members import (
    OrgMemberError,
    accept_org_invite,
    bulk_invite_from_rows,
    get_user_org,
    invite_org_member,
    list_org_members,
    list_pending_invites,
    update_org_member,
    user_is_org_admin,
)
from app.services.organizations.onboarding import org_program_codes

router = APIRouter(prefix="/organizations", tags=["organizations"])


def _org_out(org: Organization) -> OrganizationOut:
    return OrganizationOut(
        id=org.id,
        name=org.name,
        slug=org.slug,
        type=org.type,
        program_codes=[],
    )


async def _org_out_with_programs(db, org: Organization) -> OrganizationOut:
    codes = await org_program_codes(org)
    return OrganizationOut(
        id=org.id,
        name=org.name,
        slug=org.slug,
        type=org.type,
        program_codes=codes,
    )


def _member_out(user: User) -> OrgMemberOut:
    return OrgMemberOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        org_role=user.org_role,
        is_org_admin=user.is_org_admin,
        is_active=user.is_active,
        phone=user.phone,
        created_at=user.created_at,
    )


def _invite_out(invite) -> OrgInviteOut:
    return OrgInviteOut(
        id=invite.id,
        email=invite.email,
        phone=invite.phone,
        full_name=invite.full_name,
        org_role=invite.org_role,
        platform_role=invite.platform_role,
        status=invite.status,
        invite_token=invite.invite_token,
        expires_at=invite.expires_at,
        created_at=invite.created_at,
    )


def _member_error(exc: OrgMemberError) -> HTTPException:
    code = exc.code
    status_code = status.HTTP_400_BAD_REQUEST
    if code in {"member_not_found", "invite_not_found"}:
        status_code = status.HTTP_404_NOT_FOUND
    elif code in {"user_in_other_org", "cannot_remove_own_admin"}:
        status_code = status.HTTP_409_CONFLICT
    elif code == "invite_expired":
        status_code = status.HTTP_410_GONE
    return HTTPException(status_code, detail=code)


@router.get("/me", response_model=OrganizationOut)
async def get_my_organization(user: CurrentUser, db: DB) -> OrganizationOut:
    org = await get_user_org(db, user)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="organization_not_found")
    return await _org_out_with_programs(db, org)


@router.get("/me/members", response_model=OrgMembersOut)
async def list_my_org_members(user: OrgMember, db: DB) -> OrgMembersOut:
    if not user.organization_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="organization_not_found")
    org = await get_user_org(db, user)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="organization_not_found")
    members = await list_org_members(db, org.id)
    invites = await list_pending_invites(db, org.id) if user_is_org_admin(user) else []
    return OrgMembersOut(
        organization=await _org_out_with_programs(db, org),
        members=[_member_out(m) for m in members],
        pending_invites=[_invite_out(i) for i in invites],
    )


@router.post("/me/members/invite", response_model=OrgMemberInviteResult, status_code=201)
async def invite_member(
    payload: OrgMemberInviteCreate,
    request: Request,
    admin: OrgAdmin,
    db: DB,
) -> OrgMemberInviteResult:
    org = await get_user_org(db, admin)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="organization_not_found")
    try:
        member, invite = await invite_org_member(
            db,
            org=org,
            inviter=admin,
            full_name=payload.full_name,
            email=str(payload.email) if payload.email else None,
            phone=payload.phone,
            org_role=payload.org_role,
        )
    except OrgMemberError as exc:
        raise _member_error(exc) from exc

    await record_audit(
        db,
        actor=admin,
        action="org.user.invite",
        resource_type="organization",
        resource_id=org.id,
        request=request,
        diff={
            "email": payload.email,
            "phone": payload.phone,
            "org_role": payload.org_role,
            "invite_id": str(invite.id) if invite else None,
            "user_id": str(member.id) if member else None,
        },
    )
    await db.commit()
    if member:
        return OrgMemberInviteResult(status="added", member=_member_out(member))
    assert invite is not None
    return OrgMemberInviteResult(status="invited", invite=_invite_out(invite))


@router.post("/me/members/bulk-invite", response_model=OrgBulkInviteResult)
async def bulk_invite_members(
    payload: OrgBulkInviteCreate,
    request: Request,
    admin: OrgAdmin,
    db: DB,
) -> OrgBulkInviteResult:
    org = await get_user_org(db, admin)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="organization_not_found")
    result = await bulk_invite_from_rows(
        db,
        org=org,
        inviter=admin,
        rows=[row.model_dump() for row in payload.rows],
    )
    await record_audit(
        db,
        actor=admin,
        action="org.user.bulk_invite",
        resource_type="organization",
        resource_id=org.id,
        request=request,
        diff=result,
    )
    await db.commit()
    return OrgBulkInviteResult(**result)


@router.patch("/me/members/{member_id}", response_model=OrgMemberOut)
async def patch_org_member(
    member_id: uuid.UUID,
    payload: OrgMemberUpdate,
    request: Request,
    admin: OrgAdmin,
    db: DB,
) -> OrgMemberOut:
    org = await get_user_org(db, admin)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="organization_not_found")
    try:
        member = await update_org_member(
            db,
            org=org,
            actor=admin,
            member_id=member_id,
            org_role=payload.org_role,
            is_active=payload.is_active,
            is_org_admin=payload.is_org_admin,
        )
    except OrgMemberError as exc:
        raise _member_error(exc) from exc

    await record_audit(
        db,
        actor=admin,
        action="org.user.role_change",
        resource_type="user",
        resource_id=member.id,
        request=request,
        diff=payload.model_dump(exclude_none=True),
    )
    await db.commit()
    await db.refresh(member)
    return _member_out(member)


@router.post("/invites/accept", response_model=OrgMemberOut)
async def accept_invite(
    payload: OrgInviteAccept,
    request: Request,
    user: CurrentUser,
    db: DB,
) -> OrgMemberOut:
    try:
        member = await accept_org_invite(
            db,
            invite_token=payload.invite_token,
            user=user,
            full_name=payload.full_name,
            email=str(payload.email) if payload.email else None,
            phone=payload.phone,
            password=payload.password,
        )
    except OrgMemberError as exc:
        raise _member_error(exc) from exc
    await record_audit(
        db,
        actor=member,
        action="org.user.invite_accept",
        resource_type="user",
        resource_id=member.id,
        request=request,
        diff={"invite_token": payload.invite_token[:8] + "…"},
    )
    await db.commit()
    return _member_out(member)
