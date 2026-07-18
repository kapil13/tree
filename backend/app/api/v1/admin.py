"""Platform superadmin / admin API."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import Response
from sqlalchemy import func, select

from app.api.v1.deps import DB, CurrentUser, PlatformAdmin, SuperAdmin
from app.core.access import is_platform_admin
from app.core.security import ROLE_PERMISSIONS, Role, hash_password
from app.models.audit import AuditLog
from app.models.bioacoustic_recording import BioacousticRecording
from app.models.organization import Organization
from app.models.planting_compliance_violation import PlantingComplianceViolation
from app.models.planting_project import PlantingProject
from app.models.plantation_fence import PlantationFence
from app.models.platform_module_rule import PlatformModuleRule
from app.models.tree import Tree
from app.models.user import User
from app.schemas.admin import (
    AdminOrgOut,
    AdminOverview,
    AdminPasswordReset,
    AdminUserCreate,
    AdminUserOut,
    AdminUserUpdate,
    AuditLogOut,
    ModuleCatalogItem,
    ModuleRuleOut,
    ModuleRuleUpdate,
    RolePermissionOut,
)
from app.services.admin.audit import write_audit
from app.services.admin.modules import (
    DEFAULT_MODULES,
    ensure_default_modules,
    role_can_access_module,
)

router = APIRouter(prefix="/admin", tags=["admin"])


async def _user_out(db: DB, user: User) -> AdminUserOut:
    org_name = None
    if user.organization_id:
        org = await db.get(Organization, user.organization_id)
        org_name = org.name if org else None
    return AdminUserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        organization_id=user.organization_id,
        organization_name=org_name,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.get("/overview", response_model=AdminOverview)
async def admin_overview(db: DB, _: PlatformAdmin) -> AdminOverview:
    await ensure_default_modules(db)
    users_total = (await db.scalar(select(func.count()).select_from(User))) or 0
    users_active = (
        await db.scalar(select(func.count()).select_from(User).where(User.is_active.is_(True)))
    ) or 0
    role_rows = (await db.execute(select(User.role, func.count()).group_by(User.role))).all()
    users_by_role = {r: c for r, c in role_rows}

    trees_total = (await db.scalar(select(func.count()).select_from(Tree))) or 0
    tree_status_rows = (await db.execute(select(Tree.current_health, func.count()).group_by(Tree.current_health))).all()
    trees_by_status = {str(s or "unknown"): c for s, c in tree_status_rows}

    since = datetime.now(UTC) - timedelta(hours=24)
    audit_24h = (
        await db.scalar(select(func.count()).select_from(AuditLog).where(AuditLog.created_at >= since))
    ) or 0
    open_violations = (
        await db.scalar(
            select(func.count())
            .select_from(PlantingComplianceViolation)
            .where(PlantingComplianceViolation.resolved_at.is_(None))
        )
    ) or 0

    return AdminOverview(
        users_total=users_total,
        users_active=users_active,
        users_by_role=users_by_role,
        organizations_total=(await db.scalar(select(func.count()).select_from(Organization))) or 0,
        trees_total=trees_total,
        trees_by_status=trees_by_status,
        plantation_fences_total=(await db.scalar(select(func.count()).select_from(PlantationFence))) or 0,
        planting_projects_total=(await db.scalar(select(func.count()).select_from(PlantingProject))) or 0,
        bioacoustic_recordings_total=(
            await db.scalar(select(func.count()).select_from(BioacousticRecording))
        )
        or 0,
        compliance_violations_open=open_violations,
        module_rules_total=(await db.scalar(select(func.count()).select_from(PlatformModuleRule))) or 0,
        audit_events_24h=audit_24h,
    )


@router.get("/roles", response_model=list[RolePermissionOut])
async def list_role_permissions(_: PlatformAdmin) -> list[RolePermissionOut]:
    out: list[RolePermissionOut] = []
    for role in Role:
        perms = sorted(ROLE_PERMISSIONS.get(role, set()), key=lambda p: p.value)
        out.append(
            RolePermissionOut(
                role=role.value,
                permissions=[p.value for p in perms],
                is_platform_admin=role in (Role.ADMIN, Role.SUPERADMIN),
            )
        )
    return out


@router.get("/users", response_model=list[AdminUserOut])
async def list_users(
    db: DB,
    _: PlatformAdmin,
    q: str | None = Query(None),
    role: str | None = Query(None),
    organization_id: UUID | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[AdminUserOut]:
    stmt = select(User).order_by(User.created_at.desc())
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where((User.email.ilike(like)) | (User.full_name.ilike(like)))
    if role:
        stmt = stmt.where(User.role == role)
    if organization_id:
        stmt = stmt.where(User.organization_id == organization_id)
    users = (await db.scalars(stmt.offset(offset).limit(limit))).all()
    return [await _user_out(db, u) for u in users]


@router.post("/users", response_model=AdminUserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: AdminUserCreate,
    request: Request,
    db: DB,
    actor: SuperAdmin,
) -> AdminUserOut:
    if body.role in (Role.ADMIN.value, Role.SUPERADMIN.value) and actor.role != Role.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only superadmin can create admin users")
    if await db.scalar(select(User).where(User.email == body.email)):
        raise HTTPException(status_code=400, detail="Email already registered")
    if body.organization_id and not await db.get(Organization, body.organization_id):
        raise HTTPException(status_code=400, detail="Organization not found")
    try:
        Role(body.role)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid role") from exc
    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        role=body.role,
        organization_id=body.organization_id,
        is_active=body.is_active,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    await write_audit(
        db,
        actor_user_id=actor.id,
        action="admin.user.create",
        resource_type="user",
        resource_id=user.id,
        diff={"email": user.email, "role": user.role, "ip": request.client.host if request.client else None},
    )
    await db.commit()
    return await _user_out(db, user)


@router.get("/users/{user_id}", response_model=AdminUserOut)
async def get_user(user_id: UUID, db: DB, _: PlatformAdmin) -> AdminUserOut:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return await _user_out(db, user)


@router.patch("/users/{user_id}", response_model=AdminUserOut)
async def update_user(
    user_id: UUID,
    body: AdminUserUpdate,
    request: Request,
    db: DB,
    actor: SuperAdmin,
) -> AdminUserOut:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.role in (Role.ADMIN.value, Role.SUPERADMIN.value) and actor.role != Role.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only superadmin can assign admin roles")
    if user.id == actor.id and body.is_active is False:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    if body.email and body.email != user.email:
        if await db.scalar(select(User).where(User.email == body.email)):
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = body.email
    if body.full_name is not None:
        user.full_name = body.full_name
    if body.role is not None:
        try:
            Role(body.role)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid role") from exc
        user.role = body.role
    if body.organization_id is not None:
        if body.organization_id and not await db.get(Organization, body.organization_id):
            raise HTTPException(status_code=400, detail="Organization not found")
        user.organization_id = body.organization_id
    if body.is_active is not None:
        user.is_active = body.is_active
    await db.commit()
    await db.refresh(user)
    await write_audit(
        db,
        actor_user_id=actor.id,
        action="admin.user.update",
        resource_type="user",
        resource_id=user.id,
        diff={**body.model_dump(exclude_unset=True), "ip": request.client.host if request.client else None},
    )
    await db.commit()
    return await _user_out(db, user)


@router.post("/users/{user_id}/password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_user_password(
    user_id: UUID,
    body: AdminPasswordReset,
    request: Request,
    db: DB,
    actor: SuperAdmin,
) -> Response:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = hash_password(body.new_password)
    await db.commit()
    await write_audit(
        db,
        actor_user_id=actor.id,
        action="admin.user.password_reset",
        resource_type="user",
        resource_id=user.id,
        diff={"target_email": user.email, "ip": request.client.host if request.client else None},
    )
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/organizations", response_model=list[AdminOrgOut])
async def list_organizations(
    db: DB,
    _: PlatformAdmin,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[AdminOrgOut]:
    orgs = (
        await db.scalars(
            select(Organization).order_by(Organization.created_at.desc()).offset(offset).limit(limit)
        )
    ).all()
    out: list[AdminOrgOut] = []
    for org in orgs:
        user_count = (
            await db.scalar(select(func.count()).select_from(User).where(User.organization_id == org.id))
        ) or 0
        tree_count = (
            await db.scalar(select(func.count()).select_from(Tree).where(Tree.organization_id == org.id))
        ) or 0
        fence_count = (
            await db.scalar(
                select(func.count()).select_from(PlantationFence).where(PlantationFence.organization_id == org.id)
            )
        ) or 0
        out.append(
            AdminOrgOut(
                id=org.id,
                name=org.name,
                slug=org.slug,
                created_at=org.created_at,
                user_count=user_count,
                tree_count=tree_count,
                plantation_fence_count=fence_count,
            )
        )
    return out


@router.get("/modules/catalog", response_model=list[ModuleCatalogItem])
async def module_catalog(_: PlatformAdmin) -> list[ModuleCatalogItem]:
    return [ModuleCatalogItem(**item) for item in DEFAULT_MODULES]


@router.get("/modules/rules", response_model=list[ModuleRuleOut])
async def list_module_rules(db: DB, _: PlatformAdmin) -> list[ModuleRuleOut]:
    await ensure_default_modules(db)
    await db.commit()
    rules = (
        await db.scalars(select(PlatformModuleRule).order_by(PlatformModuleRule.module_key))
    ).all()
    return [
        ModuleRuleOut(
            id=r.id,
            module_key=r.module_key,
            label=r.label,
            description=r.description,
            enabled=r.enabled,
            allowed_roles=r.allowed_roles or [],
            config=r.config or {},
            updated_at=r.updated_at,
        )
        for r in rules
    ]


@router.patch("/modules/rules/{module_key}", response_model=ModuleRuleOut)
async def update_module_rule(
    module_key: str,
    body: ModuleRuleUpdate,
    request: Request,
    db: DB,
    actor: SuperAdmin,
) -> ModuleRuleOut:
    await ensure_default_modules(db)
    rule = await db.scalar(select(PlatformModuleRule).where(PlatformModuleRule.module_key == module_key))
    if not rule:
        raise HTTPException(status_code=404, detail="Module rule not found")
    if body.allowed_roles is not None:
        for role in body.allowed_roles:
            try:
                Role(role)
            except ValueError as exc:
                raise HTTPException(status_code=400, detail=f"Invalid role: {role}") from exc
        rule.allowed_roles = body.allowed_roles
    if body.enabled is not None:
        rule.enabled = body.enabled
    if body.label is not None:
        rule.label = body.label
    if body.description is not None:
        rule.description = body.description
    if body.config is not None:
        rule.config = body.config
    await db.commit()
    await db.refresh(rule)
    await write_audit(
        db,
        actor_user_id=actor.id,
        action="admin.module_rule.update",
        resource_type="platform_module_rule",
        resource_id=rule.id,
        diff={
            "module_key": module_key,
            **body.model_dump(exclude_unset=True),
            "ip": request.client.host if request.client else None,
        },
    )
    await db.commit()
    return ModuleRuleOut(
        id=rule.id,
        module_key=rule.module_key,
        label=rule.label,
        description=rule.description,
        enabled=rule.enabled,
        allowed_roles=rule.allowed_roles or [],
        config=rule.config or {},
        updated_at=rule.updated_at,
    )


@router.get("/modules/access-check")
async def check_module_access(
    module_key: str = Query(...),
    db: DB = ...,
    user: CurrentUser = ...,
) -> dict:
    if is_platform_admin(user):
        return {"module_key": module_key, "allowed": True, "reason": "platform_admin"}
    await ensure_default_modules(db)
    rule = await db.scalar(select(PlatformModuleRule).where(PlatformModuleRule.module_key == module_key))
    if not rule:
        return {"module_key": module_key, "allowed": False, "reason": "unknown_module"}
    allowed = role_can_access_module(user.role, rule)
    return {
        "module_key": module_key,
        "allowed": allowed,
        "reason": "ok" if allowed else "insufficient_role",
        "allowed_roles": rule.allowed_roles,
        "enabled": rule.enabled,
    }


@router.get("/audit-logs", response_model=list[AuditLogOut])
async def list_audit_logs(
    db: DB,
    _: PlatformAdmin,
    action: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[AuditLogOut]:
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc())
    if action:
        stmt = stmt.where(AuditLog.action.ilike(f"%{action}%"))
    logs = (await db.scalars(stmt.offset(offset).limit(limit))).all()
    out: list[AuditLogOut] = []
    for log in logs:
        email = None
        if log.actor_user_id:
            u = await db.get(User, log.actor_user_id)
            email = u.email if u else None
        out.append(
            AuditLogOut(
                id=log.id,
                actor_user_id=log.actor_user_id,
                actor_email=email,
                action=log.action,
                resource_type=log.resource_type,
                resource_id=log.resource_id,
                diff=log.diff,
                ip=str(log.ip) if log.ip else None,
                created_at=log.created_at,
            )
        )
    return out
