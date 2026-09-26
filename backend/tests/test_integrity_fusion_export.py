"""Tests for integrity fusion MRV/evidence export."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.integrity.export import build_integrity_fusion_export


@pytest.mark.asyncio
async def test_build_integrity_fusion_export_structure():
    project = SimpleNamespace(id=uuid.uuid4(), code="DEMO-01")
    tree = SimpleNamespace(
        public_code="T-001",
        verification_status="field_verified",
    )
    risk = SimpleNamespace(
        fusion_score=78.0,
        field_score=80.0,
        satellite_score=72.0,
        composite_risk=0.1,
        credit_eligible=True,
        gps_photo_match=True,
        duplicate_photo=False,
        duplicate_coordinate=False,
        ai_confidence_low=False,
        regeotag_mismatch=False,
        fusion_details={"audit_ready_blockers": ["insufficient_photos"], "photo_span_days": None},
    )
    db = AsyncMock()
    db.execute = AsyncMock(
        side_effect=[
            MagicMock(all=MagicMock(return_value=[(tree, risk)])),
            MagicMock(scalar_one_or_none=MagicMock(return_value=None)),
        ]
    )
    with patch(
        "app.services.integrity.export.integrity_gate_detail",
        new=AsyncMock(
            return_value={
                "tree_count": 1,
                "credit_eligible_count": 1,
                "audit_ready_count": 0,
                "eligible_pct": 100.0,
                "audit_ready_pct": 0.0,
                "avg_fusion_score": 78.0,
                "verified_ready": True,
                "issued_ready": False,
                "monitoring_ready": True,
                "monitoring_gate": {"passed": True, "message": "ok"},
                "verified_requirements": {"min_eligible_pct": 80.0, "min_avg_fusion": 65.0},
                "issued_requirements": {"min_audit_ready_pct": 90.0, "min_avg_fusion": 75.0},
                "blocking_trees": [],
                "message": "1/1 eligible",
            }
        ),
    ):
        payload = await build_integrity_fusion_export(db, project)

    assert payload["project_code"] == "DEMO-01"
    assert payload["gates"]["verified_ready"] is True
    assert payload["gates"]["monitoring_ready"] is True
    assert payload["trees"][0]["fusion_score"] == 78.0
    assert payload["trees"][0]["audit_ready_blockers"] == ["insufficient_photos"]
    assert payload["trees"][0]["credit_eligible"] is True
