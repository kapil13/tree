"""Agro-climatic zones for species recommendations (India)."""

from __future__ import annotations

from typing import Literal, TypedDict

ClimateZone = Literal["arid", "semi_arid", "moist", "coastal", "himalayan"]

ZONE_LABELS: dict[ClimateZone, str] = {
    "arid": "Arid",
    "semi_arid": "Semi-arid",
    "moist": "Moist / sub-humid",
    "coastal": "Coastal / humid",
    "himalayan": "Himalayan / temperate",
}

ZONE_DESCRIPTIONS: dict[ClimateZone, str] = {
    "arid": "Low rainfall (<400 mm), high evaporation — hardy drought-tolerant natives.",
    "semi_arid": "Moderate rainfall with dry seasons — mixed dryland and riparian species.",
    "moist": "Deciduous and mixed forests — Sal, Teak, and broadleaf natives.",
    "coastal": "Humid coasts and islands — salt-tolerant and tropical species.",
    "himalayan": "Mountains and valleys — temperate conifers and broadleaf species.",
}

# Default zone when only state is known (LGD state codes).
STATE_DEFAULT_ZONE: dict[str, ClimateZone] = {
    "01": "himalayan",  # Jammu & Kashmir
    "02": "himalayan",  # Himachal Pradesh
    "03": "semi_arid",  # Punjab
    "04": "semi_arid",  # Chandigarh
    "05": "himalayan",  # Uttarakhand
    "06": "semi_arid",  # Haryana
    "07": "semi_arid",  # Delhi
    "08": "arid",  # Rajasthan (district overrides common)
    "09": "moist",  # Uttar Pradesh
    "10": "moist",  # Bihar
    "11": "himalayan",  # Sikkim
    "12": "moist",  # Arunachal Pradesh
    "13": "moist",  # Nagaland
    "14": "moist",  # Manipur
    "15": "moist",  # Mizoram
    "16": "moist",  # Tripura
    "17": "moist",  # Meghalaya
    "18": "moist",  # Assam
    "19": "moist",  # West Bengal
    "20": "moist",  # Jharkhand
    "21": "moist",  # Odisha
    "22": "moist",  # Chhattisgarh
    "23": "moist",  # Madhya Pradesh
    "24": "semi_arid",  # Gujarat
    "27": "semi_arid",  # Maharashtra
    "29": "semi_arid",  # Karnataka
    "30": "coastal",  # Goa
    "31": "coastal",  # Lakshadweep
    "32": "coastal",  # Kerala
    "33": "semi_arid",  # Tamil Nadu
    "34": "coastal",  # Puducherry
    "35": "coastal",  # Andaman & Nicobar
    "36": "semi_arid",  # Telangana
    "37": "semi_arid",  # Andhra Pradesh
    "38": "himalayan",  # Ladakh
    "39": "coastal",  # DNH & Daman & Diu
}

# District overrides: "{state_code}:{district_code}" from LGD tables.
DISTRICT_ZONE_OVERRIDES: dict[str, ClimateZone] = {
    # Rajasthan — western desert districts
    "08:102": "arid",  # Bikaner
    "08:105": "arid",  # Barmer
    "08:108": "arid",  # Churu
    "08:114": "arid",  # Jaisalmer
    "08:116": "arid",  # Jodhpur
    "08:122": "arid",  # Nagaur
    "08:129": "arid",  # Phalodi
    "08:835": "arid",  # Balotra
    "08:836": "arid",  # Anoopgarh
    # Rajasthan — semi-arid eastern/southern
    "08:104": "semi_arid",  # Alwar
    "08:119": "semi_arid",  # Ajmer
    "08:110": "semi_arid",  # Jaipur
    "08:118": "semi_arid",  # Kota
    "08:109": "semi_arid",  # Bharatpur
    "08:121": "semi_arid",  # Udaipur
    # Gujarat — Kutch & arid belt
    "24:468": "arid",  # Kutch
    "24:474": "arid",  # Banaskantha
    "24:480": "arid",  # Surendranagar
    # Gujarat — coast
    "24:470": "coastal",  # Bhavnagar
    "24:473": "coastal",  # Surat
    "24:476": "coastal",  # Valsad
    # Maharashtra — Konkan coast
    "27:517": "coastal",  # Mumbai
    "27:520": "coastal",  # Raigad
    "27:525": "coastal",  # Ratnagiri
    "27:526": "coastal",  # Sindhudurg
    "27:519": "coastal",  # Thane
    # Kerala / Goa — all coastal
    "32:554": "coastal",
    "30:551": "coastal",
    # West Bengal — Sundarbans coast
    "19:303": "coastal",  # South 24 Parganas
    "19:304": "coastal",  # North 24 Parganas
    # Andhra / TN coast
    "37:553": "coastal",  # Visakhapatnam area districts vary — sample
    "33:610": "coastal",  # Chennai
    "33:617": "coastal",  # Thanjavur
}

ZONE_NATIVE_SPECIES: dict[ClimateZone, list[str]] = {
    "arid": [
        "Khejri",
        "Rohida",
        "Ber",
        "Babool",
        "Neem",
        "Karanj",
        "Mahua",
        "Palash",
    ],
    "semi_arid": [
        "Neem",
        "Khejri",
        "Ber",
        "Babool",
        "Jamun",
        "Arjun",
        "Karanj",
        "Peepal",
        "Sheesham",
        "Mahua",
        "Palash",
    ],
    "moist": [
        "Sal",
        "Teak",
        "Bamboo",
        "Mahua",
        "Tendu",
        "Palash",
        "Jamun",
        "Arjun",
        "Neem",
        "Banyan",
        "Sheesham",
    ],
    "coastal": [
        "Coconut",
        "Cashew",
        "Pungam",
        "Neem",
        "Jamun",
        "Teak",
        "Bamboo",
        "Mahogany",
        "Mango",
        "Tamarind",
    ],
    "himalayan": [
        "Deodar",
        "Chir Pine",
        "Oak",
        "Rhododendron",
        "Willow",
        "Poplar",
        "Kail",
        "Walnut",
        "Alder",
    ],
}

# Species that should not be suggested in a given zone (out of natural range).
ZONE_EXCLUDED_SPECIES: dict[ClimateZone, set[str]] = {
    "arid": {"Sal", "Hollong", "Mahogany", "Coconut", "Cashew", "Gulmohar", "Teak"},
    "semi_arid": {"Sal", "Hollong", "Mahogany", "Coconut", "Deodar", "Chir Pine"},
    "moist": {"Coconut", "Cashew", "Deodar", "Chir Pine", "Khejri"},
    "coastal": {"Khejri", "Rohida", "Deodar", "Chir Pine", "Sal", "Walnut"},
    "himalayan": {"Coconut", "Cashew", "Khejri", "Gulmohar", "Mahogany", "Teak"},
}

# Scheme-native examples keyed by scheme then zone.
SCHEME_ZONE_EXAMPLES: dict[str, dict[ClimateZone, list[str]]] = {
    "campa_ca": {
        "arid": ["Khejri", "Rohida", "Ber", "Babool", "Neem", "Karanj", "Palash"],
        "semi_arid": ["Neem", "Ber", "Khejri", "Jamun", "Arjun", "Karanj", "Babool", "Mahua"],
        "moist": ["Teak", "Sal", "Bamboo", "Mahua", "Palash", "Jamun", "Arjun", "Tendu"],
        "coastal": ["Teak", "Bamboo", "Pungam", "Neem", "Casuarina", "Jamun", "Mahogany"],
        "himalayan": ["Deodar", "Chir Pine", "Oak", "Willow", "Poplar", "Walnut", "Rhododendron"],
    },
    "nhai_highway": {
        "arid": ["Neem", "Khejri", "Babool", "Karanj", "Ber"],
        "semi_arid": ["Neem", "Peepal", "Jamun", "Arjun", "Karanj", "Amaltas"],
        "moist": ["Neem", "Peepal", "Jamun", "Arjun", "Gulmohar", "Amaltas"],
        "coastal": ["Neem", "Pungam", "Jamun", "Casuarina", "Bamboo"],
        "himalayan": ["Willow", "Poplar", "Chir Pine", "Deodar", "Oak"],
    },
    "nagar_van": {
        "arid": ["Neem", "Khejri", "Ber", "Babool", "Jamun"],
        "semi_arid": ["Neem", "Peepal", "Jamun", "Arjun", "Gulmohar", "Amaltas"],
        "moist": ["Neem", "Peepal", "Jamun", "Arjun", "Banyan", "Gulmohar"],
        "coastal": ["Neem", "Pungam", "Jamun", "Mango", "Bamboo"],
        "himalayan": ["Oak", "Rhododendron", "Willow", "Poplar", "Deodar"],
    },
    "sahakar_van": {
        "arid": ["Khejri", "Rohida", "Ber", "Babool", "Neem"],
        "semi_arid": ["Khejri", "Neem", "Ber", "Babool", "Jamun", "Arjun"],
        "moist": ["Neem", "Mahua", "Jamun", "Bamboo", "Palash"],
        "coastal": ["Neem", "Coconut", "Cashew", "Jamun", "Bamboo"],
        "himalayan": ["Oak", "Willow", "Poplar", "Walnut"],
    },
}

SEGMENT_ZONE_SPECIES: dict[str, dict[ClimateZone, list[str]]] = {
    "nhai_highway": SCHEME_ZONE_EXAMPLES["nhai_highway"],
    "nagar_van_urban": SCHEME_ZONE_EXAMPLES["nagar_van"],
    "sahakar_van_coop": SCHEME_ZONE_EXAMPLES["sahakar_van"],
    "general": {
        "arid": ["Khejri", "Neem", "Ber", "Babool"],
        "semi_arid": ["Neem", "Jamun", "Khejri", "Peepal"],
        "moist": ["Neem", "Sal", "Teak", "Bamboo"],
        "coastal": ["Neem", "Coconut", "Pungam", "Jamun"],
        "himalayan": ["Deodar", "Oak", "Willow", "Poplar"],
    },
}


class ClimateZoneInfo(TypedDict):
    code: ClimateZone
    label: str
    description: str


def normalize_state_code(code: str | None) -> str | None:
    if not code or not str(code).strip():
        return None
    return str(code).strip().zfill(2)


def resolve_climate_zone(
    *,
    state_code: str | None,
    district_code: str | None = None,
) -> ClimateZoneInfo | None:
    norm_state = normalize_state_code(state_code)
    if not norm_state:
        return None

    zone: ClimateZone | None = None
    if district_code and str(district_code).strip():
        key = f"{norm_state}:{str(district_code).strip()}"
        zone = DISTRICT_ZONE_OVERRIDES.get(key)

    if zone is None:
        zone = STATE_DEFAULT_ZONE.get(norm_state)

    if zone is None:
        return None

    return {
        "code": zone,
        "label": ZONE_LABELS[zone],
        "description": ZONE_DESCRIPTIONS[zone],
    }


def zone_species(zone: ClimateZone) -> list[str]:
    return list(ZONE_NATIVE_SPECIES.get(zone, []))


def scheme_examples_for_zone(scheme_code: str | None, zone: ClimateZone) -> list[str]:
    if scheme_code and scheme_code in SCHEME_ZONE_EXAMPLES:
        return list(SCHEME_ZONE_EXAMPLES[scheme_code].get(zone, []))
    return list(ZONE_NATIVE_SPECIES.get(zone, []))


def segment_species_for_zone(segment: str, zone: ClimateZone) -> list[str]:
    by_segment = SEGMENT_ZONE_SPECIES.get(segment) or SEGMENT_ZONE_SPECIES.get("general", {})
    return list(by_segment.get(zone, []))


def is_excluded_in_zone(species_name: str, zone: ClimateZone) -> bool:
    key = species_name.strip().lower()
    excluded = ZONE_EXCLUDED_SPECIES.get(zone, set())
    return any(key == ex.lower() for ex in excluded)
