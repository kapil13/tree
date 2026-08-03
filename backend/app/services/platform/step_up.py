"""Step-up authentication for sensitive platform admin actions."""

from __future__ import annotations

from fastapi import HTTPException, status

from app.core.security import verify_password
from app.models.user import User


def verify_admin_step_up(actor: User, password: str | None) -> None:
    """Re-confirm the acting admin's password before sensitive operations."""
    if not password or not actor.hashed_password:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="step_up_password_required",
        )
    if not verify_password(password, actor.hashed_password):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="step_up_password_invalid",
        )
