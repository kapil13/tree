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
async def test_sampling_plan_summary_reads_geography_plot_centers():
    from sqlalchemy import select

    from app.core.database import AsyncSessionLocal
    from app.models.audit_sampling import AuditFieldPlot
    from app.services.audit_sampling.summary import sampling_plan_summary

    async with AsyncSessionLocal() as db:
        plot = (await db.execute(select(AuditFieldPlot).limit(1))).scalar_one_or_none()
        if plot is None:
            pytest.skip("no audit field plots in database")

        summary = await sampling_plan_summary(db, plot.engagement_id)

    assert summary["has_plan"] is True
    assert summary["plots"]
    assert summary["plots"][0]["center"]["coordinates"][0] != 0.0


@pytest.mark.asyncio
async def test_generate_sampling_plan_places_plots_in_geography_boundary():
    from datetime import UTC, datetime

    from sqlalchemy import delete, select

    from app.core.database import AsyncSessionLocal
    from app.models.audit_engagement import AuditEngagement, BoundaryVersion
    from app.models.audit_risk import AuditRiskAssessment
    from app.models.audit_sampling import AuditSamplingPlan
    from app.services.audit_sampling.plan import generate_sampling_plan

    async with AsyncSessionLocal() as db:
        engagement = (
            await db.execute(
                select(AuditEngagement).where(AuditEngagement.status == "intake_complete").limit(1)
            )
        ).scalar_one_or_none()
        if engagement is None:
            pytest.skip("no intake_complete engagement in database")

        engagement.status = "risk_assessed"
        boundary = (
            await db.execute(
                select(BoundaryVersion)
                .where(BoundaryVersion.engagement_id == engagement.id)
                .limit(1)
            )
        ).scalar_one_or_none()
        if boundary is None:
            pytest.skip("engagement has no boundaries")

        await db.execute(
            delete(AuditRiskAssessment).where(
                AuditRiskAssessment.engagement_id == engagement.id
            )
        )
        await db.execute(
            delete(AuditSamplingPlan).where(AuditSamplingPlan.engagement_id == engagement.id)
        )
        db.add(
            AuditRiskAssessment(
                engagement_id=engagement.id,
                boundary_version_id=boundary.id,
                risk_score=80,
                risk_level="high",
                priority_rank=1,
                anomaly_count=1,
                recommended_action="Verify on ground",
                epistemic_label="ESTIMATION",
                assessed_at=datetime.now(UTC),
            )
        )
        await db.flush()

        plan = await generate_sampling_plan(db, engagement)
        await db.rollback()

        assert plan.total_plots > 0
        assert engagement.status == "sampling_planned"


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
