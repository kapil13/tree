"""Authenticated password change for email/password accounts."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.services.auth.sessions import revoke_all_user_sessions


class ChangePasswordError(Exception):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


async def change_password(
    db: AsyncSession,
    *,
    user: User,
    current_password: str,
    new_password: str,
) -> None:
    if not user.hashed_password:
        raise ChangePasswordError("password_not_set")

    if not verify_password(current_password, user.hashed_password):
        raise ChangePasswordError("invalid_current_password")

    if verify_password(new_password, user.hashed_password):
        raise ChangePasswordError("password_unchanged")

    user.hashed_password = hash_password(new_password)
    revoke_all_user_sessions(user)
    await db.flush()
