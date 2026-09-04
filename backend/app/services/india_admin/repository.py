"""DB queries for India admin geography."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.india_admin import (
    IndiaBlock,
    IndiaCity,
    IndiaDistrict,
    IndiaGramPanchayat,
    IndiaState,
    IndiaVillage,
)


async def list_states(db: AsyncSession) -> list[IndiaState]:
    res = await db.execute(select(IndiaState).order_by(IndiaState.name))
    return list(res.scalars().all())


async def list_districts(db: AsyncSession, *, state_code: str) -> list[IndiaDistrict]:
    code = state_code.zfill(2)
    res = await db.execute(
        select(IndiaDistrict)
        .where(IndiaDistrict.state_code == code)
        .order_by(IndiaDistrict.name)
    )
    return list(res.scalars().all())


async def list_cities(
    db: AsyncSession,
    *,
    state_code: str,
    district_code: str,
) -> list[IndiaCity]:
    st = state_code.zfill(2)
    dt = district_code.lstrip("0") or district_code
    res = await db.execute(
        select(IndiaCity)
        .where(IndiaCity.state_code == st, IndiaCity.district_code == dt)
        .order_by(IndiaCity.name)
    )
    return list(res.scalars().all())


async def list_blocks(
    db: AsyncSession, *, state_code: str, district_code: str
) -> list[IndiaBlock]:
    st = state_code.zfill(2)
    dt = district_code.lstrip("0") or district_code
    res = await db.execute(
        select(IndiaBlock)
        .where(IndiaBlock.state_code == st, IndiaBlock.district_code == dt)
        .order_by(IndiaBlock.name)
    )
    return list(res.scalars().all())


async def list_gram_panchayats(db: AsyncSession, *, block_lgd: int) -> list[IndiaGramPanchayat]:
    res = await db.execute(
        select(IndiaGramPanchayat)
        .where(IndiaGramPanchayat.block_lgd == block_lgd)
        .order_by(IndiaGramPanchayat.name)
    )
    return list(res.scalars().all())


async def list_villages(db: AsyncSession, *, gram_panchayat_code: str) -> list[IndiaVillage]:
    res = await db.execute(
        select(IndiaVillage)
        .where(IndiaVillage.gram_panchayat_code == gram_panchayat_code)
        .order_by(IndiaVillage.name)
    )
    return list(res.scalars().all())


async def geography_is_seeded(db: AsyncSession) -> bool:
    res = await db.execute(select(IndiaState.code).limit(1))
    return res.scalar_one_or_none() is not None
