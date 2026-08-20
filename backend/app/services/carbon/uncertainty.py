"""Measurement uncertainty propagation for the carbon engine.

Uses Monte Carlo simulation to propagate:
  DBH / height measurement error → allometric model RMSE → wood density variance
  → root-shoot ratio uncertainty → CO₂e 90% confidence interval.

Verra VM0047: when combined uncertainty exceeds 15%, apply a conservative
deduction to creditable quantities (see `verra_uncertainty_deduction_pct`).
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import TYPE_CHECKING

from app.services.carbon.biomass_math import (
    agb_chave,
    agb_ipcc_generic,
    agb_species,
    height_from_dbh,
)
from app.services.carbon.species_catalog import SpeciesAllometric
from app.services.trees.measurements import (
    DEFAULT_UNCERTAINTY_DBH_PCT,
    DEFAULT_UNCERTAINTY_HEIGHT_PCT,
)

if TYPE_CHECKING:
    from app.services.carbon.engine import CarbonInputs

# Coefficient of variation (fraction) for allometric model structural error
ALLOMETRIC_CV: dict[str, float] = {
    "species_allometric": 0.12,
    "species_allometric_derived_dbh": 0.18,
    "chave_2014": 0.16,
    "ipcc_generic": 0.25,
}

WOOD_DENSITY_CV = 0.05
WOOD_DENSITY_CV_UNKNOWN = 0.10
ROOT_SHOOT_CV = 0.10
DERIVED_DBH_CV = 0.22
FALLBACK_DBH_CV = 0.30

MC_SAMPLES = 1500
Z_90 = 1.645  # two-sided 90% CI half-width for normal approximation check


@dataclass(frozen=True)
class UncertaintyResult:
    co2e_kg_lower_90: float
    co2e_kg_upper_90: float
    uncertainty_pct: float
    verra_deduction_pct: float
    creditable_co2e_kg: float


def verra_uncertainty_deduction_pct(uncertainty_pct: float, methodology: str) -> float:
    """Conservative VM0047-style deduction when uncertainty exceeds 15%."""
    if methodology != "VERRA_VM0047":
        return 0.0
    return max(0.0, uncertainty_pct - 15.0)


def _pct_to_sigma(pct: float | None, fallback_pct: float) -> float:
    value = pct if pct is not None else fallback_pct
    return max(0.0, value) / 100.0


def _resolve_measurement_sigmas(inp: CarbonInputs) -> tuple[float, float]:
    method = inp.measurement_method or "visual_estimate"
    dbh_sigma = _pct_to_sigma(
        inp.uncertainty_dbh_pct,
        DEFAULT_UNCERTAINTY_DBH_PCT.get(method, 20.0),
    )
    height_sigma = _pct_to_sigma(
        inp.uncertainty_height_pct,
        DEFAULT_UNCERTAINTY_HEIGHT_PCT.get(method, 25.0),
    )
    return dbh_sigma, height_sigma


def _sample_co2e(
    rng: random.Random,
    *,
    inp: CarbonInputs,
    dbh_cm: float,
    height_m: float,
    wd: float,
    root_shoot: float,
    carbon_fraction: float,
    sp: SpeciesAllometric | None,
    agb_method: str,
    dbh_sigma: float,
    height_sigma: float,
    height_estimated: bool,
    derived_dbh: bool,
) -> float:
    if derived_dbh:
        dbh_s = DERIVED_DBH_CV
    elif inp.dbh_cm is None:
        dbh_s = FALLBACK_DBH_CV
    else:
        dbh_s = dbh_sigma

    s_dbh = max(0.1, rng.gauss(dbh_cm, dbh_cm * dbh_s))

    if height_estimated:
        s_height = height_from_dbh(s_dbh, sp)
    else:
        s_height = max(0.5, rng.gauss(height_m, height_m * height_sigma))

    wd_cv = WOOD_DENSITY_CV if sp else WOOD_DENSITY_CV_UNKNOWN
    s_wd = max(0.2, wd * rng.gauss(1.0, wd_cv))

    allo_cv = ALLOMETRIC_CV.get(agb_method, 0.20)
    allo_mult = max(0.05, rng.lognormvariate(0.0, allo_cv))

    rs_mult = max(0.05, rng.gauss(1.0, ROOT_SHOOT_CV))

    if agb_method in ("species_allometric", "species_allometric_derived_dbh") and sp is not None:
        agb = agb_species(s_dbh, sp) * allo_mult
    elif agb_method == "chave_2014":
        agb = agb_chave(s_dbh, s_height, s_wd) * allo_mult
    else:
        agb = agb_ipcc_generic(s_dbh) * allo_mult

    r = max(0.05, root_shoot * rs_mult)
    bgb = r * agb
    carbon = (agb + bgb) * carbon_fraction
    return carbon * (44.0 / 12.0)


def propagate_co2e_uncertainty(
    inp: CarbonInputs,
    *,
    point_co2e_kg: float,
    dbh_cm: float,
    height_m: float,
    wd: float,
    root_shoot: float,
    carbon_fraction: float,
    sp: SpeciesAllometric | None,
    agb_method: str,
    derived_dbh: bool,
    height_estimated: bool,
) -> UncertaintyResult:
    """Monte Carlo 90% CI on CO₂e (kg). Deterministic seed from inputs."""
    if point_co2e_kg <= 0:
        return UncertaintyResult(
            co2e_kg_lower_90=0.0,
            co2e_kg_upper_90=0.0,
            uncertainty_pct=100.0,
            verra_deduction_pct=verra_uncertainty_deduction_pct(100.0, inp.methodology),
            creditable_co2e_kg=0.0,
        )

    dbh_sigma, height_sigma = _resolve_measurement_sigmas(inp)
    seed = hash(
        (
            inp.species,
            round(dbh_cm, 4),
            round(height_m, 4),
            inp.measurement_method,
            agb_method,
            inp.methodology,
        )
    ) & 0xFFFFFFFF
    rng = random.Random(seed)

    samples = [
        _sample_co2e(
            rng,
            inp=inp,
            dbh_cm=dbh_cm,
            height_m=height_m,
            wd=wd,
            root_shoot=root_shoot,
            carbon_fraction=carbon_fraction,
            sp=sp,
            agb_method=agb_method,
            dbh_sigma=dbh_sigma,
            height_sigma=height_sigma,
            height_estimated=height_estimated,
            derived_dbh=derived_dbh,
        )
        for _ in range(MC_SAMPLES)
    ]
    samples.sort()
    lower = samples[int(0.05 * len(samples))]
    upper = samples[int(0.95 * len(samples)) - 1]

    half_width = (upper - lower) / 2.0
    uncertainty_pct = (half_width / point_co2e_kg) * 100.0
    deduction = verra_uncertainty_deduction_pct(uncertainty_pct, inp.methodology)
    creditable = point_co2e_kg * (1.0 - deduction / 100.0)

    return UncertaintyResult(
        co2e_kg_lower_90=round(lower, 2),
        co2e_kg_upper_90=round(upper, 2),
        uncertainty_pct=round(uncertainty_pct, 2),
        verra_deduction_pct=round(deduction, 2),
        creditable_co2e_kg=round(creditable, 2),
    )


def apply_verra_deduction_to_credits(
    credits_tco2e: float | None,
    uncertainty_pct: float,
    methodology: str,
) -> float | None:
    if credits_tco2e is None:
        return None
    deduction = verra_uncertainty_deduction_pct(uncertainty_pct, methodology)
    return round(credits_tco2e * (1.0 - deduction / 100.0), 3)
