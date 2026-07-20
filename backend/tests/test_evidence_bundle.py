"""Tests for evidence bundle builder."""

from __future__ import annotations

import json
import uuid
import zipfile
from datetime import UTC, datetime
from io import BytesIO
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.evidence.bundle import build_project_evidence_bundle


def _mock_project():
    project = MagicMock()
    project.id = uuid.uuid4()
    project.code = "NHAI-DEMO"
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
    ):
        storage_mock.return_value.is_available.return_value = False
        db.execute = AsyncMock(
            return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=lambda: [])))
        )

        zip_bytes, summary = await build_project_evidence_bundle(db, project, include_photos=False)

    assert summary["project_code"] == "NHAI-DEMO"
    assert summary["bundle_sha256"]

    with zipfile.ZipFile(BytesIO(zip_bytes)) as zf:
        names = set(zf.namelist())
        assert "manifest.json" in names
        assert "mrv-context.json" in names
        assert "mrv-compliance.pdf" in names
        assert "carbon-summary.json" in names
        manifest = json.loads(zf.read("manifest.json"))
        assert manifest["bundle_version"] == "aranyix-evidence-1.0.0"
        assert manifest["file_count"] >= 4
