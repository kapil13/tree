"""Professional signup onboarding — org profile wizard and status."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.planting_program import ProgramAccessRequest
from app.models.user import User
from app.services.auth.user_profile import PROFESSIONAL_PROGRAM_CODES, user_has_professional_program
from app.services.planting_programs.access_requests import (
    AccessRequestError,
    create_access_request,
    get_access_request,
)
from app.services.planting_programs.enrollment import list_user_program_codes
from app.services.planting_programs.signup_categories import program_code_for_signup_category

OnboardingStatus = Literal[
    "active_byot",
    "profile_required",
    "pending_approval",
    "rejected",
    "active_professional",
]


class OrgProfileIn(BaseModel):
    organization_name: str = Field(min_length=2, max_length=255)
    organization_type: Literal["government", "corporate", "ngo"]
    designation: str = Field(min_length=2, max_length=120)
    city: str = Field(min_length=2, max_length=120)
    state: str = Field(min_length=2, max_length=120)
    country: str = Field(default="IN", min_length=2, max_length=64)
    work_email: EmailStr | None = None
    contact_phone: str | None = Field(default=None, max_length=32)
    website: str | None = Field(default=None, max_length=255)
    registered_address: str | None = Field(default=None, max_length=500)
    registration_id: str | None = Field(default=None, max_length=64)
    department: str | None = Field(default=None, max_length=255)
    use_case_summary: str = Field(min_length=10, max_length=2000)


class OnboardingStateOut(BaseModel):
    status: OnboardingStatus
    program_code: str | None = None
    program_name: str | None = None
    access_request_id: uuid.UUID | None = None
    admin_note: str | None = None


async def create_draft_access_request(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    program_code: str,
) -> ProgramAccessRequest:
    """Create or return an in-progress draft access request after professional signup."""
    from app.services.planting_programs.enrollment import get_program_by_code

    program = await get_program_by_code(db, program_code)
    if program is None:
        raise AccessRequestError("program_not_found")

    res = await db.execute(
        select(ProgramAccessRequest).where(
            ProgramAccessRequest.user_id == user_id,
            ProgramAccessRequest.program_id == program.id,
        )
    )
    existing = res.scalar_one_or_none()
    if existing is not None:
        if existing.status in {"draft", "rejected"}:
            return existing
        if existing.status == "pending":
            raise AccessRequestError("request_already_pending")
        if existing.status == "approved":
            raise AccessRequestError("already_enrolled")

    return await create_access_request(
        db,
        user_id=user_id,
        program_code=program_code,
        status="draft",
    )


async def _latest_professional_request(
    db: AsyncSession, user_id: uuid.UUID
) -> ProgramAccessRequest | None:
    from sqlalchemy.orm import selectinload

    res = await db.execute(
        select(ProgramAccessRequest)
        .options(selectinload(ProgramAccessRequest.program))
        .where(ProgramAccessRequest.user_id == user_id)
        .order_by(ProgramAccessRequest.created_at.desc())
    )
    for row in res.scalars().all():
        if row.program and row.program.code in PROFESSIONAL_PROGRAM_CODES:
            return row
    return None


def _is_incomplete_professional_request(request: ProgramAccessRequest) -> bool:
    return request.status == "draft" or (
        request.status == "pending" and not request.org_profile
    )


def _is_fresh_professional_signup(user: User, request: ProgramAccessRequest) -> bool:
    """True when the access request was created during a new professional signup."""
    if not user.created_at or not request.created_at:
        return False
    signup_window_seconds = (request.created_at - user.created_at).total_seconds()
    account_age_seconds = (datetime.now(UTC) - user.created_at).total_seconds()
    return signup_window_seconds <= 600 and account_age_seconds <= 3600


async def _should_skip_professional_onboarding(
    db: AsyncSession, user_id: uuid.UUID, request: ProgramAccessRequest
) -> bool:
    """BYOT citizens with stale professional requests should not be forced into org onboarding."""
    if not _is_incomplete_professional_request(request):
        return False

    user = await db.get(User, user_id)
    if user is None or user.organization_id is not None:
        return False
    if user.role not in {"user", "farmer"}:
        return False

    codes = await list_user_program_codes(db, user_id)
    if user_has_professional_program(codes):
        return False

    return not _is_fresh_professional_signup(user, request)


async def repair_stale_onboarding_requests(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Withdraw incomplete professional requests that should not block BYOT login."""
    from sqlalchemy.orm import selectinload

    user = await db.get(User, user_id)
    if user is None:
        return 0
    if user.organization_id is not None or user.role not in {"user", "farmer"}:
        return 0

    codes = await list_user_program_codes(db, user_id)
    if user_has_professional_program(codes):
        return 0

    res = await db.execute(
        select(ProgramAccessRequest)
        .options(selectinload(ProgramAccessRequest.program))
        .where(ProgramAccessRequest.user_id == user_id)
    )
    withdrawn = 0
    for request in res.scalars().all():
        if not request.program or request.program.code not in PROFESSIONAL_PROGRAM_CODES:
            continue
        if not _is_incomplete_professional_request(request):
            continue
        if _is_fresh_professional_signup(user, request):
            continue
        request.status = "withdrawn"
        withdrawn += 1
    if withdrawn:
        await db.flush()
    return withdrawn


async def get_user_onboarding_state(db: AsyncSession, user_id: uuid.UUID) -> OnboardingStateOut:
    codes = await list_user_program_codes(db, user_id)
    if user_has_professional_program(codes):
        return OnboardingStateOut(status="active_professional")

    request = await _latest_professional_request(db, user_id)
    if request is None:
        return OnboardingStateOut(status="active_byot")

    if await _should_skip_professional_onboarding(db, user_id, request):
        return OnboardingStateOut(status="active_byot")

    program = request.program
    program_code = program.code if program else None
    program_name = str(program.name) if program and program.name else None

    if request.status == "draft" or not request.org_profile:
        return OnboardingStateOut(
            status="profile_required",
            program_code=program_code,
            program_name=program_name,
            access_request_id=request.id,
        )
    if request.status == "pending":
        return OnboardingStateOut(
            status="pending_approval",
            program_code=program_code,
            program_name=program_name,
            access_request_id=request.id,
        )
    if request.status == "rejected":
        return OnboardingStateOut(
            status="rejected",
            program_code=program_code,
            program_name=program_name,
            access_request_id=request.id,
            admin_note=request.admin_note,
        )
    return OnboardingStateOut(status="active_byot")


async def submit_org_profile(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    profile: OrgProfileIn,
) -> ProgramAccessRequest:
    request = await _latest_professional_request(db, user_id)
    if request is None:
        raise AccessRequestError("onboarding_not_started")
    if request.status not in {"draft", "rejected"}:
        if request.status == "pending" and request.org_profile:
            raise AccessRequestError("already_submitted")
        if request.status == "approved":
            raise AccessRequestError("already_enrolled")

    payload: dict[str, Any] = profile.model_dump(mode="json")
    request.org_profile = payload
    request.message = profile.use_case_summary.strip()
    request.status = "pending"
    request.admin_note = None
    request.reviewed_by = None
    request.reviewed_at = None
    await db.flush()
    reloaded = await get_access_request(db, request.id)
    assert reloaded is not None
    return reloaded


def resolve_signup_program_code(signup_category: str | None) -> str | None:
    try:
        return program_code_for_signup_category(signup_category)
    except ValueError as exc:
        raise AccessRequestError("invalid_signup_category") from exc
