"""Platform module rules — seed defaults and evaluate role access."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.platform_module import PlatformModuleRule

WEBSITE_CMS_MODULE = "website_cms"
USERS_ADMIN_MODULE = "users_admin"
PROGRAM_ACCESS_ADMIN_MODULE = "program_access_admin"
BILLING_ADMIN_MODULE = "billing_admin"
OPS_ADMIN_MODULE = "ops_admin"

ALL_PLATFORM_MODULES = (
    WEBSITE_CMS_MODULE,
    USERS_ADMIN_MODULE,
    PROGRAM_ACCESS_ADMIN_MODULE,
    BILLING_ADMIN_MODULE,
    OPS_ADMIN_MODULE,
)

DEFAULT_MODULES: list[dict] = [
    {
        "module_key": WEBSITE_CMS_MODULE,
        "label": "Website CMS",
        "description": "Manage aranyix.tech marketing site — header, footer, pages, and sections.",
        "enabled": True,
        "allowed_roles": ["admin"],
    },
    {
        "module_key": USERS_ADMIN_MODULE,
        "label": "User administration",
        "description": "Manage platform users, organizations, and audit log (cannot grant admin role).",
        "enabled": True,
        "allowed_roles": ["admin"],
    },
    {
        "module_key": PROGRAM_ACCESS_ADMIN_MODULE,
        "label": "Program access queue",
        "description": "Approve or reject professional program enrollment requests.",
        "enabled": True,
        "allowed_roles": ["admin"],
    },
    {
        "module_key": BILLING_ADMIN_MODULE,
        "label": "Billing & credits",
        "description": "View payment orders and AI scan wallet usage.",
        "enabled": True,
        "allowed_roles": ["admin"],
    },
    {
        "module_key": OPS_ADMIN_MODULE,
        "label": "Operations",
        "description": "Worker health, integrations status, and job run visibility.",
        "enabled": True,
        "allowed_roles": ["admin"],
    },
]


async def ensure_platform_modules_seeded(db: AsyncSession) -> None:
    existing_keys = set(
        (await db.execute(select(PlatformModuleRule.module_key))).scalars().all()
    )
    added = False
    for row in DEFAULT_MODULES:
        if row["module_key"] in existing_keys:
            continue
        db.add(PlatformModuleRule(**row))
        added = True
    if not added:
        return
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()


async def get_module_rule(db: AsyncSession, module_key: str) -> PlatformModuleRule | None:
    await ensure_platform_modules_seeded(db)
    return (
        await db.execute(select(PlatformModuleRule).where(PlatformModuleRule.module_key == module_key))
    ).scalar_one_or_none()


async def list_module_rules(db: AsyncSession) -> list[PlatformModuleRule]:
    await ensure_platform_modules_seeded(db)
    return list(
        (await db.execute(select(PlatformModuleRule).order_by(PlatformModuleRule.label))).scalars().all()
    )


async def user_can_access_module(
    db: AsyncSession,
    *,
    role: str,
    module_key: str,
    user_id: uuid.UUID | None = None,
) -> bool:
    if role == "admin":
        return True
    if user_id is not None:
        from app.services.platform.grants import user_has_module_grant

        if await user_has_module_grant(db, user_id, module_key):
            return True
    rule = await get_module_rule(db, module_key)
    if rule is None or not rule.enabled:
        return False
    return role in (rule.allowed_roles or [])


async def build_platform_access_map(
    db: AsyncSession,
    *,
    role: str,
    user_id: uuid.UUID | None = None,
) -> dict[str, bool]:
    await ensure_platform_modules_seeded(db)
    return {
        key: await user_can_access_module(db, role=role, module_key=key, user_id=user_id)
        for key in ALL_PLATFORM_MODULES
    }


def module_rule_dict(rule: PlatformModuleRule) -> dict:
    return {
        "module_key": rule.module_key,
        "label": rule.label,
        "description": rule.description,
        "enabled": rule.enabled,
        "allowed_roles": list(rule.allowed_roles or []),
        "config": rule.config or {},
        "updated_at": rule.updated_at.isoformat() if rule.updated_at else None,
    }
