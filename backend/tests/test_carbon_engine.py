"""Tests for the pure-Python carbon engine."""

from __future__ import annotations

import pytest

from app.services.carbon import CarbonInputs, estimate_carbon
from app.services.carbon.engine import ENGINE_VERSION


def test_neem_with_dbh_returns_expected_magnitudes():
    res = estimate_carbon(CarbonInputs(species="Neem", dbh_cm=18.5, height_m=6.2, age_years=5))
    assert res.engine_version == ENGINE_VERSION
    assert res.agb_kg > 30
    assert res.bgb_kg > 0
    assert res.total_biomass_kg == pytest.approx(res.agb_kg + res.bgb_kg, abs=0.01)
    assert res.carbon_kg == pytest.approx(res.total_biomass_kg * 0.47, abs=0.05)
    assert res.co2e_kg == pytest.approx(res.carbon_kg * 44 / 12, abs=0.05)
    assert 0 < res.confidence <= 1


def test_unknown_species_falls_back_to_ipcc():
    res = estimate_carbon(CarbonInputs(species="Bogus tree", dbh_cm=10))
    assert res.carbon_kg > 0
    assert any("ipcc" in n.lower() or "generic" in n.lower() for n in res.notes)


def test_verra_buffer_pool_reduces_lifetime_credits():
    base = estimate_carbon(CarbonInputs(species="Neem", age_years=10))
    verra = estimate_carbon(CarbonInputs(species="Neem", age_years=10, methodology="VERRA_VM0047"))
    assert base.lifetime_credits_tco2e is not None
    assert verra.lifetime_credits_tco2e is not None
    assert verra.lifetime_credits_tco2e == pytest.approx(
        base.lifetime_credits_tco2e * 0.8, rel=0.01
    )


def test_revenue_scales_with_tier():
    sp = estimate_carbon(
        CarbonInputs(species="Neem", age_years=10, verification_tier="speculative")
    )
    iss = estimate_carbon(
        CarbonInputs(species="Neem", age_years=10, verification_tier="verra_issued")
    )
    assert sp.estimated_revenue_usd is not None
    assert iss.estimated_revenue_usd is not None
    assert iss.estimated_revenue_usd > sp.estimated_revenue_usd


def test_age_drives_dbh_when_dbh_missing():
    young = estimate_carbon(CarbonInputs(species="Neem", age_years=1))
    old = estimate_carbon(CarbonInputs(species="Neem", age_years=20))
    assert old.carbon_kg > young.carbon_kg
    assert old.lifetime_credits_tco2e is not None


def test_confidence_higher_with_more_inputs():
    low = estimate_carbon(CarbonInputs(species="Unknown"))
    high = estimate_carbon(
        CarbonInputs(
            species="Neem",
            dbh_cm=20,
            height_m=8,
            age_years=6,
            wood_density=0.68,
        )
    )
    assert high.confidence > low.confidence
