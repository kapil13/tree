"""Tests for exclusive claim registry."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.credits.claims import check_exclusive_claim_conflict, scheme_family


def test_scheme_family_mapping():
    assert scheme_family("campa_ca") == "campa"
    assert scheme_family("green_credit_india") == "green_credit"
    assert scheme_family("unknown_scheme") == "unknown_scheme"


@pytest.mark.asyncio
async def test_exclusive_claim_conflict_detected():
    existing = MagicMock()
    existing.scheme_code = "campa_ca"
    db = AsyncMock()
    db.execute = AsyncMock(
        return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=existing))
    )
    with pytest.raises(ValueError, match="exclusive_claim_conflict:campa"):
        await check_exclusive_claim_conflict(
            db,
            tree_id=uuid.uuid4(),
            scheme_code="gim_restoration",
        )
