"""Methodology text, limitations, and export eligibility for biodiversity evidence."""

from __future__ import annotations

from typing import Any

from app.services.bioacoustic.confidence import METHODOLOGY_VERSION
from app.services.bioacoustic.detection_tiers import (
    TIER_ACCEPTED,
    TIER_REVIEW_REQUIRED,
    exportable_detections,
)
from app.services.bioacoustic.review import (
    DECISION_CONFIRMED,
    apply_reviews_to_detections,
    reviews_index,
)

_STUB_PIPELINES = frozenset({"stub-bioacoustic-v1", "stub"})
_THREATENED = frozenset({"Critically Endangered", "Endangered", "Vulnerable"})

SCIENTIFIC_LIMITATIONS = [
    "Acoustic detections indicate vocal activity, not confirmed presence of individual animals.",
    "Short ambient recordings (60–180 s) are sampling snapshots, not ecological censuses.",
    "Default pipeline identifies birds; other taxa require explicit multi-taxa configuration.",
    "Smartphone audio levels are approximate and not calibrated sound-level measurements.",
    "Regional GBIF occurrence matches indicate plausibility, not field-verified nativity.",
    "NDVI co-occurrence screening does not prove ecological causation.",
    "Aranyix supports biodiversity monitoring evidence; it is not a certified ecological assessment.",
]

METHODOLOGY_SECTIONS = [
    (
        "Detection tiers",
        "Accepted (≥70% confidence with corroboration), Probable (40–69% or weak corroboration), "
        "Review required (<40%, threatened taxa, or conservation-relevant).",
    ),
    (
        "Diversity metrics",
        "Shannon and Simpson indices use accepted species presence (equal weight per species), "
        "not vocalization counts as individual abundance.",
    ),
    (
        "Biodiversity Confidence",
        "0–100 evidence-confidence score based on detection quality, sampling adequacy, "
        "GPS reliability, taxonomic corroboration, and review clearance. "
        "This is not an ecological health index.",
    ),
    (
        "Exports",
        "Compliance exports include accepted-tier detections only. "
        "Stub pipeline results and unreviewed threatened taxa are excluded.",
    ),
]


def methodology_appendix_lines() -> list[str]:
    lines = [f"Methodology version: {METHODOLOGY_VERSION}", ""]
    for title, body in METHODOLOGY_SECTIONS:
        lines.append(f"{title}: {body}")
    lines.append("")
    lines.append("Scientific limitations:")
    for item in SCIENTIFIC_LIMITATIONS:
        lines.append(f"• {item}")
    return lines


def recording_pipeline(recording: Any) -> str:
    preprocessing = getattr(recording, "preprocessing", None) or {}
    if isinstance(preprocessing, dict):
        pipeline = preprocessing.get("analysis_pipeline")
        if pipeline:
            return str(pipeline)
    raw = getattr(recording, "raw_output", None) or {}
    if isinstance(raw, dict) and raw.get("pipeline"):
        return str(raw["pipeline"])
    return ""


def recording_has_stub_pipeline(recording: Any) -> bool:
    pipeline = recording_pipeline(recording).lower()
    return any(stub in pipeline for stub in _STUB_PIPELINES)


def recording_export_blockers(recording: Any, *, reviews: list[Any] | None = None) -> list[str]:
    blockers: list[str] = []
    if recording_has_stub_pipeline(recording):
        blockers.append("stub_pipeline")
    if getattr(recording, "gps_fallback", False):
        blockers.append("gps_fallback_unverified")

    raw_detections = getattr(recording, "species_detections", None) or []
    review_rows = reviews if reviews is not None else list(getattr(recording, "detection_reviews", None) or [])
    run_id = getattr(recording, "latest_analysis_run_id", None)
    detections = (
        apply_reviews_to_detections(raw_detections, review_rows, analysis_run_id=run_id)
        if review_rows
        else raw_detections
    )

    idx = reviews_index(review_rows) if review_rows else {}
    threatened_review = []
    for d in detections:
        if d.get("iucn_status") not in _THREATENED:
            continue
        name = d.get("scientific_name", "")
        key = (name, str(run_id) if run_id else None)
        review = idx.get(key)
        if review and review.decision == DECISION_CONFIRMED:
            continue
        if d.get("detection_tier") != TIER_ACCEPTED:
            threatened_review.append(name)

    if threatened_review:
        blockers.append("threatened_taxa_require_review")

    review_pending = [d for d in detections if d.get("detection_tier") == TIER_REVIEW_REQUIRED]
    exportable = exportable_detections(detections)
    if review_pending and not exportable:
        blockers.append("no_accepted_detections")
    return blockers


def fence_export_blockers(recordings: list[Any]) -> list[str]:
    blockers: list[str] = []
    for rec in recordings:
        blockers.extend(recording_export_blockers(rec))
    return sorted(set(blockers))


def assert_recordings_exportable(recordings: list[Any]) -> None:
    blockers = fence_export_blockers(recordings)
    if blockers:
        raise ValueError(f"biodiversity_export_blocked:{','.join(blockers)}")
