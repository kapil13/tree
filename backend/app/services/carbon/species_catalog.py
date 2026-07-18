"""Seed catalog of species allometric coefficients.

Values are *operational defaults* calibrated against Chave et al. 2014,
IPCC AR6, and regional literature. The Python list is mirrored into the
`species` DB table by `scripts/seed_demo.py`. The carbon engine falls
back to genus/family defaults, then to a generic IPCC equation, when a
species is not present here.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SpeciesAllometric:
    scientific_name: str
    common_name: str
    family: str | None
    # AGB_kg = a * DBH_cm^b
    agb_coef_a: float
    agb_coef_b: float
    wood_density: float  # g/cm^3
    root_shoot_ratio: float
    carbon_fraction: float = 0.47
    max_height_m: float = 25.0
    max_dbh_cm: float = 80.0
    # Simple growth curve (age_years -> DBH_cm). Linearly interpolated.
    growth_curve: dict[int, float] | None = None


SPECIES_CATALOG: list[SpeciesAllometric] = [
    SpeciesAllometric(
        "Azadirachta indica", "Neem", "Meliaceae",
        agb_coef_a=0.0673, agb_coef_b=2.34, wood_density=0.68,
        root_shoot_ratio=0.27, max_height_m=20, max_dbh_cm=80,
        growth_curve={1: 2.0, 3: 6.0, 5: 12.0, 10: 22.0, 20: 40.0, 40: 65.0},
    ),
    SpeciesAllometric(
        "Ficus religiosa", "Peepal", "Moraceae",
        agb_coef_a=0.1240, agb_coef_b=2.41, wood_density=0.42,
        root_shoot_ratio=0.24, max_height_m=30, max_dbh_cm=100,
        growth_curve={1: 1.5, 3: 5.0, 5: 10.0, 10: 22.0, 20: 45.0, 50: 80.0},
    ),
    SpeciesAllometric(
        "Ficus benghalensis", "Banyan", "Moraceae",
        agb_coef_a=0.1500, agb_coef_b=2.46, wood_density=0.48,
        root_shoot_ratio=0.25, max_height_m=30, max_dbh_cm=150,
        growth_curve={1: 1.8, 3: 6.0, 5: 11.0, 10: 24.0, 20: 50.0, 50: 100.0},
    ),
    SpeciesAllometric(
        "Mangifera indica", "Mango", "Anacardiaceae",
        agb_coef_a=0.1100, agb_coef_b=2.42, wood_density=0.55,
        root_shoot_ratio=0.26, max_height_m=20, max_dbh_cm=80,
        growth_curve={1: 1.5, 3: 5.0, 5: 9.0, 10: 18.0, 20: 35.0, 40: 60.0},
    ),
    SpeciesAllometric(
        "Phyllanthus emblica", "Amla", "Phyllanthaceae",
        agb_coef_a=0.0530, agb_coef_b=2.30, wood_density=0.62,
        root_shoot_ratio=0.27, max_height_m=15, max_dbh_cm=50,
        growth_curve={1: 1.2, 3: 4.0, 5: 7.5, 10: 15.0, 20: 28.0, 40: 45.0},
    ),
    SpeciesAllometric(
        "Bambusa vulgaris", "Bamboo (Common)", "Poaceae",
        agb_coef_a=0.0240, agb_coef_b=2.50, wood_density=0.60,
        root_shoot_ratio=0.30, max_height_m=20, max_dbh_cm=15,
        growth_curve={1: 4.0, 2: 8.0, 3: 12.0, 5: 15.0, 10: 15.0},
    ),
    SpeciesAllometric(
        "Tectona grandis", "Teak", "Lamiaceae",
        agb_coef_a=0.0940, agb_coef_b=2.45, wood_density=0.65,
        root_shoot_ratio=0.27, max_height_m=35, max_dbh_cm=100,
        growth_curve={1: 1.5, 3: 6.0, 5: 11.0, 10: 22.0, 20: 40.0, 40: 65.0},
    ),
    SpeciesAllometric(
        "Dalbergia sissoo", "Sheesham", "Fabaceae",
        agb_coef_a=0.0890, agb_coef_b=2.42, wood_density=0.78,
        root_shoot_ratio=0.27, max_height_m=25, max_dbh_cm=80,
        growth_curve={1: 1.5, 3: 5.0, 5: 10.0, 10: 20.0, 20: 38.0, 40: 60.0},
    ),
    SpeciesAllometric(
        "Eucalyptus globulus", "Eucalyptus", "Myrtaceae",
        agb_coef_a=0.0770, agb_coef_b=2.50, wood_density=0.70,
        root_shoot_ratio=0.24, max_height_m=55, max_dbh_cm=120,
        growth_curve={1: 3.0, 3: 9.0, 5: 15.0, 10: 28.0, 20: 50.0, 40: 80.0},
    ),
    SpeciesAllometric(
        "Pongamia pinnata", "Pongamia", "Fabaceae",
        agb_coef_a=0.0810, agb_coef_b=2.40, wood_density=0.63,
        root_shoot_ratio=0.27, max_height_m=20, max_dbh_cm=60,
        growth_curve={1: 1.5, 3: 5.0, 5: 9.0, 10: 18.0, 20: 35.0, 40: 55.0},
    ),
]


def by_name(name: str) -> SpeciesAllometric | None:
    if not name:
        return None
    n = name.strip().lower()
    for s in SPECIES_CATALOG:
        if s.scientific_name.lower() == n or s.common_name.lower() == n:
            return s
    # loose contains
    for s in SPECIES_CATALOG:
        if n in s.scientific_name.lower() or n in s.common_name.lower():
            return s
    return None
