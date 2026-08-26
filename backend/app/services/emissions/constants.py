"""GHG / methane emission source and gas catalog."""

from __future__ import annotations

from typing import Literal

SourceType = Literal[
    "landfill",
    "flare",
    "rice_paddy",
    "pipeline",
    "mine",
    "livestock",
    "compost",
    "other",
]

GasType = Literal["CH4", "CO2", "N2O", "NO2", "SO2"]

GeometryKind = Literal["point", "area"]

SOURCE_TYPES: tuple[str, ...] = (
    "landfill",
    "flare",
    "rice_paddy",
    "pipeline",
    "mine",
    "livestock",
    "compost",
    "other",
)

GAS_TYPES: tuple[str, ...] = ("CH4", "CO2", "N2O", "NO2", "SO2")

# Default satellite analysis buffer around work area union (km).
DEFAULT_SATELLITE_BUFFER_KM = 25.0

# Gaussian plume defaults
DEFAULT_RELEASE_HEIGHT_M = 2.0
DEFAULT_SIMULATION_HOURS = 24
DEFAULT_DOWNWIND_KM = 10.0
DEFAULT_CROSSWIND_KM = 2.0
