"""Shared biomass allometric math (no engine/uncertainty imports)."""

from __future__ import annotations

import math
from typing import Literal

from app.services.carbon.species_catalog import SpeciesAllometric

ClimateZone = Literal["tropical", "subtropical", "temperate", "boreal"]

IPCC_ROOT_SHOOT_DEFAULT = {
    "tropical_moist": 0.235,
    "tropical_dry": 0.275,
    "temperate": 0.260,
    "boreal": 0.320,
    "plantation": 0.250,
}


def ipcc_root_shoot(zone: ClimateZone, ecological_zone: str | None) -> float:
    if ecological_zone == "plantation":
        return IPCC_ROOT_SHOOT_DEFAULT["plantation"]
    if zone in ("tropical", "subtropical"):
        if ecological_zone == "dry_forest":
            return IPCC_ROOT_SHOOT_DEFAULT["tropical_dry"]
        return IPCC_ROOT_SHOOT_DEFAULT["tropical_moist"]
    if zone == "temperate":
        return IPCC_ROOT_SHOOT_DEFAULT["temperate"]
    return IPCC_ROOT_SHOOT_DEFAULT["boreal"]


def agb_species(dbh: float, sp: SpeciesAllometric) -> float:
    return float(sp.agb_coef_a) * (dbh ** float(sp.agb_coef_b))


def agb_chave(dbh: float, height: float, wd: float) -> float:
    return 0.0673 * (wd * (dbh**2) * height) ** 0.976


def agb_ipcc_generic(dbh: float) -> float:
    ld = math.log(max(dbh, 0.1))
    return math.exp(-2.289 + 2.649 * ld - 0.021 * ld * ld)


def height_from_dbh(dbh: float, sp: SpeciesAllometric | None) -> float:
    a = float(sp.max_height_m) if sp else 22.0
    b = 0.05
    return 1.3 + a * (1.0 - math.exp(-b * dbh))


def interp_growth(curve: dict[int, float], age: float) -> float:
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
