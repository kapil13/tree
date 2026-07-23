"""Planting program templates and user enrollment."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.api.v1.deps import DB, CurrentUser
from app.models.planting_program import PlantingProgram
from app.schemas.planting_program import (
    PlantingProgramListOut,
    PlantingProgramOut,
    UserProgramsOut,
    UserProgramsUpdate,
)
from app.services.planting_programs.enrollment import (
    get_program_by_code,
    list_available_programs,
    list_enrolled_programs,
    list_user_program_codes,
    set_user_programs,
    set_user_programs_self_service,
)

router = APIRouter(prefix="/planting-programs", tags=["planting-programs"])


def _program_out(program: PlantingProgram, *, enrolled: bool) -> PlantingProgramOut:
    return PlantingProgramOut(
        id=program.id,
        code=program.code,
        name=program.name,
        description=program.description,
        audience=program.audience,
        min_photos=program.min_photos,
        is_default=program.is_default,
        is_public=program.is_public,
        form_schema=program.form_schema,
        enrolled=enrolled,
    )


@router.get("", response_model=PlantingProgramListOut)
async def list_programs(user: CurrentUser, db: DB) -> PlantingProgramListOut:
    enrolled_codes = await list_user_program_codes(db, user.id)
    enrolled_set = set(enrolled_codes)
    programs = await list_available_programs(db, user.id)
    return PlantingProgramListOut(
        items=[_program_out(p, enrolled=p.code in enrolled_set) for p in programs],
        enrolled_codes=enrolled_codes,
    )


@router.get("/enrolled", response_model=list[PlantingProgramOut])
async def list_enrolled(user: CurrentUser, db: DB) -> list[PlantingProgramOut]:
    programs = await list_enrolled_programs(db, user.id)
    return [_program_out(p, enrolled=True) for p in programs]


@router.get("/me/memberships", response_model=UserProgramsOut)
async def my_program_memberships(user: CurrentUser, db: DB) -> UserProgramsOut:
    enrolled = await list_enrolled_programs(db, user.id)
    enrolled_codes = {p.code for p in enrolled}
    available = await list_available_programs(db, user.id)
    return UserProgramsOut(
        enrolled=[_program_out(p, enrolled=True) for p in enrolled],
        available=[
            _program_out(p, enrolled=p.code in enrolled_codes) for p in available
        ],
    )


@router.put("/me/memberships", response_model=UserProgramsOut)
async def update_my_program_memberships(
    payload: UserProgramsUpdate, user: CurrentUser, db: DB
) -> UserProgramsOut:
    try:
        if user.role == "admin":
            await set_user_programs(db, user.id, payload.program_codes)
        else:
            await set_user_programs_self_service(db, user.id, payload.program_codes)
        await db.commit()
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    enrolled = await list_enrolled_programs(db, user.id)
    enrolled_codes = {p.code for p in enrolled}
    available = await list_available_programs(db, user.id)
    return UserProgramsOut(
        enrolled=[_program_out(p, enrolled=True) for p in enrolled],
        available=[
            _program_out(p, enrolled=p.code in enrolled_codes) for p in available
        ],
    )


@router.get("/{code}", response_model=PlantingProgramOut)
async def get_program(code: str, user: CurrentUser, db: DB) -> PlantingProgramOut:
    program = await get_program_by_code(db, code)
    if program is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="program_not_found")
    enrolled_codes = set(await list_user_program_codes(db, user.id))
    if not program.is_default and code not in enrolled_codes:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="program_not_enrolled")
    return _program_out(program, enrolled=program.is_default or code in enrolled_codes)

