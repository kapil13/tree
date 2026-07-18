"""Planting program definitions and form field schemas."""

from __future__ import annotations

from typing import Any, Literal, TypedDict


class FormField(TypedDict, total=False):
    key: str
    label: str
    type: Literal["text", "textarea", "number", "date", "select", "boolean"]
    required: bool
    placeholder: str
    help_text: str
    options: list[dict[str, str]]
    core: bool
    min: float
    max: float


class FormSection(TypedDict):
    id: str
    title: str
    description: str
    fields: list[FormField]


class ProgramDefinition(TypedDict):
    code: str
    name: str
    description: str
    audience: str
    min_photos: int
    is_default: bool
    sections: list[FormSection]


_COMMON_LOCATION_FIELDS: list[FormField] = [
    {
        "key": "latitude",
        "label": "Latitude",
        "type": "number",
        "required": True,
        "core": True,
    },
    {
        "key": "longitude",
        "label": "Longitude",
        "type": "number",
        "required": True,
        "core": True,
    },
    {
        "key": "accuracy_m",
        "label": "GPS accuracy (m)",
        "type": "number",
        "required": False,
        "core": True,
        "min": 0,
    },
    {
        "key": "altitude_m",
        "label": "Altitude (m)",
        "type": "number",
        "required": False,
        "core": True,
    },
]

_BYOT_PROGRAM: ProgramDefinition = {
    "code": "byot",
    "name": "BYOT Public",
    "description": "Quick citizen tagging for Bring Your Own Tree.",
    "audience": "General public",
    "min_photos": 1,
    "is_default": True,
    "sections": [
        {
            "id": "tree",
            "title": "Tree details",
            "description": "Tag a tree you planted or want to track on the map.",
            "fields": [
                {
                    "key": "species_text",
                    "label": "Species",
                    "type": "text",
                    "required": True,
                    "core": True,
                    "placeholder": "Neem, Peepal, Mango…",
                },
                {
                    "key": "planted_at",
                    "label": "Planted on",
                    "type": "date",
                    "required": False,
                    "core": True,
                    "help_text": "Leave blank if the tree already existed.",
                },
                {
                    "key": "tree_nickname",
                    "label": "Nickname (optional)",
                    "type": "text",
                    "required": False,
                    "placeholder": "School neem #3",
                },
                {
                    "key": "planting_story",
                    "label": "Why this tree?",
                    "type": "textarea",
                    "required": False,
                    "placeholder": "Shade, fruit, memory, school project…",
                },
                {
                    "key": "visibility_public",
                    "label": "Show on public map",
                    "type": "boolean",
                    "required": False,
                },
            ],
        },
        {
            "id": "location",
            "title": "Location",
            "description": "Use GPS for an accurate map pin.",
            "fields": _COMMON_LOCATION_FIELDS,
        },
    ],
}

_GOVERNMENT_PROGRAM: ProgramDefinition = {
    "code": "government_nhai",
    "name": "Government & NHAI",
    "description": "Audit-ready planting for highways, forest dept, and municipal schemes.",
    "audience": "Government agencies and contractors",
    "min_photos": 3,
    "is_default": False,
    "sections": [
        {
            "id": "legal",
            "title": "Project & legal context",
            "description": "Link the tree to an approved project or permit.",
            "fields": [
                {
                    "key": "project_code",
                    "label": "Project / scheme code",
                    "type": "text",
                    "required": True,
                },
                {
                    "key": "legal_basis",
                    "label": "Legal basis",
                    "type": "select",
                    "required": True,
                    "options": [
                        {"value": "highway_plantation", "label": "Highway plantation"},
                        {"value": "compensatory_afforestation", "label": "Compensatory afforestation"},
                        {"value": "urban_greening", "label": "Urban greening"},
                        {"value": "forest_restoration", "label": "Forest restoration"},
                        {"value": "other", "label": "Other"},
                    ],
                },
                {
                    "key": "permit_reference",
                    "label": "Permit / approval reference",
                    "type": "text",
                    "required": True,
                },
                {
                    "key": "land_category",
                    "label": "Land category",
                    "type": "select",
                    "required": True,
                    "options": [
                        {"value": "highway_row", "label": "Highway right-of-way"},
                        {"value": "govt_land", "label": "Government land"},
                        {"value": "forest", "label": "Forest / CA land"},
                        {"value": "urban", "label": "Urban / municipal"},
                        {"value": "private", "label": "Private"},
                    ],
                },
                {
                    "key": "site_zone",
                    "label": "Site / block / zone",
                    "type": "text",
                    "required": True,
                },
            ],
        },
        {
            "id": "highway",
            "title": "Highway location",
            "description": "Optional for non-highway projects.",
            "fields": [
                {
                    "key": "chainage_km",
                    "label": "Chainage (km)",
                    "type": "text",
                    "required": False,
                    "placeholder": "142+350",
                },
                {
                    "key": "road_side",
                    "label": "Side",
                    "type": "select",
                    "required": False,
                    "options": [
                        {"value": "lhs", "label": "LHS"},
                        {"value": "rhs", "label": "RHS"},
                        {"value": "median", "label": "Median"},
                        {"value": "service_road", "label": "Service road"},
                    ],
                },
            ],
        },
        {
            "id": "planting",
            "title": "Species & planting standard",
            "fields": [
                {
                    "key": "species_text",
                    "label": "Species",
                    "type": "text",
                    "required": True,
                    "core": True,
                },
                {
                    "key": "planted_at",
                    "label": "Planted on",
                    "type": "date",
                    "required": True,
                    "core": True,
                },
                {
                    "key": "pit_size_cm",
                    "label": "Pit size (cm)",
                    "type": "text",
                    "required": True,
                    "placeholder": "60×60×60",
                },
                {
                    "key": "spacing_m",
                    "label": "Spacing (m)",
                    "type": "number",
                    "required": True,
                    "min": 0,
                },
                {
                    "key": "guard_type",
                    "label": "Protection / guard",
                    "type": "select",
                    "required": True,
                    "options": [
                        {"value": "bamboo", "label": "Bamboo guard"},
                        {"value": "iron", "label": "Iron guard"},
                        {"value": "cement", "label": "Cement guard"},
                        {"value": "fencing", "label": "Fencing"},
                        {"value": "none", "label": "None"},
                    ],
                },
                {
                    "key": "initial_height_m",
                    "label": "Initial height (m)",
                    "type": "number",
                    "required": False,
                    "min": 0,
                },
                {
                    "key": "initial_dbh_cm",
                    "label": "Initial girth (cm)",
                    "type": "number",
                    "required": False,
                    "min": 0,
                },
                {
                    "key": "survival_status",
                    "label": "Status at registration",
                    "type": "select",
                    "required": True,
                    "options": [
                        {"value": "live", "label": "Live"},
                        {"value": "stressed", "label": "Stressed"},
                        {"value": "replaced", "label": "Replacement planting"},
                    ],
                },
            ],
        },
        {
            "id": "compliance",
            "title": "Evidence & responsibility",
            "fields": [
                {
                    "key": "implementing_agency",
                    "label": "Implementing agency",
                    "type": "text",
                    "required": True,
                },
                {
                    "key": "surveyor_name",
                    "label": "Surveyor / planter name",
                    "type": "text",
                    "required": True,
                },
                {
                    "key": "boq_item_ref",
                    "label": "BOQ / schedule item",
                    "type": "text",
                    "required": False,
                },
                {
                    "key": "maintenance_responsible",
                    "label": "Maintenance responsible party",
                    "type": "text",
                    "required": True,
                },
                {
                    "key": "remarks",
                    "label": "Remarks",
                    "type": "textarea",
                    "required": False,
                },
            ],
        },
        {
            "id": "location",
            "title": "GPS location",
            "fields": _COMMON_LOCATION_FIELDS,
        },
    ],
}

_CORPORATE_PROGRAM: ProgramDefinition = {
    "code": "corporate_esg",
    "name": "Industry & Corporate ESG",
    "description": "ESG and sustainability planting with audit baselines.",
    "audience": "CSR, mines, industry, ESG teams",
    "min_photos": 2,
    "is_default": False,
    "sections": [
        {
            "id": "project",
            "title": "ESG project context",
            "fields": [
                {
                    "key": "corporate_project",
                    "label": "Corporate project / site name",
                    "type": "text",
                    "required": True,
                },
                {
                    "key": "esg_program_type",
                    "label": "ESG program type",
                    "type": "select",
                    "required": True,
                    "options": [
                        {"value": "csr", "label": "CSR"},
                        {"value": "net_zero", "label": "Net-zero offset"},
                        {"value": "mine_reclamation", "label": "Mine reclamation"},
                        {"value": "green_belt", "label": "Green belt"},
                        {"value": "voluntary", "label": "Voluntary"},
                    ],
                },
                {
                    "key": "planting_obligation",
                    "label": "Planting obligation source",
                    "type": "select",
                    "required": True,
                    "options": [
                        {"value": "regulator_condition", "label": "Regulator condition"},
                        {"value": "internal_target", "label": "Internal target"},
                        {"value": "voluntary", "label": "Voluntary"},
                    ],
                },
                {
                    "key": "land_ownership_ref",
                    "label": "Land ownership / lease reference",
                    "type": "text",
                    "required": True,
                },
            ],
        },
        {
            "id": "planting",
            "title": "Species & baselines",
            "fields": [
                {
                    "key": "species_text",
                    "label": "Species",
                    "type": "text",
                    "required": True,
                    "core": True,
                },
                {
                    "key": "planted_at",
                    "label": "Planted on",
                    "type": "date",
                    "required": True,
                    "core": True,
                },
                {
                    "key": "species_native",
                    "label": "Native species",
                    "type": "boolean",
                    "required": True,
                },
                {
                    "key": "invasive_risk",
                    "label": "Known invasive risk",
                    "type": "boolean",
                    "required": False,
                },
                {
                    "key": "initial_height_m",
                    "label": "Initial height (m)",
                    "type": "number",
                    "required": True,
                    "min": 0,
                },
                {
                    "key": "initial_dbh_cm",
                    "label": "Initial girth (cm)",
                    "type": "number",
                    "required": False,
                    "min": 0,
                },
                {
                    "key": "planting_density",
                    "label": "Planting density (trees/ha)",
                    "type": "number",
                    "required": False,
                    "min": 0,
                },
                {
                    "key": "carbon_eligible",
                    "label": "Carbon project eligible",
                    "type": "boolean",
                    "required": True,
                },
            ],
        },
        {
            "id": "safeguards",
            "title": "Safeguards & maintenance",
            "fields": [
                {
                    "key": "maintenance_contractor",
                    "label": "Maintenance contractor",
                    "type": "text",
                    "required": True,
                },
                {
                    "key": "maintenance_until",
                    "label": "Maintenance until",
                    "type": "date",
                    "required": True,
                },
                {
                    "key": "safeguard_notes",
                    "label": "Safeguard notes",
                    "type": "textarea",
                    "required": False,
                    "placeholder": "Water body proximity, protected area buffer…",
                },
                {
                    "key": "implementing_agency",
                    "label": "Implementing agency",
                    "type": "text",
                    "required": True,
                },
                {
                    "key": "surveyor_name",
                    "label": "Surveyor name",
                    "type": "text",
                    "required": True,
                },
            ],
        },
        {
            "id": "location",
            "title": "GPS location",
            "fields": _COMMON_LOCATION_FIELDS,
        },
    ],
}

_NGO_PROGRAM: ProgramDefinition = {
    "code": "ngo_community",
    "name": "NGO & Community",
    "description": "Community, farmer, and watershed restoration planting.",
    "audience": "NGOs, SHGs, farmers, watershed programs",
    "min_photos": 2,
    "is_default": False,
    "sections": [
        {
            "id": "community",
            "title": "Community context",
            "fields": [
                {
                    "key": "community_name",
                    "label": "Community / group name",
                    "type": "text",
                    "required": True,
                },
                {
                    "key": "panchayat_village",
                    "label": "Village / panchayat",
                    "type": "text",
                    "required": True,
                },
                {
                    "key": "watershed",
                    "label": "Watershed / block",
                    "type": "text",
                    "required": False,
                },
                {
                    "key": "farmer_household_id",
                    "label": "Farmer / household ID",
                    "type": "text",
                    "required": False,
                },
                {
                    "key": "consent_reference",
                    "label": "Consent / program reference",
                    "type": "text",
                    "required": False,
                },
            ],
        },
        {
            "id": "planting",
            "title": "Species & livelihood",
            "fields": [
                {
                    "key": "species_text",
                    "label": "Species",
                    "type": "text",
                    "required": True,
                    "core": True,
                },
                {
                    "key": "planted_at",
                    "label": "Planted on",
                    "type": "date",
                    "required": True,
                    "core": True,
                },
                {
                    "key": "livelihood_purpose",
                    "label": "Livelihood purpose",
                    "type": "select",
                    "required": True,
                    "options": [
                        {"value": "fruit", "label": "Fruit"},
                        {"value": "fodder", "label": "Fodder"},
                        {"value": "timber", "label": "Timber"},
                        {"value": "ntfp", "label": "NTFP"},
                        {"value": "shade", "label": "Shade"},
                        {"value": "soil_conservation", "label": "Soil conservation"},
                    ],
                },
                {
                    "key": "nursery_source",
                    "label": "Nursery / seedling source",
                    "type": "text",
                    "required": True,
                },
                {
                    "key": "maintenance_by",
                    "label": "Maintained by",
                    "type": "select",
                    "required": True,
                    "options": [
                        {"value": "self", "label": "Self / farmer"},
                        {"value": "shg", "label": "SHG"},
                        {"value": "ngo", "label": "NGO"},
                        {"value": "community", "label": "Community group"},
                    ],
                },
                {
                    "key": "mixed_species_plot",
                    "label": "Part of mixed-species plot",
                    "type": "boolean",
                    "required": False,
                },
                {
                    "key": "remarks",
                    "label": "Remarks",
                    "type": "textarea",
                    "required": False,
                },
            ],
        },
        {
            "id": "location",
            "title": "GPS location",
            "fields": _COMMON_LOCATION_FIELDS,
        },
    ],
}

PROGRAM_CATALOG: dict[str, ProgramDefinition] = {
    p["code"]: p for p in (_BYOT_PROGRAM, _GOVERNMENT_PROGRAM, _CORPORATE_PROGRAM, _NGO_PROGRAM)
}


def program_form_schema(program: ProgramDefinition) -> dict[str, Any]:
    return {
        "code": program["code"],
        "name": program["name"],
        "description": program["description"],
        "audience": program["audience"],
        "min_photos": program["min_photos"],
        "is_default": program["is_default"],
        "sections": program["sections"],
    }


def all_program_codes() -> list[str]:
    return list(PROGRAM_CATALOG.keys())


def default_program_code() -> str:
    return "byot"
