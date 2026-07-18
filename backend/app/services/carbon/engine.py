"""BYOT Carbon Calculation Engine.

Implements:
- Above-Ground Biomass (AGB) via species allometric or pan-tropical (Chave 2014)
  or generic IPCC fallback.
- Below-Ground Biomass (BGB) via species or IPCC root-shoot defaults.
- Carbon and CO2e conversion.
- Annual sequestration via species growth-curve interpolation.
- Lifetime credits + revenue projection with methodology buffer pool
  (Verra VM0047 default 20%) and verification-tier discount.
- Confidence score combining input completeness with species/growth confidence.

The engine is pure, deterministic, and version-tagged. Inputs/outputs are
dataclasses to keep the engine free of Pydantic/SQLAlchemy import cycles.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Literal

from app.services.carbon.species_catalog import SpeciesAllometric, by_name

ENGINE_VERSION = "byot-carbon-1.0.0"

# IPCC AR6 root-shoot defaults
IPCC_ROOT_SHOOT_DEFAULT = {
    "tropical_moist": 0.235,
    "tropical_dry": 0.275,
    "temperate": 0.260,
    "boreal": 0.320,
    "plantation": 0.250,
}

# Verification tier discount applied to lifetime revenue
TIER_FACTOR = {
    "speculative": 0.20,
    "ai_verified": 0.55,
    "verra_listed": 0.90,
    "verra_issued": 1.00,
}

# Methodology buffer pools (fraction WITHHELD from lifetime credits)
BUFFER_POOL = {
    "IPCC_AR6": 0.0,
    "VERRA_VM0047": 0.20,
    "GOLD_STANDARD_LUF": 0.15,
}


Methodology = Literal["IPCC_AR6", "VERRA_VM0047", "GOLD_STANDARD_LUF"]
ClimateZone = Literal["tropical", "subtropical", "temperate", "boreal"]
VerificationTier = Literal["speculative", "ai_verified", "verra_listed", "verra_issued"]


@dataclass
class CarbonInputs:
    species: str
    dbh_cm: float | None = None
    height_m: float | None = None
    age_years: float | None = None
    wood_density: float | None = None
    methodology: Methodology = "IPCC_AR6"
    climate_zone: ClimateZone = "tropical"
    ecological_zone: str | None = None
    price_usd_per_credit: float = 12.0
    verification_tier: VerificationTier = "ai_verified"


@dataclass
class CarbonResult:
    agb_kg: float
    bgb_kg: float
    total_biomass_kg: float
    carbon_kg: float
    co2e_kg: float
    annual_sequestration_kg: float | None
    lifetime_credits_tco2e: float | None
    estimated_revenue_usd: float | None
    confidence: float
    methodology: Methodology
    engine_version: str
    notes: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Core math
# ---------------------------------------------------------------------------


def _ipcc_root_shoot(zone: ClimateZone, ecological_zone: str | None) -> float:
    if ecological_zone == "plantation":
        return IPCC_ROOT_SHOOT_DEFAULT["plantation"]
    if zone in ("tropical", "subtropical"):
        if ecological_zone == "dry_forest":
            return IPCC_ROOT_SHOOT_DEFAULT["tropical_dry"]
        return IPCC_ROOT_SHOOT_DEFAULT["tropical_moist"]
    if zone == "temperate":
        return IPCC_ROOT_SHOOT_DEFAULT["temperate"]
    return IPCC_ROOT_SHOOT_DEFAULT["boreal"]


def _agb_species(dbh: float, sp: SpeciesAllometric) -> float:
    return float(sp.agb_coef_a) * (dbh ** float(sp.agb_coef_b))


def _agb_chave(dbh: float, height: float, wd: float) -> float:
    # Chave 2014 pan-tropical: AGB = 0.0673 * (rho * D^2 * H)^0.976
    return 0.0673 * (wd * (dbh ** 2) * height) ** 0.976


def _agb_ipcc_generic(dbh: float) -> float:
    # ln(AGB) = -2.289 + 2.649 * ln(DBH) - 0.021 * (ln(DBH))^2
    ld = math.log(max(dbh, 0.1))
    return math.exp(-2.289 + 2.649 * ld - 0.021 * ld * ld)


def _interp_growth(curve: dict[int, float], age: float) -> float:
    if not curve:
        return 0.0
    pts = sorted(curve.items())
    ages = [p[0] for p in pts]
    if age <= ages[0]:
        return pts[0][1] * (age / ages[0]) if ages[0] > 0 else pts[0][1]
    if age >= ages[-1]:
        return pts[-1][1]
    from itertools import pairwise
    for (a0, v0), (a1, v1) in pairwise(pts):
        if a0 <= age <= a1:
            t = (age - a0) / (a1 - a0)
            return v0 + t * (v1 - v0)
    return pts[-1][1]


def _height_from_dbh(dbh: float, sp: SpeciesAllometric | None) -> float:
    # Generic H-DBH: H = 1.3 + a*(1 - exp(-b*DBH))  (Feldpausch-style)
    a = float(sp.max_height_m) if sp else 22.0
    b = 0.05
    return 1.3 + a * (1.0 - math.exp(-b * dbh))


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------


class CarbonEngine:
    """Stateless carbon engine. Use `estimate_carbon(inputs)` for the simple path."""

    version = ENGINE_VERSION

    def estimate(self, inp: CarbonInputs) -> CarbonResult:
        notes: list[str] = []
        sp = by_name(inp.species)
        if sp is None:
            notes.append(
                f"species '{inp.species}' not in catalog; using IPCC generic equation"
            )

        # Resolve DBH (cm). If missing, derive from age via growth curve when available.
        dbh = inp.dbh_cm
        derived_dbh = False
        if dbh is None and sp and sp.growth_curve and inp.age_years is not None:
            dbh = _interp_growth(sp.growth_curve, inp.age_years)
            derived_dbh = True
            notes.append(f"DBH inferred from species growth curve at age {inp.age_years}y")
        if dbh is None:
            # ultra-fallback so the engine still returns something useful
            dbh = 5.0
            notes.append("DBH missing and not derivable; assumed 5.0 cm")

        # Height
        height = inp.height_m
        if height is None:
            height = _height_from_dbh(dbh, sp)
            notes.append("height estimated from DBH (Feldpausch-style)")

        # Wood density
        wd = inp.wood_density or (float(sp.wood_density) if sp else 0.60)

        # AGB selection
        if sp is not None and not derived_dbh:
            agb = _agb_species(dbh, sp)
            agb_method = "species_allometric"
        elif inp.height_m is not None and (inp.wood_density is not None or sp is not None):
            agb = _agb_chave(dbh, height, wd)
            agb_method = "chave_2014"
        elif sp is not None:
            agb = _agb_species(dbh, sp)
            agb_method = "species_allometric_derived_dbh"
        else:
            agb = _agb_ipcc_generic(dbh)
            agb_method = "ipcc_generic"
        notes.append(f"AGB method: {agb_method}")

        # BGB
        if sp and sp.root_shoot_ratio is not None:
            r = float(sp.root_shoot_ratio)
        else:
            r = _ipcc_root_shoot(inp.climate_zone, inp.ecological_zone)
        bgb = r * agb

        # Carbon + CO2e
        cf = float(sp.carbon_fraction) if sp else 0.47
        total_biomass = agb + bgb
        carbon = total_biomass * cf
        co2e = carbon * (44.0 / 12.0)

        # Annual sequestration: difference vs one year prior on growth curve.
        annual_seq_kg: float | None = None
        if sp and sp.growth_curve and inp.age_years is not None and inp.age_years > 0:
            prev_age = max(0.0, inp.age_years - 1.0)
            prev_dbh = _interp_growth(sp.growth_curve, prev_age) if prev_age > 0 else 0.0
            prev_agb = _agb_species(prev_dbh, sp) if prev_dbh > 0 else 0.0
            prev_bgb = r * prev_agb
            prev_carbon = (prev_agb + prev_bgb) * cf
            prev_co2e = prev_carbon * (44.0 / 12.0)
            annual_seq_kg = max(0.0, co2e - prev_co2e)

        # Lifetime credits projected over species useful life (max DBH age)
        lifetime_credits_t: float | None = None
        if sp and sp.growth_curve:
            max_age = max(sp.growth_curve.keys())
            cumulative = 0.0
            for yr in range(1, int(max_age) + 1):
                d_now = _interp_growth(sp.growth_curve, yr)
                d_prev = _interp_growth(sp.growth_curve, yr - 1)
                a_now = _agb_species(d_now, sp)
                a_prev = _agb_species(d_prev, sp) if d_prev > 0 else 0.0
                delta_biomass = (a_now - a_prev) * (1 + r)
                delta_co2e = delta_biomass * cf * (44.0 / 12.0)
                cumulative += max(0.0, delta_co2e)
            lifetime_credits_t = (cumulative / 1000.0) * (
                1.0 - BUFFER_POOL.get(inp.methodology, 0.0)
            )

        # Revenue
        revenue: float | None = None
        if lifetime_credits_t is not None:
            revenue = (
                lifetime_credits_t
                * inp.price_usd_per_credit
                * TIER_FACTOR.get(inp.verification_tier, 0.55)
            )

        # Confidence: input completeness + species coverage
        comp = 0.0
        if inp.dbh_cm is not None:
            comp += 0.35
        if inp.height_m is not None:
            comp += 0.20
        if inp.age_years is not None:
            comp += 0.15
        if sp is not None:
            comp += 0.20
        if inp.wood_density is not None or sp is not None:
            comp += 0.10
        confidence = max(0.05, min(1.0, comp))

        return CarbonResult(
            agb_kg=round(agb, 2),
            bgb_kg=round(bgb, 2),
            total_biomass_kg=round(total_biomass, 2),
            carbon_kg=round(carbon, 2),
            co2e_kg=round(co2e, 2),
            annual_sequestration_kg=(round(annual_seq_kg, 2) if annual_seq_kg is not None else None),
            lifetime_credits_tco2e=(
                round(lifetime_credits_t, 3) if lifetime_credits_t is not None else None
            ),
            estimated_revenue_usd=(round(revenue, 2) if revenue is not None else None),
            confidence=round(confidence, 3),
            methodology=inp.methodology,
            engine_version=self.version,
            notes=notes,
        )


_engine = CarbonEngine()


def estimate_carbon(inp: CarbonInputs) -> CarbonResult:
    return _engine.estimate(inp)
