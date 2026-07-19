"""Planting program enrollment helpers."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.planting_program import PlantingProgram, UserPlantingProgram
from app.services.planting_programs.catalog import default_program_code


async def get_program_by_code(db: AsyncSession, code: str) -> PlantingProgram | None:
    res = await db.execute(select(PlantingProgram).where(PlantingProgram.code == code))
    return res.scalar_one_or_none()


async def ensure_default_enrollment(db: AsyncSession, user_id: uuid.UUID) -> None:
    default_code = default_program_code()
    program = await get_program_by_code(db, default_code)
    if program is None:
        return
    existing = await db.execute(
        select(UserPlantingProgram).where(
            UserPlantingProgram.user_id == user_id,
            UserPlantingProgram.program_id == program.id,
        )
    )
    if existing.scalar_one_or_none() is None:
        db.add(UserPlantingProgram(user_id=user_id, program_id=program.id, is_active=True))


async def list_user_program_codes(db: AsyncSession, user_id: uuid.UUID) -> list[str]:
    res = await db.execute(
        select(PlantingProgram.code)
        .join(UserPlantingProgram, UserPlantingProgram.program_id == PlantingProgram.id)
        .where(
            UserPlantingProgram.user_id == user_id,
            UserPlantingProgram.is_active.is_(True),
        )
        .order_by(PlantingProgram.name)
    )
    return list(res.scalars().all())


async def list_available_programs(db: AsyncSession, user_id: uuid.UUID) -> list[PlantingProgram]:
    enrolled = await list_user_program_codes(db, user_id)
    res = await db.execute(
        select(PlantingProgram)
        .where(PlantingProgram.is_public.is_(True))
        .order_by(PlantingProgram.is_default.desc(), PlantingProgram.name)
    )
    programs = list(res.scalars().all())
    if not enrolled:
        await ensure_default_enrollment(db, user_id)
        await db.flush()
        enrolled = await list_user_program_codes(db, user_id)
    return programs


async def list_enrolled_programs(db: AsyncSession, user_id: uuid.UUID) -> list[PlantingProgram]:
    await ensure_default_enrollment(db, user_id)
    res = await db.execute(
        select(PlantingProgram)
        .join(UserPlantingProgram, UserPlantingProgram.program_id == PlantingProgram.id)
        .where(
            UserPlantingProgram.user_id == user_id,
            UserPlantingProgram.is_active.is_(True),
        )
        .order_by(PlantingProgram.is_default.desc(), PlantingProgram.name)
    )
    return list(res.scalars().all())


async def user_can_use_program(
    db: AsyncSession, user_id: uuid.UUID, program: PlantingProgram
) -> bool:
    if program.is_default:
        return True
    res = await db.execute(
        select(UserPlantingProgram.id).where(
            UserPlantingProgram.user_id == user_id,
            UserPlantingProgram.program_id == program.id,
            UserPlantingProgram.is_active.is_(True),
        )
    )
    return res.scalar_one_or_none() is not None


async def set_user_programs(
    db: AsyncSession, user_id: uuid.UUID, program_codes: list[str]
) -> list[PlantingProgram]:
    await ensure_default_enrollment(db, user_id)
    codes = set(program_codes)
    codes.add(default_program_code())

    res = await db.execute(select(PlantingProgram).where(PlantingProgram.is_public.is_(True)))
    all_programs = {p.code: p for p in res.scalars().all()}
    unknown = [c for c in codes if c not in all_programs]
    if unknown:
        raise ValueError(f"unknown_programs:{','.join(unknown)}")

    existing_res = await db.execute(
        select(UserPlantingProgram).where(UserPlantingProgram.user_id == user_id)
    )
    existing = {m.program_id: m for m in existing_res.scalars().all()}

    for code, program in all_programs.items():
        membership = existing.get(program.id)
        should_be_active = code in codes or program.is_default
        if membership is None and should_be_active:
            db.add(
                UserPlantingProgram(
                    user_id=user_id,
                    program_id=program.id,
                    is_active=True,
                )
            )
        elif membership is not None:
            membership.is_active = should_be_active

    await db.flush()
    return await list_enrolled_programs(db, user_id)
