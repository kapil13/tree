"""Tests for Sprint 12–13 Green Credit Rules."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.credits.green_credit import (
    MONITORING_PERIOD_YEARS,
    compute_green_credit_estimate,
    build_project_green_credit_summary,
)


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
