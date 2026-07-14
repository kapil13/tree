"""Stub bioacoustic species identification from ambient audio."""

from __future__ import annotations

import hashlib
import random

from app.services.ai.bioacoustic_types import BioacousticAnalysisResult, SpeciesDetection
from app.services.bioacoustic.iucn_catalog import IUCN_CATALOG


def identify_species_from_audio(
    audio_bytes: bytes,
    *,
    duration_seconds: float,
    latitude: float | None = None,
    longitude: float | None = None,
) -> BioacousticAnalysisResult:
    """
    Deterministic stub AI classifier.
    Production: BirdNET / custom CNN on mel-spectrograms.
    """
    seed = int(hashlib.sha256(audio_bytes[: min(len(audio_bytes), 8192)]).hexdigest()[:8], 16)
    rng = random.Random(seed)

    catalog = list(IUCN_CATALOG.values())
    # Pick 3–7 species weighted by taxon diversity.
    n = rng.randint(3, min(7, len(catalog)))
    chosen = rng.sample(catalog, n)

    detections: list[SpeciesDetection] = []
    remaining_calls = max(8, int(duration_seconds * 0.4))
    for sp in chosen:
        calls = rng.randint(1, max(2, remaining_calls // n))
        remaining_calls -= calls
        detections.append(
            SpeciesDetection(
                scientific_name=sp.scientific_name,
                common_name=sp.common_name,
                taxon_group=sp.taxon_group,
                confidence=round(rng.uniform(0.62, 0.96), 3),
                call_count=calls,
            )
        )

    groups = {d.taxon_group for d in detections}
    loc = ""
    if latitude is not None and longitude is not None:
        loc = f" near ({latitude:.4f}, {longitude:.4f})"

    summary = (
        f"Detected {len(detections)} species across {len(groups)} taxa"
        f" ({', '.join(sorted(groups))}){loc}. "
        f"Recording duration {duration_seconds:.0f}s."
    )

    return BioacousticAnalysisResult(
        detections=detections,
        summary=summary,
        pipeline="stub-bioacoustic-v1",
    )
