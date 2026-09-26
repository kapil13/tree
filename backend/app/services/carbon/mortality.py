"""Survival / mortality modeling for lifetime credit projections.

Applies age- and ecozone-dependent annual survival rates to forward-looking
carbon accumulation. Used to decay ex-ante lifetime credits when trees may not
survive the full rotation.
"""

from __future__ import annotations

from typing import Literal

ClimateZone = Literal["tropical", "subtropical", "temperate", "boreal"]

# Base annual survival (fraction alive year-over-year) by ecological context
BASE_ANNUAL_SURVIVAL: dict[str, float] = {
    "tropical_moist": 0.94,
    "tropical_dry": 0.90,
    "plantation": 0.92,
    "temperate": 0.95,
    "boreal": 0.93,
    "default": 0.92,
}

# Young plantations face higher establishment mortality (multiplier on mortality rate)
AGE_MORTALITY_FACTOR: dict[str, float] = {
    "0-2": 1.35,
    "3-5": 1.15,
    "6-10": 1.0,
    "10+": 0.95,
}


def _ecological_survival_key(climate_zone: ClimateZone, ecological_zone: str | None) -> str:
    if ecological_zone == "plantation":
        return "plantation"
    if climate_zone in ("tropical", "subtropical"):
        if ecological_zone == "dry_forest":
            return "tropical_dry"
        return "tropical_moist"
    if climate_zone == "temperate":
        return "temperate"
    if climate_zone == "boreal":
        return "boreal"
    return "default"


def _age_mortality_factor(age_years: float) -> float:
    if age_years < 3:
        return AGE_MORTALITY_FACTOR["0-2"]
    if age_years < 6:
        return AGE_MORTALITY_FACTOR["3-5"]
    if age_years < 11:
        return AGE_MORTALITY_FACTOR["6-10"]
    return AGE_MORTALITY_FACTOR["10+"]


def annual_survival_rate(
    *,
    climate_zone: ClimateZone = "tropical",
    ecological_zone: str | None = None,
    age_years: float = 0.0,
    annual_mortality_pct: float | None = None,
) -> float:
    """Return fraction of cohort surviving one year (0–1)."""
    if annual_mortality_pct is not None:
        return max(0.0, min(1.0, 1.0 - annual_mortality_pct / 100.0))

    key = _ecological_survival_key(climate_zone, ecological_zone)
    base = BASE_ANNUAL_SURVIVAL.get(key, BASE_ANNUAL_SURVIVAL["default"])
    mortality = 1.0 - base
    mortality *= _age_mortality_factor(age_years)
    return max(0.05, min(1.0, 1.0 - mortality))


def effective_annual_mortality_pct(
    *,
    climate_zone: ClimateZone = "tropical",
    ecological_zone: str | None = None,
    age_years: float = 0.0,
    annual_mortality_pct: float | None = None,
) -> float:
    survival = annual_survival_rate(
        climate_zone=climate_zone,
        ecological_zone=ecological_zone,
        age_years=age_years,
        annual_mortality_pct=annual_mortality_pct,
    )
    return round((1.0 - survival) * 100.0, 2)


def apply_mortality_to_yearly_deltas(
    yearly_delta_co2e_kg: list[float],
    *,
    climate_zone: ClimateZone = "tropical",
    ecological_zone: str | None = None,
    start_age_years: float = 0.0,
    annual_mortality_pct: float | None = None,
) -> float:
    """Sum yearly sequestration deltas weighted by cumulative survival."""
    cumulative_survival = 1.0
    adjusted_total = 0.0
    for i, delta in enumerate(yearly_delta_co2e_kg):
        age = start_age_years + i + 1
        survival = annual_survival_rate(
            climate_zone=climate_zone,
            ecological_zone=ecological_zone,
            age_years=age,
            annual_mortality_pct=annual_mortality_pct,
        )
        cumulative_survival *= survival
        adjusted_total += max(0.0, delta) * cumulative_survival
    return adjusted_total


def mortality_factor_over_years(
    years: int,
    *,
    climate_zone: ClimateZone = "tropical",
    ecological_zone: str | None = None,
    start_age_years: float = 0.0,
    annual_mortality_pct: float | None = None,
) -> float:
    """Cumulative survival fraction after `years` (for quick tests)."""
    if years <= 0:
        return 1.0
    cumulative = 1.0
    for i in range(years):
        age = start_age_years + i + 1
        cumulative *= annual_survival_rate(
            climate_zone=climate_zone,
            ecological_zone=ecological_zone,
            age_years=age,
            annual_mortality_pct=annual_mortality_pct,
        )
    return cumulative
