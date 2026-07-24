"""Credit BYOT AI scan wallets after verified payments."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_scan_wallet import UserAiScanWallet


async def ensure_wallet(db: AsyncSession, user_id: uuid.UUID) -> UserAiScanWallet:
    wallet = await db.get(UserAiScanWallet, user_id)
    if wallet is None:
        wallet = UserAiScanWallet(user_id=user_id, purchased_scan_balance=0)
        db.add(wallet)
        await db.flush()
    return wallet


async def credit_scans(db: AsyncSession, user_id: uuid.UUID, credits: int) -> UserAiScanWallet:
    if credits <= 0:
        raise ValueError("invalid_credits")
    wallet = await ensure_wallet(db, user_id)
    wallet.purchased_scan_balance += credits
    await db.flush()
    return wallet
