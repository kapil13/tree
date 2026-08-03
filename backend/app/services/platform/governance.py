"""Platform governance — maintenance mode, registration gate, org feature flags."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.platform_governance_settings import PlatformGovernanceSettings
from app.models.user import User

GOVERNANCE_ROW_ID = 1

ORG_FEATURE_FLAGS: dict[str, str] = {
    "ai_scan": "AI tree health scans",
    "satellite": "Satellite NDVI monitoring",
    "bioacoustic": "Bioacoustic recordings",
    "reports": "Compliance report exports",
    "payments": "Credit purchases",
}

DEFAULT_ORG_FLAGS = {key: True for key in ORG_FEATURE_FLAGS}


async def get_governance_settings(db: AsyncSession) -> PlatformGovernanceSettings:
    row = await db.get(PlatformGovernanceSettings, GOVERNANCE_ROW_ID)
    if row is None:
        row = PlatformGovernanceSettings(id=GOVERNANCE_ROW_ID)
        db.add(row)
        await db.flush()
    return row


async def governance_settings_dict(db: AsyncSession) -> dict[str, Any]:
    row = await get_governance_settings(db)
    return {
        "maintenance_mode": row.maintenance_mode,
        "maintenance_message": row.maintenance_message,
        "registration_enabled": row.registration_enabled,
        "updated_at": row.updated_at,
        "updated_by_user_id": row.updated_by_user_id,
    }


async def public_governance_status(db: AsyncSession) -> dict[str, Any]:
    row = await get_governance_settings(db)
    return {
        "maintenance_mode": row.maintenance_mode,
        "maintenance_message": row.maintenance_message or None,
        "registration_enabled": row.registration_enabled,
    }


async def update_governance_settings(
    db: AsyncSession,
    *,
    actor: User,
    maintenance_mode: bool | None = None,
    maintenance_message: str | None = None,
    registration_enabled: bool | None = None,
) -> PlatformGovernanceSettings:
    row = await get_governance_settings(db)
    if maintenance_mode is not None:
        row.maintenance_mode = maintenance_mode
    if maintenance_message is not None:
        row.maintenance_message = maintenance_message.strip()
    if registration_enabled is not None:
        row.registration_enabled = registration_enabled
    row.updated_by_user_id = actor.id
    row.updated_at = datetime.now(UTC)
    await db.flush()
    return row


async def assert_writes_allowed(db: AsyncSession, user: User) -> None:
    if user.role == "admin":
        return
    row = await get_governance_settings(db)
    if row.maintenance_mode:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "maintenance_mode",
                "message": row.maintenance_message or "The platform is under maintenance.",
            },
        )


async def assert_registration_allowed(db: AsyncSession) -> None:
    row = await get_governance_settings(db)
    if not row.registration_enabled:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="registration_disabled",
        )


def org_feature_flags(org: Organization) -> dict[str, bool]:
    meta = org.metadata_ or {}
    stored = meta.get("feature_flags") or {}
    flags = dict(DEFAULT_ORG_FLAGS)
    for key in ORG_FEATURE_FLAGS:
        if key in stored:
            flags[key] = bool(stored[key])
    return flags


def set_org_feature_flags(org: Organization, updates: dict[str, bool]) -> dict[str, bool]:
    meta = dict(org.metadata_ or {})
    current = org_feature_flags(org)
    for key, value in updates.items():
        if key in ORG_FEATURE_FLAGS:
            current[key] = bool(value)
    meta["feature_flags"] = current
    org.metadata_ = meta
    return current


async def assert_org_feature_enabled(
    db: AsyncSession, user: User, feature_key: str
) -> None:
    if user.role == "admin" or user.organization_id is None:
        return
    org = await db.get(Organization, user.organization_id)
    if org is None:
        return
    flags = org_feature_flags(org)
    if not flags.get(feature_key, True):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail=f"org_feature_disabled:{feature_key}",
        )
