"""Tests for Sprint 12–13 India Stack + Green Credit Rules."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.credits.green_credit import (
    MONITORING_PERIOD_YEARS,
    compute_green_credit_estimate,
    build_project_green_credit_summary,
)
from app.services.india_stack.aadhaar_ekyc import initiate_ekyc
from app.services.india_stack.digilocker import verify_land_record
from app.services.satellite.bhuvan_wms import list_bhuvan_layers
from app.services.signing.india_esign import document_hash, esign_status, sign_document


def test_compute_green_credit_eligible():
    started = datetime.now(UTC) - timedelta(days=MONITORING_PERIOD_YEARS * 365 + 30)
    result = compute_green_credit_estimate(
        tree_count=500,
        total_area_ha=1.0,
        activity_type="tree_plantation",
        land_bank_id="GCP-LB-12345",
        project_started_at=started,
        survival_pct=90.0,
    )
    assert result["density_eligible"] is True
    assert result["trees_per_ha"] == 500.0
    assert result["land_bank_registered"] is True
    assert result["vesting_fraction"] == 1.0
    assert result["full_green_credits"] > 0
    assert result["eligibility_status"] == "eligible"


def test_compute_green_credit_density_gap():
    result = compute_green_credit_estimate(
        tree_count=50,
        total_area_ha=1.0,
        activity_type="tree_plantation",
        land_bank_id="GCP-LB-12345",
        project_started_at=datetime.now(UTC),
    )
    assert result["density_eligible"] is False
    assert "density_below_minimum" in result["gaps"]
    assert result["eligibility_status"] == "gaps_identified"


@pytest.mark.asyncio
async def test_build_project_green_credit_summary():
    project = MagicMock()
    project.id = uuid.uuid4()
    project.code = "GCP-01"
    project.scheme_code = "green_credit_india"
    project.created_at = datetime.now(UTC) - timedelta(days=365 * 6)
    project.metadata_ = {
        "scheme_refs": {
            "green_credit_land_bank_id": "LB-99",
            "gcp_activity_type": "tree_plantation",
            "verifier_reference": "ICFRE-2026",
        }
    }
    db = AsyncMock()
    trees_result = MagicMock()
    trees_result.scalars.return_value.all.return_value = [MagicMock()] * 450
    area_result = MagicMock()
    area_result.scalar_one.return_value = 1.0
    db.execute = AsyncMock(side_effect=[trees_result, area_result])

    summary = await build_project_green_credit_summary(db, project)
    assert summary["project_code"] == "GCP-01"
    assert summary["land_bank_id"] == "LB-99"
    assert summary["tree_count"] == 450


@pytest.mark.asyncio
async def test_india_esign_stub_sign():
    result = await sign_document("test-attestation-hash", signer_name="Verifier One")
    assert result.stub is True
    assert result.esign_ref.startswith("STUB-ESIGN-")
    assert len(result.signature_b64) > 0


def test_esign_status():
    status = esign_status()
    assert "provider_mode" in status
    assert status["provider_mode"] in {"stub", "asp"}


@pytest.mark.asyncio
async def test_digilocker_stub_verify():
    with patch("app.services.india_stack.digilocker.settings") as mock_settings:
        mock_settings.digilocker_enabled = True
        mock_settings.digilocker_stub_mode = True
        mock_settings.digilocker_client_id = None
        result = await verify_land_record(land_record_number="KA-BLR-1234")
    assert result["verified"] is True
    assert result["stub"] is True


@pytest.mark.asyncio
async def test_aadhaar_ekyc_stub():
    with patch("app.services.india_stack.aadhaar_ekyc.settings") as mock_settings:
        mock_settings.aadhaar_ekyc_enabled = True
        mock_settings.aadhaar_ekyc_provider = "stub"
        result = await initiate_ekyc(aadhaar_last4="1234", full_name="Field Worker", consent=True)
    assert result["verified"] is True
    assert result["ekyc_ref"].startswith("EKYC-STUB-")


def test_bhuvan_wms_layers():
    layers = list_bhuvan_layers()
    assert len(layers) >= 3
    assert all("wms_url_template" in layer for layer in layers)


def test_document_hash_deterministic():
    h1 = document_hash("abc")
    h2 = document_hash("abc")
    assert h1 == h2
    assert len(h1) == 64
