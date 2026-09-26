"""Tests for credit serial formatting and retirement."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.credit_serial import CreditSerial
from app.services.credits.serials import (
    format_serial_number,
    render_retirement_certificate_pdf,
    retire_serial,
)


def test_format_serial_number():
    assert format_serial_number(2026, "MH", 1) == "BYOT-2026-MH-000001"


@pytest.mark.asyncio
async def test_retire_serial_terminal():
    serial = CreditSerial(
        id=uuid.uuid4(),
        serial_number="BYOT-2026-MH-000001",
        ledger_event_id=uuid.uuid4(),
        project_id=uuid.uuid4(),
        vintage_year=2026,
        tco2e_amount=1.5,
        status="available",
        created_at=datetime.now(UTC),
    )
    db = AsyncMock()
    updated = await retire_serial(db, serial, beneficiary="Acme Corp", retirement_reason="Net zero")
    assert updated.status == "retired"
    assert updated.beneficiary == "Acme Corp"


def test_retirement_certificate_pdf():
    serial = CreditSerial(
        id=uuid.uuid4(),
        serial_number="BYOT-2026-MH-000001",
        ledger_event_id=uuid.uuid4(),
        project_id=uuid.uuid4(),
        vintage_year=2026,
        tco2e_amount=1.5,
        status="retired",
        beneficiary="Acme Corp",
        retired_at=datetime.now(UTC),
        created_at=datetime.now(UTC),
    )
    project = MagicMock()
    project.code = "DEMO"
    project.name = "Demo Project"
    pdf = render_retirement_certificate_pdf(serial, project)
    assert pdf.startswith(b"%PDF")
