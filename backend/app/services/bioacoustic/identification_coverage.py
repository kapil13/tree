"""Resolve which identification backends are active per taxon."""

from __future__ import annotations

from app.core.config import settings
from app.services.bioacoustic.perch_runner import perch_available
from app.services.bioacoustic.taxon_groups import ALL_TAXA, TAXON_BIRD, parse_taxa_csv


def identification_coverage() -> dict[str, str]:
    """Report model backend per taxon for dashboards and API transparency."""
    coverage = {
        TAXON_BIRD: "birdnet",
        "amphibian": "pending_model",
        "mammal": "pending_model",
        "reptile": "pending_model",
        "insect": "pending_model",
    }

    if perch_available():
        perch_taxa = parse_taxa_csv(settings.bioacoustic_perch_taxa) or (
            ALL_TAXA - {TAXON_BIRD}
        )
        for taxon in perch_taxa:
            if taxon == TAXON_BIRD:
                coverage[TAXON_BIRD] = "birdnet+perch-v2"
            else:
                coverage[taxon] = "perch-v2"
    elif settings.bioacoustic_enable_perch:
        for taxon in parse_taxa_csv(settings.bioacoustic_perch_taxa):
            if taxon != TAXON_BIRD:
                coverage[taxon] = "perch-v2-unavailable"

    if settings.bioacoustic_enable_frogs and not perch_available():
        coverage["amphibian"] = "frog-heuristic-experimental"
    if settings.bioacoustic_enable_insects and not perch_available():
        coverage["insect"] = "insect-heuristic-experimental"

    return coverage
