"""Platform module rules — seed defaults and evaluate role access."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.platform_module import PlatformModuleRule

WEBSITE_CMS_MODULE = "website_cms"

DEFAULT_MODULES: list[dict] = [
    {
        "module_key": WEBSITE_CMS_MODULE,
        "label": "Website CMS",
        "description": "Manage aranyix.tech marketing site — header, footer, pages, and sections.",
        "enabled": True,
        "allowed_roles": ["admin"],
    },
]


async def ensure_platform_modules_seeded(db: AsyncSession) -> None:
    existing = (await db.execute(select(PlatformModuleRule).limit(1))).scalar_one_or_none()
    if existing is not None:
        return
    for row in DEFAULT_MODULES:
        db.add(PlatformModuleRule(**row))
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


async def user_can_access_module(db: AsyncSession, *, role: str, module_key: str) -> bool:
    if role == "admin":
        return True
    rule = await get_module_rule(db, module_key)
    if rule is None or not rule.enabled:
        return False
    return role in (rule.allowed_roles or [])


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
