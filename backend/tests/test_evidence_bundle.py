"""Tests for evidence bundle builder."""

from __future__ import annotations

import json
import uuid
import zipfile
from io import BytesIO
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import app.models.tree_measurement  # noqa: F401 — register TreeMeasurement for Tree mapper

from app.services.evidence.bundle import build_project_evidence_bundle


def _mock_project():
    project = MagicMock()
    project.id = uuid.uuid4()
    project.code = "NHAI-DEMO"
    project.metadata_ = {}
    return project


@pytest.mark.asyncio
async def test_build_project_evidence_bundle_contains_manifest():
    db = AsyncMock()
    project = _mock_project()
    mrv_ctx = {
        "project": {"code": "NHAI-DEMO", "name": "Demo"},
        "summary": {"tree_count": 0},
        "trees": [],
        "violations": [],
        "work_areas": [],
        "integrity_fusion": {
            "export_version": "aranyix-integrity-fusion-1.0.0",
            "summary": {"tree_count": 0, "credit_eligible_count": 0},
            "trees": [],
            "gates": {"verified_ready": False, "issued_ready": False},
        },
    }

    with (
        patch(
            "app.services.evidence.bundle.build_project_mrv_context",
            new=AsyncMock(return_value=mrv_ctx),
        ),
        patch(
            "app.services.evidence.bundle.render_compliance_mrv_pdf",
            return_value=b"%PDF-1.4 test",
        ),
        patch("app.services.evidence.bundle.get_storage") as storage_mock,
        patch(
            "app.services.evidence.bundle.compute_scheme_kpis",
            new=AsyncMock(return_value={"kpis": []}),
        ),
    ):
        storage_mock.return_value.is_available.return_value = False
        db.execute = AsyncMock(
            return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=lambda: [])))
        )

        zip_bytes, summary, _signature = await build_project_evidence_bundle(
            db, project, include_photos=False
        )

    assert summary["project_code"] == "NHAI-DEMO"
    assert summary["bundle_sha256"]

    with zipfile.ZipFile(BytesIO(zip_bytes)) as zf:
        names = set(zf.namelist())
        assert "manifest.json" in names
        assert "mrv-context.json" in names
        assert "integrity-fusion.json" in names
        assert "mrv-compliance.pdf" in names
        assert "carbon-summary.json" in names
        manifest = json.loads(zf.read("manifest.json"))
        assert manifest["bundle_version"] == "aranyix-evidence-1.2.0"
        assert manifest["file_count"] >= 4
