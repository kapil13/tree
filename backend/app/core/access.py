"""Platform access helpers (admin / superadmin)."""

from __future__ import annotations

from app.models.user import User

PLATFORM_ADMIN_ROLES = frozenset({"admin", "superadmin"})


def is_platform_admin(user: User | None) -> bool:
    if user is None:
        return False
    return user.role in PLATFORM_ADMIN_ROLES


def is_superadmin(user: User | None) -> bool:
    return user is not None and user.role == "superadmin"
