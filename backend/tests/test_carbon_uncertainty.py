"""Tests for carbon uncertainty propagation."""

from __future__ import annotations

import pytest

from app.services.carbon import CarbonInputs, estimate_carbon
from app.services.carbon.uncertainty import (
    propagate_co2e_uncertainty,
    verra_uncertainty_deduction_pct,
)


def test_verra_deduction_zero_at_15_percent():
    assert verra_uncertainty_deduction_pct(15.0, "VERRA_VM0047") == 0.0
    assert verra_uncertainty_deduction_pct(10.0, "VERRA_VM0047") == 0.0


def test_verra_deduction_above_threshold():
    assert verra_uncertainty_deduction_pct(25.0, "VERRA_VM0047") == pytest.approx(10.0)
    assert verra_uncertainty_deduction_pct(25.0, "IPCC_AR6") == 0.0


def test_neem_estimate_includes_90_percent_ci():
    res = estimate_carbon(
        CarbonInputs(
            species="Neem",
            dbh_cm=18.5,
            height_m=6.2,
            age_years=5,
            measurement_method="tape",
        )
    )
    assert res.co2e_kg_lower_90 is not None
    assert res.co2e_kg_upper_90 is not None
    assert res.co2e_kg_lower_90 <= res.co2e_kg <= res.co2e_kg_upper_90
    assert res.uncertainty_pct is not None
    assert res.uncertainty_pct > 0
    assert res.creditable_co2e_kg is not None


def test_tape_measurement_narrower_than_visual_estimate():
    tape = estimate_carbon(
        CarbonInputs(
            species="Neem",
            dbh_cm=20.0,
            height_m=7.0,
            measurement_method="tape",
        )
    )
    visual = estimate_carbon(
        CarbonInputs(
            species="Neem",
            dbh_cm=20.0,
            height_m=7.0,
            measurement_method="visual_estimate",
        )
    )
    assert tape.uncertainty_pct is not None
    assert visual.uncertainty_pct is not None
    assert tape.uncertainty_pct < visual.uncertainty_pct


def test_verra_methodology_applies_uncertainty_deduction_when_wide():
    # Sparse inputs → wider uncertainty → possible Verra deduction
    sparse = estimate_carbon(
        CarbonInputs(species="Unknown", methodology="VERRA_VM0047"),
    )
    assert sparse.verra_deduction_pct is not None
    if sparse.uncertainty_pct and sparse.uncertainty_pct > 15:
        assert sparse.verra_deduction_pct > 0
        assert sparse.creditable_co2e_kg is not None
        assert sparse.creditable_co2e_kg < sparse.co2e_kg


def test_propagate_is_deterministic():
    inp = CarbonInputs(species="Neem", dbh_cm=15, height_m=5, measurement_method="caliper")
    a = propagate_co2e_uncertainty(
        inp,
        point_co2e_kg=100.0,
        dbh_cm=15.0,
        height_m=5.0,
        wd=0.68,
        root_shoot=0.27,
        carbon_fraction=0.47,
        sp=None,
        agb_method="species_allometric",
        derived_dbh=False,
        height_estimated=False,
    )
    b = propagate_co2e_uncertainty(
        inp,
        point_co2e_kg=100.0,
        dbh_cm=15.0,
        height_m=5.0,
        wd=0.68,
        root_shoot=0.27,
        carbon_fraction=0.47,
        sp=None,
        agb_method="species_allometric",
        derived_dbh=False,
        height_estimated=False,
    )
    assert a.co2e_kg_lower_90 == b.co2e_kg_lower_90
    assert a.co2e_kg_upper_90 == b.co2e_kg_upper_90
