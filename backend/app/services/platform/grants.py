"""Per-user platform module grant management."""

from __future__ import annotations

import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.platform_user_module_grant import PlatformUserModuleGrant


async def list_user_module_grants(db: AsyncSession, user_id: uuid.UUID) -> list[str]:
    res = await db.execute(
        select(PlatformUserModuleGrant.module_key).where(
            PlatformUserModuleGrant.user_id == user_id
        )
    )
    return sorted(res.scalars().all())


async def user_has_module_grant(
    db: AsyncSession, user_id: uuid.UUID, module_key: str
) -> bool:
    res = await db.execute(
        select(PlatformUserModuleGrant.id).where(
            PlatformUserModuleGrant.user_id == user_id,
            PlatformUserModuleGrant.module_key == module_key,
        )
    )
    return res.scalar_one_or_none() is not None


async def set_user_module_grants(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    module_keys: list[str],
    granted_by_user_id: uuid.UUID | None,
) -> list[str]:
    from app.services.platform.modules import ALL_PLATFORM_MODULES

    valid = {key for key in module_keys if key in ALL_PLATFORM_MODULES}
    await db.execute(
        delete(PlatformUserModuleGrant).where(PlatformUserModuleGrant.user_id == user_id)
    )
    for key in sorted(valid):
        db.add(
            PlatformUserModuleGrant(
                user_id=user_id,
                module_key=key,
                granted_by_user_id=granted_by_user_id,
            )
        )
    await db.flush()
    return sorted(valid)


def grants_summary(module_keys: list[str]) -> dict[str, bool]:
    from app.services.platform.modules import ALL_PLATFORM_MODULES

    granted = set(module_keys)
    return {key: key in granted for key in ALL_PLATFORM_MODULES}
