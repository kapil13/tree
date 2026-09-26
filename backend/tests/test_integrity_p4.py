"""P4 integrity polish tests: CSV export and gate failure payloads."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.integrity.export import (
    render_integrity_fusion_csv,
    render_integrity_fusion_export,
)


def test_render_integrity_fusion_csv_includes_tree_rows():
    payload = {
        "export_version": "aranyix-integrity-fusion-1.0.0",
        "project_code": "DEMO-P4",
        "generated_at": "2026-09-03T00:00:00+00:00",
        "summary": {"tree_count": 1, "credit_eligible_count": 0, "audit_ready_count": 0},
        "gates": {"verified_ready": False, "issued_ready": False, "monitoring_ready": True},
        "trees": [
            {
                "public_code": "T-001",
                "verification_status": "satellite_corroborated",
                "fusion_score": 72.0,
                "field_score": 75.0,
                "satellite_score": 70.0,
                "composite_risk": 0.12,
                "credit_eligible": False,
                "gps_photo_match": True,
                "duplicate_photo": False,
                "duplicate_coordinate": False,
                "ai_confidence_low": False,
                "regeotag_mismatch": False,
                "photo_span_days": 12.0,
                "audit_ready_blockers": ["photo_span_too_short"],
            }
        ],
    }

    body = render_integrity_fusion_csv(payload).decode("utf-8")
    assert "public_code" in body
    assert "T-001" in body
    assert "photo_span_too_short" in body


def test_render_integrity_fusion_export_csv_format():
    payload = {"project_code": "DEMO", "trees": []}
    body, media_type, ext = render_integrity_fusion_export(payload, export_format="csv")
    assert media_type == "text/csv"
    assert ext == "csv"
    assert b"DEMO" in body


@pytest.mark.asyncio
async def test_export_integrity_fusion_csv_endpoint():
    from app.api.v1.planting_projects import export_integrity_fusion

    project = MagicMock()
    project.id = uuid.uuid4()
    project.code = "DEMO-P4"
    user = MagicMock()
    request = MagicMock()
    db = AsyncMock()
    payload = {
        "summary": {"tree_count": 0},
        "trees": [],
        "project_code": "DEMO-P4",
    }

    with (
        patch(
            "app.api.v1.planting_projects.load_project",
            new=AsyncMock(return_value=project),
        ),
        patch(
            "app.services.integrity.export.build_integrity_fusion_export",
            new=AsyncMock(return_value=payload),
        ),
        patch(
            "app.api.v1.planting_projects.record_audit",
            new=AsyncMock(),
        ),
    ):
        response = await export_integrity_fusion(
            project.id,
            request,
            user,
            db,
            export_format="csv",
        )

    assert response.media_type == "text/csv"
    assert "integrity-fusion.csv" in response.headers["Content-Disposition"]
