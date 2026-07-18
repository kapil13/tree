"""Shared constants for planting projects, work areas, and compliance."""

from __future__ import annotations

from typing import Literal

ProjectSegment = Literal[
    "nhai_highway",
    "industrial_greenbelt",
    "township_landscape",
    "ngo_watershed",
    "general",
]

ComplianceMode = Literal["open", "guided", "strict"]

WorkAreaGeometryType = Literal["polygon", "corridor"]

ProjectStatus = Literal["planning", "active", "completed", "archived"]

ViolationSeverity = Literal["block", "warn", "audit"]

ViolationType = Literal[
    "outside_boundary",
    "work_area_required",
    "spacing_too_close",
    "gps_accuracy_poor",
    "species_not_allowed",
    "density_out_of_range",
    "pit_size_missing",
]

SEGMENT_LABELS: dict[str, str] = {
    "nhai_highway": "NHAI / Highway",
    "industrial_greenbelt": "Industrial / Mine green belt",
    "township_landscape": "Township / Society landscape",
    "ngo_watershed": "NGO / Watershed",
    "general": "General plantation",
}

PROGRAM_DEFAULT_SEGMENT: dict[str, str] = {
    "government_nhai": "nhai_highway",
    "corporate_esg": "industrial_greenbelt",
    "ngo_community": "ngo_watershed",
    "byot": "general",
}

PROGRAM_DEFAULT_COMPLIANCE: dict[str, ComplianceMode] = {
    "government_nhai": "strict",
    "corporate_esg": "strict",
    "ngo_community": "guided",
    "byot": "open",
}
