"""Account erasure with audit/credit retention."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


async def queue_account_erasure(
    db: AsyncSession,
    *,
    user: User,
    reason: str | None = None,
) -> dict:
    """Deactivate account and redact direct PII. Audit/credit rows retained without PII."""
    if not user.is_active:
        raise ValueError("account_already_deleted")

    redacted_email = f"deleted+{user.id.hex[:12]}@redacted.byot.local"
    user.email = redacted_email
    user.phone = None
    user.full_name = "Deleted User"
    user.hashed_password = None
    user.google_sub = None
    user.is_active = False
    user.sessions_invalidated_at = datetime.now(UTC)
    user.notification_preferences = {
        **(user.notification_preferences or {}),
        "marketing_email": False,
        "product_updates": False,
        "analytics": False,
        "erasure_reason": reason,
        "erased_at": datetime.now(UTC).isoformat(),
    }
    await db.flush()
    return {
        "status": "erased",
        "user_id": str(user.id),
        "retained": ["audit_logs_anonymized", "credit_ledger_aggregates"],
    }
