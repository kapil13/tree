"""Curated IUCN Red List metadata for common South Asian wildlife (stub + offline lookup)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class IucnSpecies:
    scientific_name: str
    common_name: str
    taxon_group: str
    iucn_status: str
    population_trend: str
    threat_status: str
    iucn_taxon_id: str
    iucn_url: str


# Representative species for bioacoustic stub / offline validation.
IUCN_CATALOG: dict[str, IucnSpecies] = {
    "corvus_splendens": IucnSpecies(
        scientific_name="Corvus splendens",
        common_name="House Crow",
        taxon_group="bird",
        iucn_status="Least Concern",
        population_trend="Increasing",
        threat_status="low",
        iucn_taxon_id="22705883",
        iucn_url="https://www.iucnredlist.org/species/22705883",
    ),
    "pycnonotus_cafer": IucnSpecies(
        scientific_name="Pycnonotus cafer",
        common_name="Red-vented Bulbul",
        taxon_group="bird",
        iucn_status="Least Concern",
        population_trend="Stable",
        threat_status="low",
        iucn_taxon_id="22712663",
        iucn_url="https://www.iucnredlist.org/species/22712663",
    ),
    "dendrocitta_vagabunda": IucnSpecies(
        scientific_name="Dendrocitta vagabunda",
        common_name="Rufous Treepie",
        taxon_group="bird",
        iucn_status="Least Concern",
        population_trend="Stable",
        threat_status="low",
        iucn_taxon_id="22705783",
        iucn_url="https://www.iucnredlist.org/species/22705783",
    ),
    "eudynamys_scolopaceus": IucnSpecies(
        scientific_name="Eudynamys scolopaceus",
        common_name="Asian Koel",
        taxon_group="bird",
        iucn_status="Least Concern",
        population_trend="Stable",
        threat_status="low",
        iucn_taxon_id="22684063",
        iucn_url="https://www.iucnredlist.org/species/22684063",
    ),
    "chloris_chloris": IucnSpecies(
        scientific_name="Chloris chloris",
        common_name="European Greenfinch",
        taxon_group="bird",
        iucn_status="Least Concern",
        population_trend="Stable",
        threat_status="low",
        iucn_taxon_id="22720330",
        iucn_url="https://www.iucnredlist.org/species/22720330",
    ),
    "fejervarya_limnocharis": IucnSpecies(
        scientific_name="Fejervarya limnocharis",
        common_name="Cricket Frog",
        taxon_group="frog",
        iucn_status="Least Concern",
        population_trend="Stable",
        threat_status="low",
        iucn_taxon_id="58250",
        iucn_url="https://www.iucnredlist.org/species/58250",
    ),
    "hoplobatrachus_tigerinus": IucnSpecies(
        scientific_name="Hoplobatrachus tigerinus",
        common_name="Indian Bullfrog",
        taxon_group="frog",
        iucn_status="Least Concern",
        population_trend="Decreasing",
        threat_status="moderate",
        iucn_taxon_id="58241",
        iucn_url="https://www.iucnredlist.org/species/58241",
    ),
    "gryllus_bimaculatus": IucnSpecies(
        scientific_name="Gryllus bimaculatus",
        common_name="Two-spotted Cricket",
        taxon_group="insect",
        iucn_status="Not Evaluated",
        population_trend="Unknown",
        threat_status="unknown",
        iucn_taxon_id="",
        iucn_url="https://www.iucnredlist.org",
    ),
    "pachycondyla_senarensis": IucnSpecies(
        scientific_name="Diacamma rugosum",
        common_name="Spiny Ant",
        taxon_group="insect",
        iucn_status="Not Evaluated",
        population_trend="Unknown",
        threat_status="unknown",
        iucn_taxon_id="",
        iucn_url="https://www.iucnredlist.org",
    ),
    "funambulus_pennantii": IucnSpecies(
        scientific_name="Funambulus pennantii",
        common_name="Indian Palm Squirrel",
        taxon_group="mammal",
        iucn_status="Least Concern",
        population_trend="Stable",
        threat_status="low",
        iucn_taxon_id="41703",
        iucn_url="https://www.iucnredlist.org/species/41703",
    ),
    "lutrogale_perspicillata": IucnSpecies(
        scientific_name="Lutrogale perspicillata",
        common_name="Smooth-coated Otter",
        taxon_group="mammal",
        iucn_status="Vulnerable",
        population_trend="Decreasing",
        threat_status="high",
        iucn_taxon_id="12427",
        iucn_url="https://www.iucnredlist.org/species/12427",
    ),
    "anthus_campestris": IucnSpecies(
        scientific_name="Anthus campestris",
        common_name="Tawny Pipit",
        taxon_group="bird",
        iucn_status="Least Concern",
        population_trend="Stable",
        threat_status="low",
        iucn_taxon_id="22718525",
        iucn_url="https://www.iucnredlist.org/species/22718525",
    ),
}


def lookup_iucn(scientific_name: str) -> IucnSpecies | None:
    key = scientific_name.lower().replace(" ", "_")
    for sp in IUCN_CATALOG.values():
        if sp.scientific_name.lower().replace(" ", "_") == key:
            return sp
    return None


def enrich_detection(scientific_name: str, common_name: str, taxon_group: str) -> dict:
    """Attach IUCN + GBIF fields to an AI detection (backward-compatible wrapper)."""
    from app.services.bioacoustic.enrichment import enrich_detection as _enrich

    return _enrich(scientific_name, common_name, taxon_group)
