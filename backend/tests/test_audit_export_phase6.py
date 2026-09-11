"""Tests for Estate Watch Phase 6 audit export."""

from __future__ import annotations

import json
import zipfile
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.audit_export.pdf import render_audit_engagement_pdf


def test_render_audit_pdf_minimal():
    pdf = render_audit_engagement_pdf(
        {
            "epistemic_disclaimer": "Test disclaimer",
            "project": {"name": "Demo", "code": "D1"},
            "engagement": {"status": "field_verified"},
            "confidence": {"grade_counts": {"green": 2}},
            "risk": {"queue": {"queue": []}},
            "sampling": {
                "visit_stats": {"visited": 1, "total": 1},
                "plots": [
                    {
                        "plot_code": "A-P01",
                        "boundary_name": "Block A",
                        "latest_visit": {
                            "tree_presence": "present",
                            "verification_outcome": "claim_supported",
                            "trees_observed": 5,
                            "inside_boundary": True,
                            "visited_at": "2026-01-01T10:00:00+00:00",
                        },
                    }
                ],
            },
            "satellite": {"block_count": 1, "t0_baselines_found": 1},
        }
    )
    assert pdf.startswith(b"%PDF")


@pytest.mark.asyncio
async def test_build_bundle_requires_field_verified():
    from app.services.audit_export.bundle import build_audit_engagement_bundle

    engagement = SimpleNamespace(
        id="00000000-0000-0000-0000-000000000001",
        status="risk_assessed",
        metadata_={},
    )
    project = SimpleNamespace(id="00000000-0000-0000-0000-000000000002", code="TEST")
    db = SimpleNamespace()

    with pytest.raises(ValueError, match="field_verification_incomplete"):
        await build_audit_engagement_bundle(db, engagement, project)


@pytest.mark.asyncio
async def test_build_bundle_contains_manifest():
    from app.services.audit_export.bundle import build_audit_engagement_bundle

    engagement = SimpleNamespace(
        id="00000000-0000-0000-0000-000000000001",
        status="field_verified",
        metadata_={},
    )
    project = SimpleNamespace(
        id="00000000-0000-0000-0000-000000000002",
        code="ESTATE-DEMO",
        name="Demo Estate",
        scheme_code="estate_monitoring",
    )
    db = AsyncMock()
    ctx = {
        "export_version": "estate-watch-audit-1.0.0",
        "epistemic_disclaimer": "test",
        "project": {"code": "ESTATE-DEMO"},
        "engagement": {"status": "field_verified"},
        "intake": {"latest_snapshot": {"version": 1, "claim_data": {}}},
        "confidence": {"grade_counts": {"green": 1}},
        "risk": {"queue": {"queue": []}, "anomalies": {"anomalies": []}},
        "sampling": {"visit_stats": {"total": 1, "visited": 1}},
        "satellite": {"block_count": 1, "t0_baselines_found": 1},
    }

    sig = MagicMock()
    sig.key_id = "abc123"
    sig.zip_sha256 = "deadbeef"
    sig.signature_b64 = "sig"
    sig.to_dict = MagicMock(return_value={"key_id": "abc123", "zip_sha256": "deadbeef"})

    with (
        patch(
            "app.services.audit_export.bundle.build_audit_engagement_context",
            new=AsyncMock(return_value=ctx),
        ),
        patch(
            "app.services.audit_export.bundle.build_field_verification_pack",
            new=AsyncMock(return_value={}),
        ),
        patch(
            "app.services.audit_export.bundle.sign_evidence_zip",
            return_value=sig,
        ),
    ):
        zip_bytes, summary, signature = await build_audit_engagement_bundle(
            db, engagement, project, sign=True
        )

    assert summary["project_code"] == "ESTATE-DEMO"
    assert summary["bundle_sha256"]
    assert engagement.status == "export_ready"
    assert signature is not None

    with zipfile.ZipFile(BytesIO(zip_bytes)) as zf:
        names = set(zf.namelist())
        assert "manifest.json" in names
        assert "audit-context.json" in names
        assert "audit-report.pdf" in names
        assert "signature.json" in names
        manifest = json.loads(zf.read("manifest.json"))
        assert manifest["bundle_version"] == "estate-watch-audit-1.0.0"
        signature = json.loads(zf.read("signature.json"))
        assert signature["key_id"] == "abc123"
