"""Detection → Evidence → Indicator → Interpretation chain for audit UI."""

from __future__ import annotations

from typing import Any

from app.models.bioacoustic_recording import BioacousticRecording
from app.services.bioacoustic.confidence import METHODOLOGY_VERSION, biodiversity_confidence_score
from app.services.bioacoustic.detection_tiers import TIER_ACCEPTED, tier_counts
from app.services.bioacoustic.methodology import SCIENTIFIC_LIMITATIONS, recording_export_blockers
from app.services.bioacoustic.review import apply_reviews_to_detections


def build_interpretation_chain(recording: BioacousticRecording) -> dict[str, Any]:
    reviews = list(recording.detection_reviews or [])
    detections = apply_reviews_to_detections(
        list(recording.species_detections or []),
        reviews,
        analysis_run_id=recording.latest_analysis_run_id,
    )
    tiers = tier_counts(detections)
    accepted = [d for d in detections if d.get("detection_tier") == TIER_ACCEPTED]

    confidence = (
        float(recording.biodiversity_confidence_score)
        if recording.biodiversity_confidence_score is not None
        else biodiversity_confidence_score(
            detections,
            duration_seconds=float(recording.duration_seconds),
            gps_verified=bool(recording.gps_verified),
            gps_fallback=bool(recording.gps_fallback),
        )
    )

    blockers = recording_export_blockers(recording, reviews=reviews)
    export_ready = len(blockers) == 0

    detection_step = {
        "stage": "detection",
        "title": "Acoustic detections",
        "summary": f"{len(detections)} vocalization signals classified across taxa.",
        "items": [
            {
                "scientific_name": d.get("scientific_name"),
                "common_name": d.get("common_name"),
                "detection_tier": d.get("detection_tier"),
                "confidence": d.get("confidence"),
                "call_count": d.get("call_count"),
            }
            for d in detections[:20]
        ],
        "tier_counts": tiers,
    }

    evidence_step = {
        "stage": "evidence",
        "title": "Evidence quality",
        "summary": (
            f"GPS {'verified' if recording.gps_verified else 'fallback' if recording.gps_fallback else 'captured'}; "
            f"{recording.duration_seconds}s sampling window."
        ),
        "gps_verified": bool(recording.gps_verified),
        "gps_fallback": bool(recording.gps_fallback),
        "gps_accuracy_m": float(recording.gps_accuracy_m) if recording.gps_accuracy_m else None,
        "duration_seconds": float(recording.duration_seconds),
        "human_reviews": len(reviews),
        "export_blockers": blockers,
        "export_ready": export_ready,
    }

    indicator_step = {
        "stage": "indicator",
        "title": "Biodiversity indicators",
        "summary": (
            f"{len(accepted)} accepted species; Shannon {recording.shannon_diversity_index or '—'}; "
            f"Biodiversity Confidence {confidence:.0f}/100."
        ),
        "accepted_species_count": len(accepted),
        "shannon_diversity_index": float(recording.shannon_diversity_index)
        if recording.shannon_diversity_index is not None
        else None,
        "simpson_diversity_index": float(recording.simpson_diversity_index)
        if recording.simpson_diversity_index is not None
        else None,
        "biodiversity_confidence_score": round(confidence, 2),
    }

    interpretation_parts = []
    if len(accepted) == 0:
        interpretation_parts.append("No accepted-tier species — treat as inconclusive acoustic evidence.")
    elif len(accepted) >= 5:
        interpretation_parts.append("Multiple accepted species suggest diverse vocal activity in the sample window.")
    else:
        interpretation_parts.append("Limited accepted species — useful snapshot but not a census.")

    if recording.gps_fallback:
        interpretation_parts.append("GPS fallback coordinates reduce spatial defensibility.")
    if blockers:
        interpretation_parts.append(f"Export gated: {', '.join(blockers)}.")
    else:
        interpretation_parts.append("Recording meets export eligibility for accepted-tier evidence.")

    interpretation_step = {
        "stage": "interpretation",
        "title": "Audit interpretation",
        "summary": " ".join(interpretation_parts),
        "limitations": list(SCIENTIFIC_LIMITATIONS),
        "methodology_version": METHODOLOGY_VERSION,
    }

    return {
        "recording_id": str(recording.id),
        "status": recording.status,
        "chain": [detection_step, evidence_step, indicator_step, interpretation_step],
    }
