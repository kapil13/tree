"""Organization team management API."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import Response

from app.api.v1.deps import DB, CurrentUser, OrgAdmin, OrgMember
from app.models.organization import Organization
from app.models.user import User
from app.schemas.audit import AuditLogOut
from app.schemas.common import Page
from app.schemas.organization import (
    OrganizationOut,
    OrgBulkInviteCreate,
    OrgBulkInviteResult,
    OrgInviteAccept,
    OrgInviteDeliveryOut,
    OrgInviteOut,
    OrgInvitePreviewOut,
    OrgMemberInviteCreate,
    OrgMemberInviteResult,
    OrgMemberOut,
    OrgMembersOut,
    OrgMemberUpdate,
    OrgTransferOwnership,
)
from app.services.audit import record_audit
from app.services.organizations.members import (
    OrgMemberError,
    accept_org_invite,
    bulk_invite_from_rows,
    export_org_members_csv,
    get_invite_preview,
    get_user_org,
    invite_org_member,
    list_org_members,
    list_org_team_audit_logs,
    list_pending_invites,
    resend_org_invite,
    revoke_org_invite,
    transfer_org_ownership,
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
    elif code in {"user_in_other_org", "cannot_remove_own_admin", "invite_contact_mismatch"}:
        status_code = status.HTTP_409_CONFLICT
    elif code in {"invite_expired", "invite_revoked", "invite_already_revoked"}:
        status_code = status.HTTP_410_GONE
    elif code == "invite_already_accepted":
        status_code = status.HTTP_409_CONFLICT
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
        member, invite, delivery = await invite_org_member(
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
    delivery_out = OrgInviteDeliveryOut(**delivery) if delivery else None
    return OrgMemberInviteResult(
        status="invited",
        invite=_invite_out(invite),
        delivery=delivery_out,
    )


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


@router.get("/invites/preview", response_model=OrgInvitePreviewOut)
async def preview_invite(db: DB, token: str = Query(..., min_length=8)) -> OrgInvitePreviewOut:
    try:
        preview = await get_invite_preview(db, invite_token=token)
    except OrgMemberError as exc:
        raise _member_error(exc) from exc
    return OrgInvitePreviewOut(**preview)


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


@router.post("/me/members/invites/{invite_id}/revoke", response_model=OrgInviteOut)
async def revoke_member_invite(
    invite_id: uuid.UUID,
    request: Request,
    admin: OrgAdmin,
    db: DB,
) -> OrgInviteOut:
    org = await get_user_org(db, admin)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="organization_not_found")
    try:
        invite = await revoke_org_invite(db, org_id=org.id, invite_id=invite_id)
    except OrgMemberError as exc:
        raise _member_error(exc) from exc
    await record_audit(
        db,
        actor=admin,
        action="org.invite.revoked",
        resource_type="organization_invite",
        resource_id=invite.id,
        request=request,
        diff={"email": invite.email, "phone": invite.phone},
    )
    await db.commit()
    return _invite_out(invite)


@router.post("/me/members/invites/{invite_id}/resend", response_model=OrgMemberInviteResult)
async def resend_member_invite(
    invite_id: uuid.UUID,
    request: Request,
    admin: OrgAdmin,
    db: DB,
) -> OrgMemberInviteResult:
    org = await get_user_org(db, admin)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="organization_not_found")
    try:
        invite, delivery = await resend_org_invite(db, org=org, invite_id=invite_id)
    except OrgMemberError as exc:
        raise _member_error(exc) from exc
    await record_audit(
        db,
        actor=admin,
        action="org.invite.resent",
        resource_type="organization_invite",
        resource_id=invite.id,
        request=request,
        diff=delivery,
    )
    await db.commit()
    return OrgMemberInviteResult(
        status="invited",
        invite=_invite_out(invite),
        delivery=OrgInviteDeliveryOut(**delivery),
    )


@router.get("/me/members/export")
async def export_org_members(admin: OrgAdmin, db: DB) -> Response:
    org = await get_user_org(db, admin)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="organization_not_found")
    csv_body = await export_org_members_csv(db, org.id)
    filename = f"{org.slug}-team.csv"
    return Response(
        content=csv_body,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/me/activity", response_model=Page[AuditLogOut])
async def org_team_activity(
    admin: OrgAdmin,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
) -> Page[AuditLogOut]:
    org = await get_user_org(db, admin)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="organization_not_found")
    rows, total = await list_org_team_audit_logs(db, org_id=org.id, page=page, page_size=page_size)
    items = [
        AuditLogOut(
            id=r.id,
            actor_user_id=r.actor_user_id,
            organization_id=r.organization_id,
            action=r.action,
            resource_type=r.resource_type,
            resource_id=r.resource_id,
            ip=str(r.ip) if r.ip is not None else None,
            user_agent=r.user_agent,
            diff=r.diff,
            created_at=r.created_at,
        )
        for r in rows
    ]
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.post("/me/transfer-ownership", response_model=OrgMemberOut)
async def transfer_ownership(
    payload: OrgTransferOwnership,
    request: Request,
    admin: OrgAdmin,
    db: DB,
) -> OrgMemberOut:
    org = await get_user_org(db, admin)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="organization_not_found")
    try:
        member = await transfer_org_ownership(
            db,
            org=org,
            new_owner_id=payload.new_owner_user_id,
        )
    except OrgMemberError as exc:
        raise _member_error(exc) from exc
    await record_audit(
        db,
        actor=admin,
        action="org.ownership.transfer",
        resource_type="organization",
        resource_id=org.id,
        request=request,
        diff={"new_owner_user_id": str(payload.new_owner_user_id)},
    )
    await db.commit()
    await db.refresh(member)
    return _member_out(member)
