"""Canonical taxon group names and normalization."""

from __future__ import annotations

# API / dashboard keys
TAXON_BIRD = "bird"
TAXON_AMPHIBIAN = "amphibian"
TAXON_MAMMAL = "mammal"
TAXON_REPTILE = "reptile"
TAXON_INSECT = "insect"

ALL_TAXA = {TAXON_BIRD, TAXON_AMPHIBIAN, TAXON_MAMMAL, TAXON_REPTILE, TAXON_INSECT}

# Legacy runners and catalog entries use "frog" for amphibians.
_LEGACY_ALIASES = {
    "frog": TAXON_AMPHIBIAN,
    "amphibia": TAXON_AMPHIBIAN,
    "aves": TAXON_BIRD,
    "mammalia": TAXON_MAMMAL,
    "reptilia": TAXON_REPTILE,
    "insecta": TAXON_INSECT,
}


def normalize_taxon_group(value: str | None, *, fallback: str = TAXON_BIRD) -> str:
    if not value:
        return fallback
    key = value.strip().lower()
    if key in ALL_TAXA:
        return key
    return _LEGACY_ALIASES.get(key, fallback)


def detection_taxon_group(value: str | None, *, fallback: str = TAXON_BIRD) -> str:
    """Map canonical groups to detection payload values (keeps amphibian as frog)."""
    canonical = normalize_taxon_group(value, fallback=fallback)
    if canonical == TAXON_AMPHIBIAN:
        return "frog"
    return canonical


def parse_taxa_csv(value: str | None) -> set[str]:
    if not value:
        return set()
    out: set[str] = set()
    for part in value.split(","):
        normalized = normalize_taxon_group(part.strip(), fallback="")
        if normalized in ALL_TAXA:
            out.add(normalized)
    return out
