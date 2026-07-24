"""Platform super-admin — user roles and module access rules."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.api.v1.deps import DB, CmsManager, PlatformAdmin
from app.core.security import Role
from app.models.user import User
from app.schemas.planting_program import (
    ProgramAccessRequestAdminOut,
    ProgramAccessRequestReview,
)
from app.schemas.platform import (
    ASSIGNABLE_ROLES,
    ModuleRuleOut,
    ModuleRuleUpdate,
    UserAdminOut,
    UserRoleUpdate,
)
from app.services.audit import record_audit
from app.services.planting_programs.access_requests import (
    AccessRequestError,
    get_access_request,
    list_access_requests,
    review_access_request,
)
from app.services.platform.modules import (
    WEBSITE_CMS_MODULE,
    list_module_rules,
    module_rule_dict,
)

router = APIRouter(prefix="/platform", tags=["platform-admin"])


@router.get("/roles")
async def platform_roles(_manager: CmsManager) -> list[dict[str, str]]:
    return [{"value": role.value, "label": role.value.replace("_", " ").title()} for role in Role]


@router.get("/users", response_model=list[UserAdminOut])
async def platform_list_users(_admin: PlatformAdmin, db: DB) -> list[User]:
    rows = (
        await db.execute(select(User).order_by(User.created_at.desc()).limit(500))
    ).scalars().all()
    return list(rows)


@router.patch("/users/{user_id}", response_model=UserAdminOut)
async def platform_update_user(
    user_id: uuid.UUID,
    payload: UserRoleUpdate,
    request: Request,
    admin: PlatformAdmin,
    db: DB,
) -> User:
    if payload.role not in ASSIGNABLE_ROLES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_role")

    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="user_not_found")

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
    return user


@router.get("/modules", response_model=list[ModuleRuleOut])
async def platform_list_modules(_manager: CmsManager, db: DB) -> list[dict]:
    rules = await list_module_rules(db)
    return [module_rule_dict(r) for r in rules]


@router.patch("/modules/{module_key}", response_model=ModuleRuleOut)
async def platform_update_module(
    module_key: str,
    payload: ModuleRuleUpdate,
    request: Request,
    manager: CmsManager,
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
        admin_note=request.admin_note,
        created_at=request.created_at,
        reviewed_at=request.reviewed_at,
        user_id=request.user_id,
        user_email=request.user.email,
        user_full_name=request.user.full_name,
    )


@router.get("/program-access-requests", response_model=list[ProgramAccessRequestAdminOut])
async def platform_list_program_access_requests(
    _admin: PlatformAdmin,
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
    admin: PlatformAdmin,
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
            },
        )
        await db.commit()
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
