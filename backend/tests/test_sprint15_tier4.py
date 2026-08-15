"""Tests for Sprint 15 — plot monitoring, launch gate helpers, verification."""

from __future__ import annotations

import inspect
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.audit.log import record_audit
from app.services.dashboard.kpi_uncertainty import portfolio_co2e_uncertainty
from app.services.plot_monitoring.extrapolation import (
    _stem_biomass_kg,
    compute_plot_monitoring_summary,
)
from app.services.verification.samples import create_verification_sample


def test_record_audit_does_not_accept_metadata_kwarg():
    params = inspect.signature(record_audit).parameters
    assert "metadata" not in params
    assert "diff" in params


def test_plot_monitoring_api_uses_record_audit_diff():
    from app.api.v1 import plot_monitoring as pm_module

    source = inspect.getsource(pm_module)
    assert "metadata=" not in source
    assert "diff=" in source


def test_portfolio_co2e_uncertainty():
    result = portfolio_co2e_uncertainty(1000.0, 10)
    assert result["co2e_kg_lower_90"] < 1000.0
    assert result["co2e_kg_upper_90"] > 1000.0
    assert result["uncertainty_pct"] >= 12.0


def test_stem_biomass_increases_with_dbh():
    small = _stem_biomass_kg(10.0, 3.0)
    large = _stem_biomass_kg(30.0, 8.0)
    assert large > small > 0


@pytest.mark.asyncio
async def test_verification_stratified_sample():
    trees = [
        MagicMock(id=uuid.uuid4(), species_text="Neem", status="active"),
        MagicMock(id=uuid.uuid4(), species_text="Neem", status="active"),
        MagicMock(id=uuid.uuid4(), species_text="Mango", status="active"),
        MagicMock(id=uuid.uuid4(), species_text="Mango", status="active"),
    ]
    db = AsyncMock()
    db.add = MagicMock()
    db.flush = AsyncMock()

    trees_result = MagicMock()
    trees_result.scalars.return_value.all.return_value = trees
    db.execute = AsyncMock(return_value=trees_result)

    sample = await create_verification_sample(
        db,
        project_id=uuid.uuid4(),
        organization_id=uuid.uuid4(),
        sample_pct=50.0,
        method="stratified",
        created_by=uuid.uuid4(),
    )
    assert sample.method == "stratified"
    assert sample.sample_pct == 50.0
    assert db.add.call_count >= 2


@pytest.mark.asyncio
async def test_plot_monitoring_summary_no_design():
    db = AsyncMock()
    empty = MagicMock()
    empty.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=empty)

    project_id = uuid.uuid4()
    summary = await compute_plot_monitoring_summary(db, project_id)
    assert summary["has_design"] is False
    assert summary["mode"] == "full_census"
    assert summary["project_id"] == str(project_id)
