"""Tests for carbon credit ledger."""

from __future__ import annotations

import uuid
from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.services.credits.ledger import (
    compute_ledger_totals,
    compute_strata,
    transition_ledger_status,
)


def _tree(species: str, carbon_kg: float, planted_at: date | None = None):
    return SimpleNamespace(
        species_text=species,
        current_carbon_kg=carbon_kg,
        planted_at=planted_at,
    )


def test_compute_ledger_totals_verra_buffer():
    trees = [_tree("Neem", 47.0), _tree("Mango", 53.0)]
    totals = compute_ledger_totals(trees, "VERRA_VM0047")
    assert totals["tree_count"] == 2
    assert totals["buffer_pct"] == 0.20
    assert totals["gross_credits_tco2e"] == pytest.approx(0.3667, rel=0.01)
    assert totals["net_credits_tco2e"] == pytest.approx(0.2933, rel=0.01)


def test_compute_strata_groups_species_and_age():
    trees = [
        _tree("Neem", 10, date(2024, 1, 1)),
        _tree("Neem", 12, date(2024, 6, 1)),
        _tree("Mango", 20, date(2018, 1, 1)),
    ]
    strata = compute_strata(trees)
    assert len(strata) >= 2
    neem = next(s for s in strata if s["species"] == "Neem")
    assert neem["tree_count"] == 2


@pytest.mark.asyncio
async def test_transition_requires_registry_for_issued():
    ledger = SimpleNamespace(
        id=uuid.uuid4(),
        status="buffered",
        net_credits_tco2e=1.5,
        issued_credits_tco2e=None,
        registry_reference=None,
    )
    db = AsyncMock()
    with pytest.raises(ValueError, match="registry_reference_required"):
        await transition_ledger_status(
            db,
            ledger,
            to_status="issued",
            actor_user_id=uuid.uuid4(),
        )


@pytest.mark.asyncio
async def test_invalid_transition_raises():
    ledger = SimpleNamespace(
        id=uuid.uuid4(),
        status="estimated",
        net_credits_tco2e=1.0,
        issued_credits_tco2e=None,
        registry_reference=None,
    )
    db = AsyncMock()
    with pytest.raises(ValueError, match="invalid_transition"):
        await transition_ledger_status(
            db,
            ledger,
            to_status="issued",
            actor_user_id=uuid.uuid4(),
            registry_reference="VCS-123",
        )
