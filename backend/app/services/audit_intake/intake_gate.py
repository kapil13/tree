"""Intake gate — minimum requirements before Phase 2 satellite analysis."""

from __future__ import annotations

from typing import Any

from app.models.audit_engagement import AuditEngagement


def evaluate_intake_gate(
    engagement: AuditEngagement,
    *,
    boundary_count: int,
    document_count: int,
    has_frozen_snapshot: bool,
    gis_status: str | None,
    plausibility_assessed: int,
) -> dict[str, Any]:
    requirements: list[dict[str, Any]] = [
        {
            "id": "frozen_claim",
            "label": "Frozen claim snapshot (CLAIM)",
            "met": has_frozen_snapshot,
            "detail": None if has_frozen_snapshot else "Freeze the claim register before completing intake",
        },
        {
            "id": "boundaries",
            "label": "At least one block boundary",
            "met": boundary_count >= 1,
            "detail": None if boundary_count >= 1 else "Import KML or draw block polygons",
        },
        {
            "id": "supporting_docs",
            "label": "At least one supporting document",
            "met": document_count >= 1,
            "detail": None if document_count >= 1 else "Upload work order, certificate, or report",
        },
        {
            "id": "gis_validation",
            "label": "GIS validation run (no critical failures)",
            "met": gis_status in {"pass", "warn"},
            "detail": None
            if gis_status in {"pass", "warn"}
            else "Run GIS validation and fix invalid geometries",
        },
        {
            "id": "plausibility",
            "label": "Plausibility assessed for all blocks",
            "met": boundary_count > 0 and plausibility_assessed >= boundary_count,
            "detail": None
            if boundary_count > 0 and plausibility_assessed >= boundary_count
            else "Run plausibility review on each block",
        },
    ]

    ready = all(r["met"] for r in requirements)
    return {"ready": ready, "requirements": requirements}
