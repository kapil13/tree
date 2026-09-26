"""Credit BYOT AI scan wallets after verified payments."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_scan_wallet import UserAiScanWallet


async def ensure_wallet(db: AsyncSession, user_id: uuid.UUID) -> UserAiScanWallet:
    wallet = await db.get(UserAiScanWallet, user_id)
    if wallet is None:
        wallet = UserAiScanWallet(user_id=user_id, purchased_scan_balance=0)
        db.add(wallet)
        await db.flush()
    return wallet


async def _lock_wallet(db: AsyncSession, user_id: uuid.UUID) -> UserAiScanWallet:
    res = await db.execute(
        select(UserAiScanWallet).where(UserAiScanWallet.user_id == user_id).with_for_update()
    )
    wallet = res.scalar_one_or_none()
    if wallet is None:
        wallet = UserAiScanWallet(user_id=user_id, purchased_scan_balance=0)
        db.add(wallet)
        await db.flush()
        res = await db.execute(
            select(UserAiScanWallet).where(UserAiScanWallet.user_id == user_id).with_for_update()
        )
        wallet = res.scalar_one()
    return wallet


async def credit_scans(db: AsyncSession, user_id: uuid.UUID, credits: int) -> UserAiScanWallet:
    if credits <= 0:
        raise ValueError("invalid_credits")
    wallet = await _lock_wallet(db, user_id)
    wallet.purchased_scan_balance += credits
    await db.flush()
    return wallet


async def adjust_scans(db: AsyncSession, user_id: uuid.UUID, delta: int) -> UserAiScanWallet:
    """Admin adjustment — positive grants, negative debits (cannot go below zero)."""
    if delta == 0:
        raise ValueError("invalid_credits")
    wallet = await _lock_wallet(db, user_id)
    next_balance = wallet.purchased_scan_balance + delta
    if next_balance < 0:
        raise ValueError("insufficient_balance")
    wallet.purchased_scan_balance = next_balance
    await db.flush()
    return wallet
