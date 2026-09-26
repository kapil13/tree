"""Planting program enrollment helpers."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.planting_program import PlantingProgram, UserPlantingProgram
from app.models.user import User
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


async def sync_user_program_enrollment(db: AsyncSession, user: User) -> bool:
    """Align program memberships with org metadata and platform role."""
    from app.services.organizations.onboarding import (
        ORG_TYPE_TO_PROGRAM,
        org_program_codes,
        program_code_for_platform_role,
    )

    expected: set[str] = set()

    role_program = program_code_for_platform_role(user.role)
    if role_program:
        expected.add(role_program)

    if user.organization_id:
        org = await db.get(Organization, user.organization_id)
        if org is not None:
            expected.update(await org_program_codes(org))
            org_program = ORG_TYPE_TO_PROGRAM.get(org.type or "")
            if org_program:
                expected.add(org_program)

    if not expected:
        return False

    enrolled = await list_user_program_codes(db, user.id)
    missing = [code for code in expected if code not in enrolled]
    if not missing:
        return False

    await set_user_programs(db, user.id, [*enrolled, *missing])
    return True


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
    user = await db.get(User, user_id)
    if user is not None:
        await sync_user_program_enrollment(db, user)
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


async def set_user_programs_self_service(
    db: AsyncSession, user_id: uuid.UUID, program_codes: list[str]
) -> list[PlantingProgram]:
    """Citizens may only self-enroll in the default BYOT program."""
    allowed = [c for c in program_codes if c == default_program_code()]
    return await set_user_programs(db, user_id, allowed or [default_program_code()])
