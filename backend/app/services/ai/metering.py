"""AI scan metering — BYOT citizens only; professional programs are work-order funded."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Literal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.ai_scan_wallet import UserAiScanWallet
from app.models.planting_program import PlantingProgram, UserPlantingProgram
from app.models.tree_analysis import TreeAnalysis
from app.models.user import User

MeteringTier = Literal["byot_metered", "professional_unlimited", "platform_admin"]


@dataclass(frozen=True)
class AiScanMeterStatus:
    tier: MeteringTier
    complimentary_limit: int
    complimentary_used: int
    purchased_balance: int
    remaining_complimentary: int
    remaining_total: int | None
    can_scan: bool
    requires_payment: bool
    payment_enabled: bool = False

    def as_dict(self) -> dict:
        return {
            "tier": self.tier,
            "complimentary_limit": self.complimentary_limit,
            "complimentary_used": self.complimentary_used,
            "purchased_balance": self.purchased_balance,
            "remaining_complimentary": self.remaining_complimentary,
            "remaining_total": self.remaining_total,
            "can_scan": self.can_scan,
            "requires_payment": self.requires_payment,
            "payment_enabled": self.payment_enabled,
        }


async def user_has_professional_enrollment(db: AsyncSession, user_id: uuid.UUID) -> bool:
    """Any approved non-BYOT program grants unlimited AI scans (govt/ESG work-order funded)."""
    res = await db.execute(
        select(PlantingProgram.id)
        .join(UserPlantingProgram, UserPlantingProgram.program_id == PlantingProgram.id)
        .where(
            UserPlantingProgram.user_id == user_id,
            UserPlantingProgram.is_active.is_(True),
            PlantingProgram.is_default.is_(False),
        )
        .limit(1)
    )
    return res.scalar_one_or_none() is not None


async def count_metered_scans(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Lifetime BYOT AI scans initiated by this user."""
    res = await db.execute(
        select(func.count(TreeAnalysis.id)).where(TreeAnalysis.triggered_by == user_id)
    )
    return int(res.scalar_one() or 0)


async def get_purchased_balance(db: AsyncSession, user_id: uuid.UUID) -> int:
    wallet = await db.get(UserAiScanWallet, user_id)
    return wallet.purchased_scan_balance if wallet else 0


async def get_ai_scan_meter_status(db: AsyncSession, user: User) -> AiScanMeterStatus:
    if user.role == "admin":
        return AiScanMeterStatus(
            tier="platform_admin",
            complimentary_limit=settings.byot_free_ai_scans,
            complimentary_used=0,
            purchased_balance=0,
            remaining_complimentary=settings.byot_free_ai_scans,
            remaining_total=None,
            can_scan=True,
            requires_payment=False,
        )

    if await user_has_professional_enrollment(db, user.id):
        return AiScanMeterStatus(
            tier="professional_unlimited",
            complimentary_limit=settings.byot_free_ai_scans,
            complimentary_used=0,
            purchased_balance=0,
            remaining_complimentary=0,
            remaining_total=None,
            can_scan=True,
            requires_payment=False,
        )

    used = await count_metered_scans(db, user.id)
    purchased = await get_purchased_balance(db, user.id)
    limit = settings.byot_free_ai_scans
    remaining_free = max(0, limit - used)
    remaining_total = remaining_free + purchased
    can_scan = remaining_total > 0
    requires_payment = not can_scan

    return AiScanMeterStatus(
        tier="byot_metered",
        complimentary_limit=limit,
        complimentary_used=used,
        purchased_balance=purchased,
        remaining_complimentary=remaining_free,
        remaining_total=remaining_total,
        can_scan=can_scan,
        requires_payment=requires_payment,
    )


async def assert_ai_scan_allowed(db: AsyncSession, user: User) -> AiScanMeterStatus:
    status_row = await get_ai_scan_meter_status(db, user)
    if status_row.can_scan:
        return status_row

    raise HTTPException(
        status.HTTP_402_PAYMENT_REQUIRED,
        detail={
            "code": "ai_scan_limit_exceeded",
            "message": (
                f"You have used all {status_row.complimentary_limit} complimentary BYOT AI scans. "
                "Additional scans will be available for purchase in a future release."
            ),
            **status_row.as_dict(),
        },
    )


async def consume_paid_scan_credit(db: AsyncSession, user_id: uuid.UUID) -> None:
    """Deduct one purchased scan after complimentary allowance is exhausted (Phase 4)."""
    wallet = await db.get(UserAiScanWallet, user_id)
    if wallet is None or wallet.purchased_scan_balance <= 0:
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            detail={"code": "ai_scan_payment_required", "message": "No purchased AI scans available."},
        )
    wallet.purchased_scan_balance -= 1
    await db.flush()
