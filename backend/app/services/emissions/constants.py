"""GHG / methane emission source and gas catalog."""

from __future__ import annotations

from typing import Any, Literal

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

SOURCE_CATALOG: list[dict[str, Any]] = [
    {"code": "landfill", "label": "Landfill / waste", "description": "MSW, dumps, biogas vents"},
    {"code": "flare", "label": "Flare / combustion", "description": "Gas flares, stacks, generators"},
    {"code": "rice_paddy", "label": "Rice paddy", "description": "Flooded agriculture"},
    {"code": "pipeline", "label": "Pipeline / leak", "description": "NG, biogas, industrial pipes"},
    {"code": "mine", "label": "Mine / industrial", "description": "Coal, ore, processing plants"},
    {"code": "livestock", "label": "Livestock", "description": "Enteric / manure sources"},
    {"code": "compost", "label": "Compost / organics", "description": "Composting, digestate"},
    {"code": "other", "label": "Other", "description": "General point or area source"},
]

GAS_CATALOG: list[dict[str, Any]] = [
    {
        "code": "CH4",
        "label": "Methane",
        "symbol": "CH₄",
        "unit_rate": "g/s",
        "unit_annual": "t/yr",
        "satellite_supported": True,
        "fusion_supported": True,
        "suggested_source_types": ["landfill", "rice_paddy", "pipeline", "livestock", "compost"],
    },
    {
        "code": "CO2",
        "label": "Carbon dioxide",
        "symbol": "CO₂",
        "unit_rate": "g/s",
        "unit_annual": "t/yr",
        "satellite_supported": False,
        "fusion_supported": False,
        "suggested_source_types": ["flare", "mine", "other"],
    },
    {
        "code": "N2O",
        "label": "Nitrous oxide",
        "symbol": "N₂O",
        "unit_rate": "g/s",
        "unit_annual": "t/yr",
        "satellite_supported": False,
        "fusion_supported": False,
        "suggested_source_types": ["rice_paddy", "compost", "livestock", "other"],
    },
    {
        "code": "NO2",
        "label": "Nitrogen dioxide",
        "symbol": "NO₂",
        "unit_rate": "g/s",
        "unit_annual": "t/yr",
        "satellite_supported": False,
        "fusion_supported": False,
        "suggested_source_types": ["flare", "mine", "pipeline", "other"],
    },
    {
        "code": "SO2",
        "label": "Sulfur dioxide",
        "symbol": "SO₂",
        "unit_rate": "g/s",
        "unit_annual": "t/yr",
        "satellite_supported": False,
        "fusion_supported": False,
        "suggested_source_types": ["mine", "flare", "other"],
    },
]

def emission_catalog() -> dict[str, Any]:
    return {"gases": GAS_CATALOG, "source_types": SOURCE_CATALOG}

# Default satellite analysis buffer around work area union (km).
DEFAULT_SATELLITE_BUFFER_KM = 25.0

# Gaussian plume defaults
DEFAULT_RELEASE_HEIGHT_M = 2.0
DEFAULT_SIMULATION_HOURS = 24
DEFAULT_DOWNWIND_KM = 10.0
DEFAULT_CROSSWIND_KM = 2.0
