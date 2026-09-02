"""Tests for evidence bundle Ed25519 signing."""

from __future__ import annotations

import json
import uuid
import zipfile
from io import BytesIO
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import app.models.tree_measurement  # noqa: F401 — register TreeMeasurement for Tree mapper

from app.services.evidence.bundle import build_project_evidence_bundle
from app.services.evidence.signing import sign_evidence_zip, verify_evidence_zip, zip_content_hash


def _mock_project():
    project = MagicMock()
    project.id = uuid.uuid4()
    project.code = "NHAI-DEMO"
    project.metadata_ = {}
    return project


@pytest.mark.asyncio
async def test_build_project_evidence_bundle_hashes_zip_bytes():
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
            "summary": {"tree_count": 0},
            "trees": [],
            "gates": {},
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

        zip_bytes, summary, signature = await build_project_evidence_bundle(
            db, project, include_photos=False
        )

    assert summary["signed"] is True
    assert summary["bundle_sha256"] == zip_content_hash(zip_bytes)
    assert signature is not None
    assert verify_evidence_zip(zip_bytes, signature_b64=signature.signature_b64)["valid"] is True

    with zipfile.ZipFile(BytesIO(zip_bytes)) as zf:
        manifest = json.loads(zf.read("manifest.json"))
        assert manifest["bundle_version"] == "aranyix-evidence-1.2.0"


def test_modified_zip_fails_verification():
    zip_bytes = b"PK\x03\x04fake-zip-content"
    signature = sign_evidence_zip(zip_bytes)
    tampered = zip_bytes + b"tamper"
    result = verify_evidence_zip(
        tampered,
        signature_b64=signature.signature_b64,
        public_key_b64=signature.public_key_b64,
        expected_sha256=signature.zip_sha256,
    )
    assert result["valid"] is False
    assert result["reason"] == "zip_sha256_mismatch"
