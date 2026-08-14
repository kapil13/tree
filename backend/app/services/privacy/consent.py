"""Consent ledger — grant, withdraw, list."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.privacy import ConsentRecord
from app.models.user import User
from app.schemas.privacy import ConsentRecordOut
from app.services.privacy.constants import CONSENT_PURPOSES, PRIVACY_POLICY_VERSION


def _consent_out(row: ConsentRecord) -> ConsentRecordOut:
    return ConsentRecordOut(
        id=row.id,
        purpose=row.purpose,
        policy_version=row.policy_version,
        granted_at=row.granted_at,
        withdrawn_at=row.withdrawn_at,
        active=row.withdrawn_at is None,
    )


async def list_consents(db: AsyncSession, user_id: uuid.UUID) -> list[ConsentRecordOut]:
    res = await db.execute(
        select(ConsentRecord)
        .where(ConsentRecord.user_id == user_id)
        .order_by(ConsentRecord.granted_at.desc())
    )
    return [_consent_out(r) for r in res.scalars().all()]


async def grant_consent(
    db: AsyncSession,
    *,
    user: User,
    purpose: str,
    policy_version: str = PRIVACY_POLICY_VERSION,
    ip: str | None = None,
    user_agent: str | None = None,
) -> ConsentRecordOut:
    if purpose not in CONSENT_PURPOSES:
        raise ValueError("invalid_consent_purpose")

    res = await db.execute(
        select(ConsentRecord)
        .where(
            ConsentRecord.user_id == user.id,
            ConsentRecord.purpose == purpose,
            ConsentRecord.withdrawn_at.is_(None),
        )
        .limit(1)
    )
    existing = res.scalar_one_or_none()
    if existing:
        return _consent_out(existing)

    row = ConsentRecord(
        user_id=user.id,
        purpose=purpose,
        policy_version=policy_version,
        granted_at=datetime.now(UTC),
        ip=ip,
        user_agent=user_agent,
    )
    db.add(row)
    await db.flush()
    return _consent_out(row)


async def withdraw_consent(
    db: AsyncSession,
    *,
    user: User,
    purpose: str,
) -> ConsentRecordOut | None:
    if purpose == "essential":
        raise ValueError("essential_consent_required")

    res = await db.execute(
        select(ConsentRecord)
        .where(
            ConsentRecord.user_id == user.id,
            ConsentRecord.purpose == purpose,
            ConsentRecord.withdrawn_at.is_(None),
        )
        .limit(1)
    )
    row = res.scalar_one_or_none()
    if row is None:
        return None
    row.withdrawn_at = datetime.now(UTC)
    await db.flush()
    return _consent_out(row)


async def record_signup_consents(
    db: AsyncSession,
    *,
    user: User,
    ip: str | None = None,
    user_agent: str | None = None,
) -> None:
    """Record essential + analytics consent at signup (DPDP audit trail)."""
    await grant_consent(db, user=user, purpose="essential", ip=ip, user_agent=user_agent)
    await grant_consent(db, user=user, purpose="analytics", ip=ip, user_agent=user_agent)


def analytics_allowed(consents: list[ConsentRecordOut]) -> bool:
    return any(c.purpose == "analytics" and c.active for c in consents)
