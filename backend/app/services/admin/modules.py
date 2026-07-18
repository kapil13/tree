"""Default platform modules and rule engine."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import Role
from app.models.platform_module_rule import PlatformModuleRule

DEFAULT_MODULES: list[dict] = [
    {
        "module_key": "dashboard",
        "label": "Executive dashboard",
        "description": "Portfolio KPIs and threat watch",
        "allowed_roles": ["user", "farmer", "ngo", "corporate", "government", "admin", "superadmin"],
    },
    {
        "module_key": "projects",
        "label": "Planting projects",
        "description": "NHAI/ESG projects, work areas, compliance",
        "allowed_roles": ["ngo", "corporate", "government", "admin", "superadmin"],
    },
    {
        "module_key": "trees",
        "label": "Tree registry",
        "description": "Register and manage trees",
        "allowed_roles": ["user", "farmer", "ngo", "corporate", "government", "admin", "superadmin"],
    },
    {
        "module_key": "satellite",
        "label": "Satellite NDVI",
        "description": "Satellite health scans and plantation fences",
        "allowed_roles": ["farmer", "ngo", "corporate", "government", "admin", "superadmin"],
    },
    {
        "module_key": "bioacoustic",
        "label": "Bioacoustic biodiversity",
        "description": "Soundscape recordings and species detection",
        "allowed_roles": ["ngo", "corporate", "government", "admin", "superadmin"],
    },
    {
        "module_key": "reports",
        "label": "MRV reports",
        "description": "PDF and Excel report generation",
        "allowed_roles": ["ngo", "corporate", "government", "admin", "superadmin"],
    },
    {
        "module_key": "assistant",
        "label": "AI assistant",
        "description": "Carbon and planting Q&A",
        "allowed_roles": ["user", "farmer", "ngo", "corporate", "government", "admin", "superadmin"],
    },
    {
        "module_key": "admin",
        "label": "Superadmin console",
        "description": "User management, module rules, platform stats",
        "allowed_roles": ["admin", "superadmin"],
    },
]


async def ensure_default_modules(db: AsyncSession) -> None:
    existing = (await db.execute(select(PlatformModuleRule.module_key))).scalars().all()
    keys = set(existing)
    for mod in DEFAULT_MODULES:
        if mod["module_key"] in keys:
            continue
        db.add(
            PlatformModuleRule(
                module_key=mod["module_key"],
                label=mod["label"],
                description=mod["description"],
                enabled=True,
                allowed_roles=mod["allowed_roles"],
            )
        )


def role_can_access_module(role: str, rule: PlatformModuleRule) -> bool:
    if not rule.enabled:
        return False
    if role in ("admin", "superadmin"):
        return True
    return role in (rule.allowed_roles or [])


def all_roles() -> list[str]:
    return [r.value for r in Role]
