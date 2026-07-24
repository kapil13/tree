"""Tests for program access request workflow."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.planting_programs.access_requests import (
    AccessRequestError,
    create_access_request,
    review_access_request,
)


def _program(*, code: str = "government_nhai", is_default: bool = False) -> MagicMock:
    program = MagicMock()
    program.id = uuid.uuid4()
    program.code = code
    program.name = "Government & NHAI"
    program.is_default = is_default
    program.is_public = True
    return program


@pytest.mark.asyncio
async def test_create_access_request_rejects_default_program(monkeypatch):
    program = _program(code="byot", is_default=True)
    monkeypatch.setattr(
        "app.services.planting_programs.access_requests.get_program_by_code",
        AsyncMock(return_value=program),
    )
    db = MagicMock()
    with pytest.raises(AccessRequestError) as exc:
        await create_access_request(db, user_id=uuid.uuid4(), program_code="byot")
    assert exc.value.code == "default_program_open"


@pytest.mark.asyncio
async def test_create_access_request_rejects_already_enrolled(monkeypatch):
    program = _program()
    monkeypatch.setattr(
        "app.services.planting_programs.access_requests.get_program_by_code",
        AsyncMock(return_value=program),
    )
    monkeypatch.setattr(
        "app.services.planting_programs.access_requests.user_can_use_program",
        AsyncMock(return_value=True),
    )
    db = MagicMock()
    with pytest.raises(AccessRequestError) as exc:
        await create_access_request(db, user_id=uuid.uuid4(), program_code=program.code)
    assert exc.value.code == "already_enrolled"


@pytest.mark.asyncio
async def test_review_access_request_approve_enrolls_user(monkeypatch):
    program = _program()
    request = MagicMock()
    request.id = uuid.uuid4()
    request.user_id = uuid.uuid4()
    request.status = "pending"
    request.program = program

    monkeypatch.setattr(
        "app.services.planting_programs.access_requests.get_access_request",
        AsyncMock(return_value=request),
    )
    monkeypatch.setattr(
        "app.services.planting_programs.access_requests.list_user_program_codes",
        AsyncMock(return_value=["byot"]),
    )
    set_programs = AsyncMock()
    monkeypatch.setattr(
        "app.services.planting_programs.access_requests.set_user_programs",
        set_programs,
    )

    db = MagicMock()
    db.flush = AsyncMock()
    reviewer_id = uuid.uuid4()

    result = await review_access_request(
        db,
        request_id=request.id,
        reviewer_id=reviewer_id,
        action="approve",
        admin_note="Approved for NHAI pilot",
    )

    assert result.status == "approved"
    set_programs.assert_awaited_once_with(
        db, request.user_id, ["byot", program.code]
    )
