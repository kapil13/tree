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
    CampaApoImportRequest,
    CampaApoImportResultOut,
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
    UserAdminOut,
    UserRoleUpdate,
)
from app.services.audit import record_audit
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
from app.services.platform.impersonation import (
    ImpersonationError,
    admin_tokens_for,
    impersonation_token_for,
    validate_impersonation_target,
)
from app.services.platform.modules import (
    USERS_ADMIN_MODULE,
    WEBSITE_CMS_MODULE,
    list_module_rules,
    module_rule_dict,
)
from app.services.platform.ops import build_ops_summary
from app.services.platform.settings import build_platform_settings
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
    request: Request,
    admin: PlatformAdmin,
    db: DB,
) -> ImpersonationOut:
    target = await db.get(User, user_id)
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="user_not_found")
    try:
        await validate_impersonation_target(db, admin=admin, target=target)
    except ImpersonationError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.code) from exc

    token_data = impersonation_token_for(admin=admin, target=target)
    await record_audit(
        db,
        actor=admin,
        action="platform.user.impersonate",
        resource_type="user",
        resource_id=target.id,
        request=request,
        diff={"email": target.email, "impersonated_by": admin.email},
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

    prev_role = user.role
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
        diff={"email": user.email, "from_role": prev_role, "to_role": user.role},
    )
    await db.commit()
    await db.refresh(user)
    row = await get_platform_user(db, user.id)
    return UserAdminOut.model_validate(row or user)


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
        diff["is_active"] = {"from": org.is_active, "to": payload.is_active}
        org.is_active = payload.is_active
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
