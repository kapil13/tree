"""Platform super-admin — user roles and module access rules."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import PlainTextResponse
from fastapi.security import HTTPAuthorizationCredentials

from app.api.v1.deps import (
    DB,
    AnyPlatformModule,
    BillingModuleAdmin,
    CmsManager,
    OpsModuleAdmin,
    PlatformAdmin,
    ProgramAccessModuleAdmin,
    UsersModuleAdmin,
    bearer_scheme,
)
from app.core.security import (
    Permission,
    Role,
    TokenType,
    all_permission_labels,
    decode_token,
    has_permission,
    permissions_matrix,
)
from app.models.organization import Organization
from app.models.user import User
from app.schemas.common import Page
from app.schemas.planting_program import (
    ProgramAccessRequestAdminOut,
    ProgramAccessRequestReview,
)
from app.schemas.platform import (
    ASSIGNABLE_ROLES,
    BulkActionResultOut,
    BulkOrgActionRequest,
    BulkUserActionRequest,
    CampaApoImportRequest,
    CampaApoImportResultOut,
    ImpersonateRequest,
    ImpersonationOut,
    ModuleRuleOut,
    ModuleRuleUpdate,
    OrganizationAdminDetailOut,
    OrganizationAdminOut,
    OrganizationAdminUpdate,
    OrgMemberAdminOut,
    OrgProjectAdminOut,
    PaymentOrderAdminOut,
    PermissionMatrixOut,
    PlatformAuditLogOut,
    PlatformBillingSummaryOut,
    PlatformOpsSummaryOut,
    PlatformOverviewOut,
    PlatformSchemeSummaryOut,
    PlatformSettingsOut,
    ResendVerificationRequest,
    StepUpPasswordRequest,
    SupportActionOut,
    UserAdminOut,
    UserPlatformGrantsOut,
    UserPlatformGrantsUpdate,
    UserRoleUpdate,
)
from app.services.audit import record_audit
from app.services.organizations.members import OrgMemberError, transfer_org_ownership
from app.services.organizations.onboarding import (
    OrgOnboardingError,
    onboard_user_on_program_approval,
)
from app.services.planting_programs.access_notifications import notify_user_access_request_decision
from app.services.planting_programs.access_requests import (
    AccessRequestError,
    get_access_request,
    list_access_requests,
    review_access_request,
)
from app.services.platform.admin import (
    build_platform_overview,
    get_platform_organization,
    get_platform_user,
    query_org_members_for_admin,
    query_org_projects_for_admin,
    query_platform_organizations,
    query_platform_users,
)
from app.services.platform.audit import export_platform_audit_csv, query_platform_audit_logs
from app.services.platform.billing import build_billing_summary, query_payment_orders
from app.services.platform.bulk_ops import (
    BulkOpsError,
    bulk_update_organizations,
    bulk_update_users,
    revoke_org_member_sessions,
)
from app.services.platform.exports import (
    export_platform_org_members_csv,
    export_platform_organizations_csv,
    export_platform_users_csv,
)
from app.services.platform.grants import (
    list_user_module_grants,
    set_user_module_grants,
)
from app.services.platform.impersonation import (
    ImpersonationError,
    admin_tokens_for,
    impersonation_token_for,
    validate_impersonation_target,
)
from app.services.platform.modules import (
    ALL_PLATFORM_MODULES,
    USERS_ADMIN_MODULE,
    WEBSITE_CMS_MODULE,
    build_platform_access_map,
    list_module_rules,
    module_rule_dict,
)
from app.services.platform.ops import build_ops_summary
from app.services.platform.settings import build_platform_settings
from app.services.platform.step_up import verify_admin_step_up
from app.services.platform.support import (
    SupportActionError,
    admin_force_password_reset,
    admin_resend_verification,
    admin_revoke_sessions,
)
from app.services.schemes.imports.campa_apo_csv import (
    apply_apo_rows_to_projects,
    parse_campa_apo_csv,
)
from app.services.schemes.summary import build_platform_scheme_summary

router = APIRouter(prefix="/platform", tags=["platform-admin"])


@router.get("/overview", response_model=PlatformOverviewOut)
async def platform_overview(_access: AnyPlatformModule, db: DB) -> PlatformOverviewOut:
    """Counts for platform admin dashboard."""
    return PlatformOverviewOut.model_validate(await build_platform_overview(db))


@router.get("/permissions", response_model=PermissionMatrixOut)
async def platform_permissions(_access: AnyPlatformModule) -> PermissionMatrixOut:
    return PermissionMatrixOut(
        permissions=all_permission_labels(),
        roles=permissions_matrix(),
    )


@router.get("/billing/summary", response_model=PlatformBillingSummaryOut)
async def platform_billing_summary(_admin: BillingModuleAdmin, db: DB) -> PlatformBillingSummaryOut:
    return PlatformBillingSummaryOut.model_validate(await build_billing_summary(db))


@router.get("/billing/orders", response_model=Page[PaymentOrderAdminOut])
async def platform_billing_orders(
    _admin: BillingModuleAdmin,
    db: DB,
    status: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> Page[PaymentOrderAdminOut]:
    items, total = await query_payment_orders(db, status=status, page=page, page_size=page_size)
    return Page(
        items=[PaymentOrderAdminOut.model_validate(i) for i in items],
        total=total,
        page=max(page, 1),
        page_size=min(max(page_size, 1), 100),
    )


@router.get("/ops/summary", response_model=PlatformOpsSummaryOut)
async def platform_ops_summary(_admin: OpsModuleAdmin, db: DB) -> PlatformOpsSummaryOut:
    return PlatformOpsSummaryOut.model_validate(await build_ops_summary(db))


@router.get("/settings", response_model=PlatformSettingsOut)
async def platform_settings(_admin: OpsModuleAdmin) -> PlatformSettingsOut:
    return PlatformSettingsOut.model_validate(build_platform_settings())


@router.get("/audit/logs", response_model=Page[PlatformAuditLogOut])
async def platform_audit_logs(
    _admin: UsersModuleAdmin,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    action: str | None = None,
    action_prefix: str | None = None,
    resource_type: str | None = None,
    organization_id: uuid.UUID | None = None,
    actor_user_id: uuid.UUID | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    search: str | None = None,
) -> Page[PlatformAuditLogOut]:
    items, total = await query_platform_audit_logs(
        db,
        page=page,
        page_size=page_size,
        action=action,
        action_prefix=action_prefix,
        resource_type=resource_type,
        organization_id=organization_id,
        actor_user_id=actor_user_id,
        date_from=date_from,
        date_to=date_to,
        search=search,
    )
    return Page(
        items=[PlatformAuditLogOut.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/audit/export")
async def platform_audit_export(
    _admin: UsersModuleAdmin,
    db: DB,
    action_prefix: str | None = None,
    organization_id: uuid.UUID | None = None,
    actor_user_id: uuid.UUID | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    search: str | None = None,
) -> PlainTextResponse:
    csv_text = await export_platform_audit_csv(
        db,
        action_prefix=action_prefix,
        organization_id=organization_id,
        actor_user_id=actor_user_id,
        date_from=date_from,
        date_to=date_to,
        search=search,
    )
    return PlainTextResponse(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=platform-audit.csv"},
    )


@router.post("/users/{user_id}/impersonate", response_model=ImpersonationOut)
async def platform_impersonate_user(
    user_id: uuid.UUID,
    payload: ImpersonateRequest,
    request: Request,
    admin: PlatformAdmin,
    db: DB,
) -> ImpersonationOut:
    verify_admin_step_up(admin, payload.password)
    target = await db.get(User, user_id)
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="user_not_found")
    try:
        await validate_impersonation_target(db, admin=admin, target=target)
    except ImpersonationError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.code) from exc

    token_data = impersonation_token_for(admin=admin, target=target, read_only=payload.read_only)
    await record_audit(
        db,
        actor=admin,
        action="platform.user.impersonate",
        resource_type="user",
        resource_id=target.id,
        request=request,
        diff={
            "email": target.email,
            "impersonated_by": admin.email,
            "reason": payload.reason,
            "read_only": payload.read_only,
        },
    )
    await db.commit()
    row = await get_platform_user(db, target.id)
    return ImpersonationOut(
        **token_data,
        target_user=UserAdminOut.model_validate(row or target),
    )


@router.post("/impersonation/stop")
async def platform_stop_impersonation(
    request: Request,
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: DB,
) -> dict:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="missing_token")
    try:
        payload = decode_token(creds.credentials)
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid_token") from None
    if payload.get("type") != TokenType.ACCESS.value:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="wrong_token_type")
    admin_id = payload.get("imp_by")
    if not admin_id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="not_impersonating")

    admin = await db.get(User, uuid.UUID(admin_id))
    if admin is None or not admin.is_active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="admin_not_found")

    target_id = payload.get("sub")
    await record_audit(
        db,
        actor=admin,
        action="platform.user.impersonate_stop",
        resource_type="user",
        resource_id=uuid.UUID(target_id) if target_id else None,
        request=request,
        diff={"admin_email": admin.email},
    )
    await db.commit()
    return admin_tokens_for(admin)


@router.get("/roles")
async def platform_roles(_manager: CmsManager) -> list[dict[str, str]]:
    return [{"value": role.value, "label": role.value.replace("_", " ").title()} for role in Role]


@router.get("/users", response_model=Page[UserAdminOut])
async def platform_list_users(
    _admin: UsersModuleAdmin,
    db: DB,
    search: str = "",
    role: str | None = None,
    is_active: bool | None = None,
    page: int = 1,
    page_size: int = 50,
) -> Page[UserAdminOut]:
    items, total = await query_platform_users(
        db,
        search=search,
        role=role,
        is_active=is_active,
        page=page,
        page_size=page_size,
    )
    return Page(
        items=[UserAdminOut.model_validate(i) for i in items],
        total=total,
        page=max(page, 1),
        page_size=min(max(page_size, 1), 100),
    )


@router.get("/users/export")
async def platform_export_users(
    _admin: UsersModuleAdmin,
    db: DB,
    search: str = "",
    role: str | None = None,
    is_active: bool | None = None,
) -> PlainTextResponse:
    csv_text = await export_platform_users_csv(
        db, search=search, role=role, is_active=is_active
    )
    return PlainTextResponse(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=platform-users.csv"},
    )


@router.post("/users/bulk-action", response_model=BulkActionResultOut)
async def platform_bulk_user_action(
    payload: BulkUserActionRequest,
    request: Request,
    admin: UsersModuleAdmin,
    db: DB,
) -> BulkActionResultOut:
    verify_admin_step_up(admin, payload.password)
    try:
        result = await bulk_update_users(
            db, actor=admin, user_ids=payload.user_ids, action=payload.action
        )
    except BulkOpsError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.code) from exc
    await record_audit(
        db,
        actor=admin,
        action=f"platform.user.bulk_{payload.action}",
        resource_type="user",
        resource_id=None,
        request=request,
        diff={
            "user_ids": [str(uid) for uid in payload.user_ids],
            "action": payload.action,
            **result,
        },
    )
    await db.commit()
    return BulkActionResultOut.model_validate(result)


@router.get("/users/{user_id}", response_model=UserAdminOut)
async def platform_get_user(
    user_id: uuid.UUID,
    _admin: UsersModuleAdmin,
    db: DB,
) -> UserAdminOut:
    row = await get_platform_user(db, user_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="user_not_found")
    return UserAdminOut.model_validate(row)


@router.patch("/users/{user_id}", response_model=UserAdminOut)
async def platform_update_user(
    user_id: uuid.UUID,
    payload: UserRoleUpdate,
    request: Request,
    admin: UsersModuleAdmin,
    db: DB,
) -> User:
    if payload.role not in ASSIGNABLE_ROLES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_role")

    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="user_not_found")

    is_full_admin = has_permission(admin.role, Permission.ADMIN_ALL)
    if not is_full_admin and (payload.role == "admin" or user.role == "admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="cannot_modify_admin_role")

    if user.id == admin.id and payload.role != "admin":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="cannot_demote_self")
    if user.id == admin.id and payload.is_active is False:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="cannot_deactivate_self")

    role_changing = payload.role != user.role
    active_changing = payload.is_active is not None and payload.is_active != user.is_active
    sensitive = payload.role == "admin" or user.role == "admin" or payload.is_active is False
    if (role_changing or active_changing) and sensitive:
        verify_admin_step_up(admin, payload.password_confirm)

    prev_role = user.role
    prev_active = user.is_active
    user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active

    await record_audit(
        db,
        actor=admin,
        action="platform.user.role_update",
        resource_type="user",
        resource_id=user.id,
        request=request,
        diff={
            "email": user.email,
            "from_role": prev_role,
            "to_role": user.role,
            "from_active": prev_active,
            "to_active": user.is_active,
        },
    )
    await db.commit()
    await db.refresh(user)
    row = await get_platform_user(db, user.id)
    return UserAdminOut.model_validate(row or user)


@router.get("/users/{user_id}/platform-grants", response_model=UserPlatformGrantsOut)
async def platform_get_user_grants(
    user_id: uuid.UUID,
    admin: PlatformAdmin,
    db: DB,
) -> UserPlatformGrantsOut:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="user_not_found")
    user_grants = await list_user_module_grants(db, user.id)
    role_modules = await build_platform_access_map(db, role=user.role, user_id=None)
    effective = await build_platform_access_map(db, role=user.role, user_id=user.id)
    return UserPlatformGrantsOut(
        user_id=user.id,
        role=user.role,
        role_modules=role_modules,
        user_grants=user_grants,
        effective_access=effective,
    )


@router.put("/users/{user_id}/platform-grants", response_model=UserPlatformGrantsOut)
async def platform_update_user_grants(
    user_id: uuid.UUID,
    payload: UserPlatformGrantsUpdate,
    request: Request,
    admin: PlatformAdmin,
    db: DB,
) -> UserPlatformGrantsOut:
    verify_admin_step_up(admin, payload.password)
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="user_not_found")
    if user.role == "admin":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="admin_has_full_access")

    prev = await list_user_module_grants(db, user.id)
    cleaned = [key for key in payload.module_keys if key in ALL_PLATFORM_MODULES]
    await set_user_module_grants(
        db, user_id=user.id, module_keys=cleaned, granted_by_user_id=admin.id
    )
    await record_audit(
        db,
        actor=admin,
        action="platform.user.grants_update",
        resource_type="user",
        resource_id=user.id,
        request=request,
        diff={"email": user.email, "from": prev, "to": cleaned},
    )
    await db.commit()

    role_modules = await build_platform_access_map(db, role=user.role, user_id=None)
    effective = await build_platform_access_map(db, role=user.role, user_id=user.id)
    return UserPlatformGrantsOut(
        user_id=user.id,
        role=user.role,
        role_modules=role_modules,
        user_grants=cleaned,
        effective_access=effective,
    )


@router.post("/users/{user_id}/force-password-reset", response_model=SupportActionOut)
async def platform_force_password_reset(
    user_id: uuid.UUID,
    payload: StepUpPasswordRequest,
    request: Request,
    admin: UsersModuleAdmin,
    db: DB,
) -> SupportActionOut:
    verify_admin_step_up(admin, payload.password)
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="user_not_found")
    try:
        dev_hint = await admin_force_password_reset(db, user)
    except SupportActionError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.code) from exc
    await record_audit(
        db,
        actor=admin,
        action="platform.user.force_password_reset",
        resource_type="user",
        resource_id=user.id,
        request=request,
        diff={"email": user.email},
    )
    await db.commit()
    return SupportActionOut(dev_hint=dev_hint)


@router.post("/users/{user_id}/resend-verification", response_model=SupportActionOut)
async def platform_resend_verification(
    user_id: uuid.UUID,
    payload: ResendVerificationRequest,
    request: Request,
    admin: UsersModuleAdmin,
    db: DB,
) -> SupportActionOut:
    verify_admin_step_up(admin, payload.password)
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="user_not_found")
    try:
        dev_hint = await admin_resend_verification(
            db, user, mark_verified=payload.mark_verified
        )
    except SupportActionError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.code) from exc
    await record_audit(
        db,
        actor=admin,
        action="platform.user.mark_verified"
        if payload.mark_verified
        else "platform.user.resend_verification",
        resource_type="user",
        resource_id=user.id,
        request=request,
        diff={"email": user.email, "mark_verified": payload.mark_verified},
    )
    await db.commit()
    return SupportActionOut(dev_hint=dev_hint)


@router.post("/users/{user_id}/revoke-sessions", response_model=SupportActionOut)
async def platform_revoke_sessions(
    user_id: uuid.UUID,
    payload: StepUpPasswordRequest,
    request: Request,
    admin: UsersModuleAdmin,
    db: DB,
) -> SupportActionOut:
    verify_admin_step_up(admin, payload.password)
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="user_not_found")
    invalidated_at = admin_revoke_sessions(user)
    await record_audit(
        db,
        actor=admin,
        action="platform.user.revoke_sessions",
        resource_type="user",
        resource_id=user.id,
        request=request,
        diff={"email": user.email, "invalidated_at": invalidated_at.isoformat()},
    )
    await db.commit()
    return SupportActionOut()


@router.get("/modules", response_model=list[ModuleRuleOut])
async def platform_list_modules(_access: AnyPlatformModule, db: DB) -> list[dict]:
    rules = await list_module_rules(db)
    return [module_rule_dict(r) for r in rules]


@router.patch("/modules/{module_key}", response_model=ModuleRuleOut)
async def platform_update_module(
    module_key: str,
    payload: ModuleRuleUpdate,
    request: Request,
    manager: PlatformAdmin,
    db: DB,
) -> dict:
    rules = await list_module_rules(db)
    rule = next((r for r in rules if r.module_key == module_key), None)
    if rule is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="module_not_found")

    if payload.enabled is not None:
        rule.enabled = payload.enabled
    if payload.allowed_roles is not None:
        cleaned = [r for r in payload.allowed_roles if r in ASSIGNABLE_ROLES]
        if module_key == WEBSITE_CMS_MODULE and "admin" not in cleaned:
            cleaned.append("admin")
        if module_key == USERS_ADMIN_MODULE and "admin" not in cleaned:
            cleaned.append("admin")
        rule.allowed_roles = cleaned

    await record_audit(
        db,
        actor=manager,
        action="platform.module.update",
        resource_type="platform_module_rule",
        resource_id=rule.id,
        request=request,
        diff={"module_key": module_key, "allowed_roles": rule.allowed_roles},
    )
    await db.commit()
    await db.refresh(rule)
    return module_rule_dict(rule)


def _access_request_admin_out(request) -> ProgramAccessRequestAdminOut:
    return ProgramAccessRequestAdminOut(
        id=request.id,
        program_code=request.program.code,
        program_name=request.program.name,
        status=request.status,
        message=request.message,
        org_profile=request.org_profile,
        admin_note=request.admin_note,
        created_at=request.created_at,
        reviewed_at=request.reviewed_at,
        user_id=request.user_id,
        user_email=request.user.email,
        user_full_name=request.user.full_name,
        user_phone=request.user.phone,
    )


@router.get("/organizations", response_model=Page[OrganizationAdminOut])
async def platform_list_organizations(
    _admin: UsersModuleAdmin,
    db: DB,
    search: str = "",
    is_active: bool | None = None,
    page: int = 1,
    page_size: int = 50,
) -> Page[OrganizationAdminOut]:
    items, total = await query_platform_organizations(
        db, search=search, is_active=is_active, page=page, page_size=page_size
    )
    return Page(
        items=[OrganizationAdminOut.model_validate(i) for i in items],
        total=total,
        page=max(page, 1),
        page_size=min(max(page_size, 1), 100),
    )


@router.get("/organizations/export")
async def platform_export_organizations(
    _admin: UsersModuleAdmin,
    db: DB,
    search: str = "",
    is_active: bool | None = None,
) -> PlainTextResponse:
    csv_text = await export_platform_organizations_csv(
        db, search=search, is_active=is_active
    )
    return PlainTextResponse(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=platform-organizations.csv"},
    )


@router.post("/organizations/bulk-action", response_model=BulkActionResultOut)
async def platform_bulk_org_action(
    payload: BulkOrgActionRequest,
    request: Request,
    admin: UsersModuleAdmin,
    db: DB,
) -> BulkActionResultOut:
    if payload.is_active is False:
        verify_admin_step_up(admin, payload.password)
    try:
        result = await bulk_update_organizations(
            db,
            org_ids=payload.org_ids,
            is_active=payload.is_active,
            revoke_member_sessions=payload.revoke_member_sessions,
        )
    except BulkOpsError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.code) from exc
    await record_audit(
        db,
        actor=admin,
        action="platform.organization.bulk_activate"
        if payload.is_active
        else "platform.organization.bulk_suspend",
        resource_type="organization",
        resource_id=None,
        request=request,
        diff={
            "org_ids": [str(oid) for oid in payload.org_ids],
            "reason": payload.reason,
            "revoke_member_sessions": payload.revoke_member_sessions,
            **result,
        },
    )
    await db.commit()
    return BulkActionResultOut.model_validate(result)


@router.get("/organizations/{org_id}", response_model=OrganizationAdminDetailOut)
async def platform_get_organization(
    org_id: uuid.UUID,
    _admin: UsersModuleAdmin,
    db: DB,
) -> OrganizationAdminDetailOut:
    row = await get_platform_organization(db, org_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="organization_not_found")
    return OrganizationAdminDetailOut.model_validate(row)


@router.patch("/organizations/{org_id}", response_model=OrganizationAdminDetailOut)
async def platform_update_organization(
    org_id: uuid.UUID,
    payload: OrganizationAdminUpdate,
    request: Request,
    admin: UsersModuleAdmin,
    db: DB,
) -> OrganizationAdminDetailOut:
    org = await db.get(Organization, org_id)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="organization_not_found")
    diff: dict = {}
    if payload.name is not None:
        diff["name"] = {"from": org.name, "to": payload.name}
        org.name = payload.name.strip()
    if payload.is_active is not None:
        if payload.is_active is False and org.is_active:
            verify_admin_step_up(admin, payload.password_confirm)
        diff["is_active"] = {"from": org.is_active, "to": payload.is_active}
        if payload.reason:
            diff["reason"] = payload.reason
        org.is_active = payload.is_active
        if payload.is_active is False and payload.revoke_member_sessions:
            revoked = await revoke_org_member_sessions(db, org.id)
            diff["member_sessions_revoked"] = revoked
    if payload.owner_user_id is not None and payload.owner_user_id != org.owner_user_id:
        verify_admin_step_up(admin, payload.password_confirm)
        prev_owner = org.owner_user_id
        try:
            new_owner = await transfer_org_ownership(
                db, org=org, new_owner_id=payload.owner_user_id
            )
        except OrgMemberError as exc:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.code) from exc
        diff["owner_user_id"] = {
            "from": str(prev_owner) if prev_owner else None,
            "to": str(new_owner.id),
            "owner_email": new_owner.email,
        }
    await record_audit(
        db,
        actor=admin,
        action="platform.organization.update",
        resource_type="organization",
        resource_id=org.id,
        request=request,
        diff=diff,
    )
    await db.commit()
    row = await get_platform_organization(db, org.id)
    return OrganizationAdminDetailOut.model_validate(row)


@router.get("/organizations/{org_id}/members/export")
async def platform_export_org_members(
    org_id: uuid.UUID,
    _admin: UsersModuleAdmin,
    db: DB,
) -> PlainTextResponse:
    if await get_platform_organization(db, org_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="organization_not_found")
    csv_text = await export_platform_org_members_csv(db, org_id)
    return PlainTextResponse(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=org-{org_id}-members.csv"},
    )


@router.get("/organizations/{org_id}/members", response_model=Page[OrgMemberAdminOut])
async def platform_list_org_members(
    org_id: uuid.UUID,
    _admin: UsersModuleAdmin,
    db: DB,
    page: int = 1,
    page_size: int = 50,
) -> Page[OrgMemberAdminOut]:
    if await get_platform_organization(db, org_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="organization_not_found")
    items, total = await query_org_members_for_admin(db, org_id, page=page, page_size=page_size)
    return Page(
        items=[OrgMemberAdminOut.model_validate(i) for i in items],
        total=total,
        page=max(page, 1),
        page_size=min(max(page_size, 1), 100),
    )


@router.get("/organizations/{org_id}/projects", response_model=Page[OrgProjectAdminOut])
async def platform_list_org_projects(
    org_id: uuid.UUID,
    _admin: UsersModuleAdmin,
    db: DB,
    page: int = 1,
    page_size: int = 50,
) -> Page[OrgProjectAdminOut]:
    if await get_platform_organization(db, org_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="organization_not_found")
    items, total = await query_org_projects_for_admin(db, org_id, page=page, page_size=page_size)
    return Page(
        items=[OrgProjectAdminOut.model_validate(i) for i in items],
        total=total,
        page=max(page, 1),
        page_size=min(max(page_size, 1), 100),
    )


@router.get("/program-access-requests", response_model=list[ProgramAccessRequestAdminOut])
async def platform_list_program_access_requests(
    _admin: ProgramAccessModuleAdmin,
    db: DB,
    status: str = "pending",
) -> list[ProgramAccessRequestAdminOut]:
    requests = await list_access_requests(db, status=status or None)
    return [_access_request_admin_out(r) for r in requests]


@router.patch(
    "/program-access-requests/{request_id}",
    response_model=ProgramAccessRequestAdminOut,
)
async def platform_review_program_access_request(
    request_id: uuid.UUID,
    payload: ProgramAccessRequestReview,
    request: Request,
    admin: ProgramAccessModuleAdmin,
    db: DB,
) -> ProgramAccessRequestAdminOut:
    try:
        reviewed = await review_access_request(
            db,
            request_id=request_id,
            reviewer_id=admin.id,
            action=payload.action,
            admin_note=payload.admin_note,
        )
        if payload.action == "approve":
            row = await get_access_request(db, request_id)
            assert row is not None
            try:
                org = await onboard_user_on_program_approval(
                    db,
                    request=row,
                    user=row.user,
                    organization_name=payload.organization_name,
                    organization_slug=payload.organization_slug,
                    organization_id=payload.organization_id,
                    platform_role=payload.platform_role,
                    make_org_admin=payload.make_org_admin,
                )
                org_diff = {"organization_id": str(org.id), "organization_name": org.name}
            except OrgOnboardingError as exc:
                raise HTTPException(
                    status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.code
                ) from exc
        else:
            org_diff = {}
        await record_audit(
            db,
            actor=admin,
            action=f"platform.program_access.{payload.action}",
            resource_type="program_access_request",
            resource_id=reviewed.id,
            request=request,
            diff={
                "program_code": reviewed.program.code,
                "user_id": str(reviewed.user_id),
                "admin_note": payload.admin_note,
                **org_diff,
            },
        )
        await db.commit()
        row = await get_access_request(db, request_id)
        if row is not None:
            await notify_user_access_request_decision(request=row, action=payload.action)
    except AccessRequestError as exc:
        status_code = (
            status.HTTP_404_NOT_FOUND
            if exc.code == "request_not_found"
            else status.HTTP_422_UNPROCESSABLE_ENTITY
        )
        raise HTTPException(status_code, detail=exc.code) from exc

    row = await get_access_request(db, request_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="request_not_found")
    return _access_request_admin_out(row)


@router.get("/schemes/summary", response_model=PlatformSchemeSummaryOut)
async def platform_scheme_summary(_admin: OpsModuleAdmin, db: DB) -> PlatformSchemeSummaryOut:
    """Roll up planting projects and trees by central govt scheme."""
    return PlatformSchemeSummaryOut.model_validate(await build_platform_scheme_summary(db))


@router.post("/schemes/apo-import", response_model=CampaApoImportResultOut)
async def platform_campa_apo_import(
    payload: CampaApoImportRequest,
    request: Request,
    admin: OpsModuleAdmin,
    db: DB,
) -> CampaApoImportResultOut:
    """Import State CAMPA APO rows and link PCA references to planting projects by code."""
    from sqlalchemy import select

    from app.models.planting_project import PlantingProject

    rows, parse_errors = parse_campa_apo_csv(payload.csv_text)
    if parse_errors and not rows:
        return CampaApoImportResultOut(imported=0, parse_errors=parse_errors)

    project_codes = [row["project_code"] for row in rows]
    projects = list(
        (
            await db.execute(
                select(PlantingProject).where(PlantingProject.code.in_(project_codes))
            )
        ).scalars().all()
    )
    applied, unmatched = apply_apo_rows_to_projects(projects, rows)

    await record_audit(
        db,
        actor=admin,
        action="platform.scheme.apo_import",
        resource_type="planting_project",
        resource_id=None,
        request=request,
        diff={"imported": len(applied), "unmatched": unmatched},
    )
    await db.commit()

    return CampaApoImportResultOut(
        imported=len(applied),
        unmatched=unmatched,
        parse_errors=parse_errors,
        applied=applied,
    )
