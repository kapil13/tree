"""User session invalidation — revoke all tokens issued before a cutoff."""

from __future__ import annotations

from datetime import UTC, datetime

from app.models.user import User


def token_issued_before_invalidation(user: User, issued_at: int | None) -> bool:
    """True when the token predates the user's session revocation cutoff."""
    if user.sessions_invalidated_at is None or issued_at is None:
        return False
    cutoff = int(user.sessions_invalidated_at.timestamp())
    return issued_at < cutoff


def revoke_all_user_sessions(user: User) -> datetime:
    """Invalidate all access/refresh tokens issued before now."""
    now = datetime.now(UTC)
    user.sessions_invalidated_at = now
    return now
