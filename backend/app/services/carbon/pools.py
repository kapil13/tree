"""Additional carbon pools (deadwood, litter, SOC) for VM0047 quantification."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CarbonPoolBreakdown:
    deadwood_kg: float
    litter_kg: float
    soc_carbon_kg: float
    living_biomass_kg: float
    total_biomass_kg: float
    living_carbon_kg: float
    total_carbon_kg: float
    total_co2e_kg: float

    def to_dict(self) -> dict[str, float]:
        return {
            "deadwood_kg": self.deadwood_kg,
            "litter_kg": self.litter_kg,
            "soc_carbon_kg": self.soc_carbon_kg,
            "living_biomass_kg": self.living_biomass_kg,
            "total_biomass_kg": self.total_biomass_kg,
            "living_carbon_kg": self.living_carbon_kg,
            "total_carbon_kg": self.total_carbon_kg,
            "total_co2e_kg": self.total_co2e_kg,
        }


def compute_carbon_pools(
    *,
    agb_kg: float,
    bgb_kg: float,
    carbon_fraction: float,
    deadwood_ratio: float = 0.08,
    litter_ratio: float = 0.04,
    soc_tco2e_per_ha: float | None = None,
    area_ha: float | None = None,
) -> CarbonPoolBreakdown:
    """Extend living biomass (AGB+BGB) with deadwood, litter, and optional SOC."""
    living_biomass = agb_kg + bgb_kg
    deadwood_kg = max(0.0, agb_kg * deadwood_ratio)
    litter_kg = max(0.0, agb_kg * litter_ratio)
    total_biomass = living_biomass + deadwood_kg + litter_kg

    living_carbon = living_biomass * carbon_fraction
    deadwood_carbon = deadwood_kg * carbon_fraction
    litter_carbon = litter_kg * carbon_fraction
    biomass_carbon = living_carbon + deadwood_carbon + litter_carbon

    soc_carbon_kg = 0.0
    if soc_tco2e_per_ha is not None and area_ha is not None and area_ha > 0:
        soc_co2e_kg = soc_tco2e_per_ha * area_ha * 1000.0
        soc_carbon_kg = soc_co2e_kg * (12.0 / 44.0)

    total_carbon = biomass_carbon + soc_carbon_kg
    total_co2e = total_carbon * (44.0 / 12.0)

    return CarbonPoolBreakdown(
        deadwood_kg=round(deadwood_kg, 3),
        litter_kg=round(litter_kg, 3),
        soc_carbon_kg=round(soc_carbon_kg, 3),
        living_biomass_kg=round(living_biomass, 3),
        total_biomass_kg=round(total_biomass, 3),
        living_carbon_kg=round(living_carbon, 3),
        total_carbon_kg=round(total_carbon, 3),
        total_co2e_kg=round(total_co2e, 3),
    )
