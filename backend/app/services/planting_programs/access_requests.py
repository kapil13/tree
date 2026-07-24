"""Program access request workflow for premium planting programs."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.planting_program import ProgramAccessRequest
from app.services.planting_programs.enrollment import (
    get_program_by_code,
    list_user_program_codes,
    set_user_programs,
    user_can_use_program,
)

REQUEST_STATUSES = frozenset({"pending", "approved", "rejected", "withdrawn"})


class AccessRequestError(Exception):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


async def get_access_request(
    db: AsyncSession, request_id: uuid.UUID
) -> ProgramAccessRequest | None:
    res = await db.execute(
        select(ProgramAccessRequest)
        .options(
            selectinload(ProgramAccessRequest.program),
            selectinload(ProgramAccessRequest.user),
        )
        .where(ProgramAccessRequest.id == request_id)
    )
    return res.scalar_one_or_none()


async def list_user_access_requests(
    db: AsyncSession, user_id: uuid.UUID
) -> list[ProgramAccessRequest]:
    res = await db.execute(
        select(ProgramAccessRequest)
        .options(selectinload(ProgramAccessRequest.program))
        .where(ProgramAccessRequest.user_id == user_id)
        .order_by(ProgramAccessRequest.created_at.desc())
    )
    return list(res.scalars().all())


async def list_access_requests(
    db: AsyncSession,
    *,
    status: str | None = "pending",
    limit: int = 200,
) -> list[ProgramAccessRequest]:
    stmt = (
        select(ProgramAccessRequest)
        .options(
            selectinload(ProgramAccessRequest.program),
            selectinload(ProgramAccessRequest.user),
        )
        .order_by(ProgramAccessRequest.created_at.asc())
        .limit(limit)
    )
    if status:
        stmt = stmt.where(ProgramAccessRequest.status == status)
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def _get_existing_request(
    db: AsyncSession, user_id: uuid.UUID, program_id: uuid.UUID
) -> ProgramAccessRequest | None:
    res = await db.execute(
        select(ProgramAccessRequest).where(
            ProgramAccessRequest.user_id == user_id,
            ProgramAccessRequest.program_id == program_id,
        )
    )
    return res.scalar_one_or_none()


async def create_access_request(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    program_code: str,
    message: str | None = None,
) -> ProgramAccessRequest:
    program = await get_program_by_code(db, program_code)
    if program is None:
        raise AccessRequestError("program_not_found")
    if program.is_default:
        raise AccessRequestError("default_program_open")
    if not program.is_public:
        raise AccessRequestError("program_not_available")

    if await user_can_use_program(db, user_id, program):
        raise AccessRequestError("already_enrolled")

    existing = await _get_existing_request(db, user_id, program.id)
    if existing is not None:
        if existing.status == "pending":
            raise AccessRequestError("request_already_pending")
        if existing.status == "approved":
            raise AccessRequestError("already_enrolled")
        existing.status = "pending"
        existing.message = (message or "").strip() or None
        existing.admin_note = None
        existing.reviewed_by = None
        existing.reviewed_at = None
        await db.flush()
        reloaded = await get_access_request(db, existing.id)
        assert reloaded is not None
        return reloaded

    request = ProgramAccessRequest(
        user_id=user_id,
        program_id=program.id,
        status="pending",
        message=(message or "").strip() or None,
    )
    db.add(request)
    await db.flush()
    reloaded = await get_access_request(db, request.id)
    assert reloaded is not None
    return reloaded


async def withdraw_access_request(
    db: AsyncSession, *, user_id: uuid.UUID, request_id: uuid.UUID
) -> ProgramAccessRequest:
    request = await get_access_request(db, request_id)
    if request is None or request.user_id != user_id:
        raise AccessRequestError("request_not_found")
    if request.status != "pending":
        raise AccessRequestError("request_not_pending")
    request.status = "withdrawn"
    await db.flush()
    return request


async def review_access_request(
    db: AsyncSession,
    *,
    request_id: uuid.UUID,
    reviewer_id: uuid.UUID,
    action: str,
    admin_note: str | None = None,
) -> ProgramAccessRequest:
    if action not in {"approve", "reject"}:
        raise AccessRequestError("invalid_action")

    request = await get_access_request(db, request_id)
    if request is None:
        raise AccessRequestError("request_not_found")
    if request.status != "pending":
        raise AccessRequestError("request_not_pending")

    now = datetime.now(UTC)
    request.reviewed_by = reviewer_id
    request.reviewed_at = now
    request.admin_note = (admin_note or "").strip() or None

    if action == "approve":
        request.status = "approved"
        enrolled_codes = await list_user_program_codes(db, request.user_id)
        if request.program.code not in enrolled_codes:
            await set_user_programs(db, request.user_id, [*enrolled_codes, request.program.code])
    else:
        request.status = "rejected"

    await db.flush()
    return request
