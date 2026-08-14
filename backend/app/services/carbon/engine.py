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
- Monte Carlo uncertainty propagation with 90% CO₂e confidence intervals
  and Verra VM0047 uncertainty deduction when applicable.
- Mortality-adjusted lifetime credit projections and dynamic NPRT buffer pools.
- Ex-ante (projected) vs ex-post (verified standing stock) credit split.

The engine is pure, deterministic, and version-tagged. Inputs/outputs are
dataclasses to keep the engine free of Pydantic/SQLAlchemy import cycles.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from app.services.carbon.biomass_math import (
    agb_chave,
    agb_ipcc_generic,
    agb_species,
    height_from_dbh,
    interp_growth,
    ipcc_root_shoot,
)
from app.services.carbon.species_catalog import by_name

ENGINE_VERSION = "byot-carbon-1.2.0"

# Re-export for ledger / reports (prefer buffer.resolve_buffer_pct at runtime)
from app.services.carbon.buffer import DEFAULT_BUFFER_POOL as BUFFER_POOL  # noqa: E402, F401

# Verification tier discount applied to lifetime revenue
TIER_FACTOR = {
    "speculative": 0.20,
    "ai_verified": 0.55,
    "verra_listed": 0.90,
    "verra_issued": 1.00,
}

_EX_POST_TIERS = frozenset({"verra_listed", "verra_issued"})
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
    # MRV measurement provenance (from tree_measurements when available)
    measurement_method: str | None = None
    uncertainty_dbh_pct: float | None = None
    uncertainty_height_pct: float | None = None
    # Mortality / buffer (Sprint 3–4)
    annual_mortality_pct: float | None = None
    buffer_pct: float | None = None
    nprt_score: float | None = None
    ex_post_verified: bool = False


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
    co2e_kg_lower_90: float | None = None
    co2e_kg_upper_90: float | None = None
    uncertainty_pct: float | None = None
    verra_deduction_pct: float | None = None
    creditable_co2e_kg: float | None = None
    projected_lifetime_credits_tco2e: float | None = None
    verified_co2e_kg: float | None = None
    verified_lifetime_credits_tco2e: float | None = None
    buffer_pct_applied: float | None = None
    effective_annual_mortality_pct: float | None = None


# ---------------------------------------------------------------------------
# Core math — delegated to biomass_math
# ---------------------------------------------------------------------------

_agb_species = agb_species
_agb_chave = agb_chave
_agb_ipcc_generic = agb_ipcc_generic
_interp_growth = interp_growth
_height_from_dbh = height_from_dbh
_ipcc_root_shoot = ipcc_root_shoot


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
        from app.services.carbon.buffer import resolve_buffer_pct
        from app.services.carbon.mortality import (
            apply_mortality_to_yearly_deltas,
            effective_annual_mortality_pct,
        )

        buffer_pct = resolve_buffer_pct(
            inp.methodology,
            buffer_pct=inp.buffer_pct,
            nprt_score=inp.nprt_score,
        )
        mortality_pct = effective_annual_mortality_pct(
            climate_zone=inp.climate_zone,
            ecological_zone=inp.ecological_zone,
            age_years=inp.age_years or 0.0,
            annual_mortality_pct=inp.annual_mortality_pct,
        )
        if inp.nprt_score is not None:
            notes.append(
                f"Dynamic NPRT buffer: {buffer_pct * 100:.0f}% (NPRT score {inp.nprt_score:.0f})"
            )
        elif inp.buffer_pct is not None:
            notes.append(f"Custom buffer pool: {buffer_pct * 100:.0f}%")
        if mortality_pct > 0:
            notes.append(f"Mortality-adjusted projection: {mortality_pct:.1f}% annual mortality")

        lifetime_credits_t: float | None = None
        projected_lifetime_t: float | None = None
        if sp and sp.growth_curve:
            max_age = max(sp.growth_curve.keys())
            yearly_deltas: list[float] = []
            for yr in range(1, int(max_age) + 1):
                d_now = _interp_growth(sp.growth_curve, yr)
                d_prev = _interp_growth(sp.growth_curve, yr - 1)
                a_now = _agb_species(d_now, sp)
                a_prev = _agb_species(d_prev, sp) if d_prev > 0 else 0.0
                delta_biomass = (a_now - a_prev) * (1 + r)
                delta_co2e = delta_biomass * cf * (44.0 / 12.0)
                yearly_deltas.append(max(0.0, delta_co2e))

            gross_kg = apply_mortality_to_yearly_deltas(
                yearly_deltas,
                climate_zone=inp.climate_zone,
                ecological_zone=inp.ecological_zone,
                start_age_years=inp.age_years or 0.0,
                annual_mortality_pct=inp.annual_mortality_pct,
            )
            projected_lifetime_t = (gross_kg / 1000.0) * (1.0 - buffer_pct)
            lifetime_credits_t = projected_lifetime_t

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

        height_estimated = inp.height_m is None
        from app.services.carbon.uncertainty import (
            apply_verra_deduction_to_credits,
            propagate_co2e_uncertainty,
        )

        uncertainty = propagate_co2e_uncertainty(
            inp,
            point_co2e_kg=co2e,
            dbh_cm=dbh,
            height_m=height,
            wd=wd,
            root_shoot=r,
            carbon_fraction=cf,
            sp=sp,
            agb_method=agb_method,
            derived_dbh=derived_dbh,
            height_estimated=height_estimated,
        )
        if uncertainty.uncertainty_pct > 0:
            notes.append(
                f"90% CI CO₂e: {uncertainty.co2e_kg_lower_90:.1f}–{uncertainty.co2e_kg_upper_90:.1f} kg "
                f"(±{uncertainty.uncertainty_pct:.1f}%)"
            )
        if uncertainty.verra_deduction_pct > 0:
            notes.append(
                f"Verra VM0047 uncertainty deduction: {uncertainty.verra_deduction_pct:.1f}% "
                f"(threshold 15%)"
            )
        lifetime_credits_t = apply_verra_deduction_to_credits(
            lifetime_credits_t, uncertainty.uncertainty_pct, inp.methodology
        )
        if projected_lifetime_t is not None and lifetime_credits_t is not None:
            projected_lifetime_t = lifetime_credits_t

        verified_co2e: float | None = None
        verified_lifetime_t: float | None = None
        is_ex_post = inp.ex_post_verified or inp.verification_tier in _EX_POST_TIERS
        if is_ex_post:
            verified_co2e = uncertainty.creditable_co2e_kg or co2e
            verified_lifetime_t = round(
                (verified_co2e / 1000.0) * (1.0 - buffer_pct), 3
            )
            notes.append("Ex-post verified standing stock applied to creditable quantity")

        revenue: float | None = None
        if lifetime_credits_t is not None:
            revenue = (
                lifetime_credits_t
                * inp.price_usd_per_credit
                * TIER_FACTOR.get(inp.verification_tier, 0.55)
            )

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
            co2e_kg_lower_90=uncertainty.co2e_kg_lower_90,
            co2e_kg_upper_90=uncertainty.co2e_kg_upper_90,
            uncertainty_pct=uncertainty.uncertainty_pct,
            verra_deduction_pct=uncertainty.verra_deduction_pct,
            creditable_co2e_kg=uncertainty.creditable_co2e_kg,
            projected_lifetime_credits_tco2e=(
                round(projected_lifetime_t, 3) if projected_lifetime_t is not None else None
            ),
            verified_co2e_kg=round(verified_co2e, 2) if verified_co2e is not None else None,
            verified_lifetime_credits_tco2e=verified_lifetime_t,
            buffer_pct_applied=round(buffer_pct, 4),
            effective_annual_mortality_pct=mortality_pct,
        )


_engine = CarbonEngine()


def estimate_carbon(inp: CarbonInputs) -> CarbonResult:
    return _engine.estimate(inp)
