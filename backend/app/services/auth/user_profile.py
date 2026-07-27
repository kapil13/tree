"""User profile helpers for auth responses."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.planting_programs.catalog import default_program_code
from app.services.planting_programs.enrollment import list_user_program_codes

PROFESSIONAL_PROGRAM_CODES = frozenset({"government_nhai", "corporate_esg", "ngo_community"})


async def user_enrolled_program_codes(db: AsyncSession, user_id) -> list[str]:
    return await list_user_program_codes(db, user_id)


def user_has_professional_program(codes: list[str]) -> bool:
    return any(c in PROFESSIONAL_PROGRAM_CODES for c in codes)


def user_is_byot_only(codes: list[str]) -> bool:
    default = default_program_code()
    professional = [c for c in codes if c in PROFESSIONAL_PROGRAM_CODES]
    return not professional and default in codes
