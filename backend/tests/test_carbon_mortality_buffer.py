"""Tests for mortality-adjusted credits and dynamic NPRT buffer."""

from __future__ import annotations

import pytest

from app.services.carbon import CarbonInputs, estimate_carbon
from app.services.carbon.buffer import nprt_to_buffer_pct, resolve_buffer_pct
from app.services.carbon.mortality import (
    apply_mortality_to_yearly_deltas,
    mortality_factor_over_years,
)
from app.services.credits.ledger import compute_ledger_totals


def test_nprt_maps_to_buffer_range():
    assert nprt_to_buffer_pct(0) == pytest.approx(0.10)
    assert nprt_to_buffer_pct(100) == pytest.approx(0.30)
    assert nprt_to_buffer_pct(50) == pytest.approx(0.20)


def test_resolve_buffer_uses_nprt_for_verra():
    assert resolve_buffer_pct("VERRA_VM0047", nprt_score=0) == pytest.approx(0.10)
    assert resolve_buffer_pct("VERRA_VM0047", nprt_score=100) == pytest.approx(0.30)
    assert resolve_buffer_pct("IPCC_AR6", nprt_score=100) == 0.0


def test_ten_percent_mortality_over_five_years_reduces_credits():
    factor = mortality_factor_over_years(
        5, climate_zone="tropical", annual_mortality_pct=10.0
    )
    assert factor == pytest.approx(0.9**5, rel=0.001)
    assert factor < 0.65

    no_mortality = estimate_carbon(CarbonInputs(species="Neem", age_years=10))
    with_mortality = estimate_carbon(
        CarbonInputs(species="Neem", age_years=10, annual_mortality_pct=10.0)
    )
    assert no_mortality.projected_lifetime_credits_tco2e is not None
    assert with_mortality.projected_lifetime_credits_tco2e is not None
    assert with_mortality.projected_lifetime_credits_tco2e < no_mortality.projected_lifetime_credits_tco2e


def test_dynamic_nprt_buffer_reduces_lifetime_credits():
    low_risk = estimate_carbon(
        CarbonInputs(species="Neem", age_years=10, methodology="VERRA_VM0047", nprt_score=0)
    )
    high_risk = estimate_carbon(
        CarbonInputs(species="Neem", age_years=10, methodology="VERRA_VM0047", nprt_score=100)
    )
    assert low_risk.buffer_pct_applied == pytest.approx(0.10)
    assert high_risk.buffer_pct_applied == pytest.approx(0.30)
    assert high_risk.projected_lifetime_credits_tco2e < low_risk.projected_lifetime_credits_tco2e


def test_ex_post_verified_fields_populated():
    res = estimate_carbon(
        CarbonInputs(
            species="Neem",
            dbh_cm=20,
            height_m=7,
            age_years=8,
            verification_tier="verra_listed",
        )
    )
    assert res.verified_co2e_kg is not None
    assert res.verified_lifetime_credits_tco2e is not None
    assert res.verified_co2e_kg > 0


def test_apply_mortality_to_yearly_deltas():
    deltas = [100.0] * 5
    adjusted = apply_mortality_to_yearly_deltas(
        deltas, climate_zone="tropical", annual_mortality_pct=10.0
    )
    naive = sum(deltas)
    assert adjusted < naive * 0.75


def test_ledger_ex_post_excludes_dead_trees():
    from types import SimpleNamespace

    alive = SimpleNamespace(
        species_text="Neem",
        current_carbon_kg=50.0,
        planted_at=None,
        status="active",
        metadata_={"survival_status": "alive"},
    )
    dead = SimpleNamespace(
        species_text="Neem",
        current_carbon_kg=40.0,
        planted_at=None,
        status="active",
        metadata_={"survival_status": "dead"},
    )
    all_trees = compute_ledger_totals([alive, dead], "VERRA_VM0047")
    ex_post = compute_ledger_totals([alive, dead], "VERRA_VM0047", ex_post_only=True)
    assert ex_post["gross_credits_tco2e"] < all_trees["gross_credits_tco2e"]
