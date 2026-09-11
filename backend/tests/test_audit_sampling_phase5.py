"""Tests for Estate Watch Phase 5 field sampling."""

from __future__ import annotations

import pytest

from app.services.audit_sampling.stratify import plots_for_risk_level, stratified_plot_counts


def test_plots_for_risk_level_defaults():
    assert plots_for_risk_level("critical") == 3
    assert plots_for_risk_level("high") == 2
    assert plots_for_risk_level("medium") == 1
    assert plots_for_risk_level("low") == 0


def test_stratified_plot_counts_skips_low_risk():
    queue = [
        {"boundary_version_id": "a", "risk_level": "critical", "priority_rank": 1},
        {"boundary_version_id": "b", "risk_level": "low", "priority_rank": 2},
        {"boundary_version_id": "c", "risk_level": "high", "priority_rank": 3},
    ]
    result = stratified_plot_counts(queue)
    assert len(result) == 2
    assert result[0]["plot_count"] == 3
    assert result[1]["plot_count"] == 2


def test_stratified_custom_rates():
    queue = [{"boundary_version_id": "a", "risk_level": "medium", "priority_rank": 1}]
    result = stratified_plot_counts(queue, plots_per_medium=2)
    assert result[0]["plot_count"] == 2


@pytest.mark.asyncio
async def test_generate_requires_risk_assessed():
    from types import SimpleNamespace

    from app.services.audit_sampling.plan import generate_sampling_plan

    engagement = SimpleNamespace(
        id="00000000-0000-0000-0000-000000000001",
        status="confidence_mapped",
        metadata_={},
    )
    db = SimpleNamespace()

    with pytest.raises(ValueError, match="risk_not_assessed"):
        await generate_sampling_plan(db, engagement)


@pytest.mark.asyncio
async def test_record_visit_requires_sampling_planned():
    from types import SimpleNamespace
    from uuid import uuid4

    from app.services.audit_sampling.visits import record_field_visit

    engagement = SimpleNamespace(
        id="00000000-0000-0000-0000-000000000001",
        status="risk_assessed",
        metadata_={},
    )
    db = SimpleNamespace()

    with pytest.raises(ValueError, match="sampling_not_planned"):
        await record_field_visit(
            db,
            engagement=engagement,
            plot_id=uuid4(),
            visitor_id=uuid4(),
        )
