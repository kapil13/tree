"""Perch v2 label loading and taxon resolution."""

from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path

from app.core.logging import get_logger
from app.services.bioacoustic.gbif_client import match_species, taxon_group_from_gbif
from app.services.bioacoustic.taxon_groups import TAXON_BIRD, normalize_taxon_group

log = get_logger("bioacoustic.perch.labels")

_NON_SPECIES = re.compile(r"^[A-Z][a-z]+(_[a-z0-9_]+)+$")
_BINOMIAL = re.compile(r"^[A-Z][a-z]+(?: [a-z][a-z-]+)+$")


def load_perch_labels(path: str | Path) -> list[str]:
    labels: list[str] = []
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            label = line.strip()
            if label:
                labels.append(label)
    return labels


def is_probable_species_label(label: str) -> bool:
    if not label or label.startswith("inat"):
        return False
    if "_" in label and _NON_SPECIES.match(label):
        return False
    if label[0].isupper() and " " in label:
        return bool(_BINOMIAL.match(label))
    return False


def scientific_name_from_label(label: str) -> str | None:
    if not is_probable_species_label(label):
        return None
    return label.strip()


@lru_cache(maxsize=4096)
def taxon_group_for_label(label: str) -> str:
    sci = scientific_name_from_label(label)
    if not sci:
        return TAXON_BIRD
    gbif = match_species(sci)
    group = taxon_group_from_gbif(gbif, fallback="")
    if group == "frog":
        return "amphibian"
    if group in {"bird", "amphibian", "mammal", "reptile", "insect", "animal"}:
        return normalize_taxon_group(group, fallback=TAXON_BIRD)
    return TAXON_BIRD
