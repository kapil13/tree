"""State- and district-level native species hints for planting recommendations.

Operational defaults aligned with common state forest department species lists and
FSI working-plan schedules. Not exhaustive — used only for non-binding suggestions.
"""

from __future__ import annotations

# Common name lists per state (LGD-aligned 2-digit state codes).
STATE_NATIVE_SPECIES: dict[str, list[str]] = {
    "01": ["Deodar", "Chir Pine", "Kail", "Walnut", "Willow", "Poplar"],
    "02": ["Deodar", "Chir Pine", "Oak", "Kail", "Rhododendron", "Poplar"],
    "03": ["Shisham", "Kikar", "Neem", "Eucalyptus", "Poplar", "Jamun"],
    "04": ["Neem", "Peepal", "Banyan", "Jamun", "Kachnar", "Amaltas"],
    "05": ["Sal", "Teak", "Sheesham", "Chir Pine", "Oak", "Rhododendron"],
    "06": ["Neem", "Shisham", "Khejri", "Peepal", "Jamun", "Babool"],
    "07": ["Neem", "Peepal", "Jamun", "Arjun", "Amaltas", "Kachnar"],
    "08": ["Khejri", "Rohida", "Ber", "Babool", "Neem", "Karanj", "Mahua"],
    "09": ["Sheesham", "Neem", "Peepal", "Banyan", "Jamun", "Arjun", "Mahua"],
    "10": ["Sal", "Sheesham", "Neem", "Peepal", "Jamun", "Mahua", "Palash"],
    "11": ["Oak", "Rhododendron", "Chir Pine", "Alder", "Magnolia", "Bamboo"],
    "12": ["Oak", "Pine", "Rhododendron", "Alder", "Bamboo", "Teak"],
    "13": ["Pine", "Oak", "Alder", "Bamboo", "Teak", "Mahogany"],
    "14": ["Teak", "Pine", "Oak", "Bamboo", "Gurjan", "Champa"],
    "15": ["Teak", "Pine", "Bamboo", "Oak", "Gurjan", "Champa"],
    "16": ["Teak", "Gurjan", "Bamboo", "Sal", "Mahogany", "Champa"],
    "17": ["Pine", "Oak", "Teak", "Bamboo", "Champa", "Magnolia"],
    "18": ["Sal", "Teak", "Bamboo", "Hollong", "Gamari", "Neem", "Mahogany"],
    "19": ["Sal", "Teak", "Mahogany", "Bamboo", "Neem", "Jamun", "Mahua"],
    "20": ["Sal", "Teak", "Mahua", "Palash", "Neem", "Jamun", "Bamboo"],
    "21": ["Teak", "Sal", "Bamboo", "Neem", "Jamun", "Mahua", "Karanj"],
    "22": ["Teak", "Sal", "Bamboo", "Mahua", "Neem", "Jamun", "Palash"],
    "23": ["Teak", "Sal", "Bamboo", "Mahua", "Neem", "Jamun", "Tendu"],
    "24": ["Babool", "Neem", "Khejri", "Mahua", "Jamun", "Teak", "Karanj"],
    "27": ["Neem", "Peepal", "Jamun", "Arjun", "Gulmohar", "Teak", "Bamboo"],
    "29": ["Teak", "Neem", "Jamun", "Bamboo", "Mahua", "Sandan", "Honne"],
    "30": ["Teak", "Coconut", "Cashew", "Neem", "Jamun", "Bamboo", "Mahogany"],
    "31": ["Coconut", "Bamboo", "Neem", "Peepal", "Teak", "Mahogany"],
    "32": ["Teak", "Mahogany", "Jackfruit", "Neem", "Bamboo", "Rosewood", "Mango"],
    "33": ["Neem", "Pungam", "Tamarind", "Mango", "Teak", "Bamboo", "Jamun"],
    "34": ["Neem", "Pungam", "Tamarind", "Teak", "Bamboo", "Mahogany"],
    "35": ["Mahogany", "Teak", "Bamboo", "Padauk", "Gurjan", "Neem"],
    "36": ["Neem", "Pungam", "Tamarind", "Teak", "Bamboo", "Jamun", "Mahua"],
    "37": ["Neem", "Pungam", "Tamarind", "Teak", "Bamboo", "Jamun", "Mahua"],
    "38": ["Willow", "Poplar", "Apricot", "Apple", "Chir Pine", "Sea buckthorn"],
    "39": ["Neem", "Teak", "Bamboo", "Mahua", "Jamun", "Karanj"],
}

# Optional district-level refinements ("{state_code}:{district_code}" from LGD).
DISTRICT_NATIVE_SPECIES: dict[str, list[str]] = {
    "08:104": ["Khejri", "Rohida", "Ber", "Jamun"],  # Alwar
    "08:119": ["Khejri", "Rohida", "Ber"],  # Ajmer
}

# Segment-specific species when templates lack native_species_examples.
SEGMENT_SPECIES: dict[str, list[str]] = {
    "nhai_highway": [
        "Neem",
        "Peepal",
        "Gulmohar",
        "Jamun",
        "Arjun",
        "Banyan",
        "Kachnar",
        "Amaltas",
        "Pongamia",
    ],
    "township_landscape": ["Neem", "Peepal", "Gulmohar", "Jamun", "Arjun", "Amaltas"],
    "ngo_watershed": ["Neem", "Jamun", "Bamboo", "Mahua", "Palash", "Karanj", "Arjun"],
    "general": ["Neem", "Peepal", "Jamun", "Bamboo", "Mahua"],
}


def normalize_state_code(code: str | None) -> str | None:
    if not code or not str(code).strip():
        return None
    return str(code).strip().zfill(2)


def state_species(state_code: str | None) -> list[str]:
    key = normalize_state_code(state_code)
    if not key:
        return []
    return list(STATE_NATIVE_SPECIES.get(key, STATE_NATIVE_SPECIES.get("27", [])))


def district_species(state_code: str | None, district_code: str | None) -> list[str]:
    if not district_code or not str(district_code).strip():
        return []
    norm_state = normalize_state_code(state_code)
    key = f"{norm_state}:{str(district_code).strip()}" if norm_state else str(district_code).strip()
    return list(DISTRICT_NATIVE_SPECIES.get(key, []))
