"""Tests for Sprint 13–14 VM0047 + ICVCM."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.carbon.engine import CarbonInputs, estimate_carbon
from app.services.carbon.pools import compute_carbon_pools
from app.services.compliance.checklists import get_checklist


def test_compute_carbon_pools_includes_soc():
    pools = compute_carbon_pools(
        agb_kg=100.0,
        bgb_kg=25.0,
        carbon_fraction=0.47,
        deadwood_ratio=0.08,
        litter_ratio=0.04,
        soc_tco2e_per_ha=2.5,
        area_ha=1.0,
    )
    assert pools.deadwood_kg == pytest.approx(8.0)
    assert pools.litter_kg == pytest.approx(4.0)
    assert pools.soc_carbon_kg > 0
    assert pools.total_co2e_kg > pools.living_biomass_kg * 0.47 * (44 / 12)


def test_engine_include_other_pools():
    base = estimate_carbon(CarbonInputs(species="Neem", dbh_cm=20, age_years=8))
    with_pools = estimate_carbon(
        CarbonInputs(
            species="Neem",
            dbh_cm=20,
            age_years=8,
            include_other_pools=True,
            soc_tco2e_per_ha=1.0,
            area_ha=0.5,
        )
    )
    assert with_pools.total_with_pools_co2e_kg is not None
    assert with_pools.co2e_kg >= base.co2e_kg
    assert any("Other pools" in n for n in with_pools.notes)


def test_icvcm_checklist_registered():
    checklist = get_checklist("icvcm_ccp")
    assert checklist is not None
    assert checklist.framework_reference.startswith("Integrity Council")
    assert len(checklist.items) == 10


@pytest.mark.asyncio
async def test_build_vm0047_summary_smoke():
    from app.services.carbon.vm0047_ops import build_vm0047_summary

    project = MagicMock()
    project.id = uuid.uuid4()
    project.code = "VM-01"
    db = AsyncMock()

    ledger = MagicMock()
    ledger.gross_credits_tco2e = 10.0
    ledger.buffer_withheld_tco2e = 2.0
    ledger.net_credits_tco2e = 8.0
    ledger.methodology = "VERRA_VM0047"
    ledger.status = "draft"

    empty = MagicMock()
    empty.scalars.return_value.all.return_value = []
    empty.scalar_one_or_none.return_value = None
    empty.scalar_one.return_value = 0
    db.execute = AsyncMock(return_value=empty)

    with (
        patch(
            "app.services.carbon.vm0047_ops.get_or_create_ledger",
            new=AsyncMock(return_value=ledger),
        ),
        patch(
            "app.services.carbon.vm0047_ops.latest_risk_assessment",
            new=AsyncMock(return_value=None),
        ),
    ):
        summary = await build_vm0047_summary(db, project)

    assert summary["standard"] == "Verra VM0047 v1.0"
    assert summary["ledger"]["gross_credits_tco2e"] == 10.0
    assert "baseline_not_documented" in summary["gaps"]
