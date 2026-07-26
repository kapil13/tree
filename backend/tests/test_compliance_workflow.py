"""Tests for compliance readiness workflow."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.compliance.workflow import (
    SEGMENT_RECOMMENDED_CHECKLIST,
    build_compliance_workflow,
)


def test_segment_recommended_checklists():
    assert SEGMENT_RECOMMENDED_CHECKLIST["nhai_highway"] == "ngt_campa"
    assert SEGMENT_RECOMMENDED_CHECKLIST["industrial_greenbelt"] == "verra_vm0047"
    assert SEGMENT_RECOMMENDED_CHECKLIST["ngo_watershed"] == "gold_standard_luf"


@pytest.mark.asyncio
async def test_build_compliance_workflow_returns_steps(monkeypatch):
    project = SimpleNamespace(
        id=uuid.uuid4(),
        segment="nhai_highway",
        compliance_mode="strict",
        metadata_={"survey_interval_days": 30},
        organization_id=uuid.uuid4(),
    )

    async def fake_auto_signals(db, proj):
        return {
            "active_standard_attached": "yes",
            "has_work_areas": "yes",
            "has_trees": "partial",
            "geo_tagged_majority": "no",
            "satellite_coverage": "no",
            "no_block_violations": "yes",
            "credit_ledger_synced": "no",
            "survival_survey_configured": "yes",
        }

    async def fake_summaries(db, proj):
        return [
            {
                "code": "ngt_campa",
                "title": "NGT",
                "short_label": "NGT",
                "completion_pct": 0,
                "score_pct": 0,
                "eligibility_status": "not_started",
                "updated_at": None,
            }
        ]

    async def fake_metrics(db, proj):
        return {
            "tree_count": 5,
            "geo_tagged_count": 2,
            "satellite_verified_count": 0,
            "open_violations": 0,
            "blocking_violations": 0,
            "work_area_count": 1,
        }

    monkeypatch.setattr(
        "app.services.compliance.workflow.build_auto_signals",
        fake_auto_signals,
    )
    monkeypatch.setattr(
        "app.services.compliance.workflow.list_project_checklist_summaries",
        fake_summaries,
    )
    monkeypatch.setattr(
        "app.services.compliance.workflow._project_metrics",
        fake_metrics,
    )

    result = await build_compliance_workflow(AsyncMock(), project)

    assert result["recommended_checklist"] == "ngt_campa"
    assert len(result["steps"]) == 9
    assert result["progress"]["total"] >= 7
    step_ids = [s["id"] for s in result["steps"]]
    assert "survey_cadence" in step_ids
    assert "review_checklist" in step_ids
    survey = next(s for s in result["steps"] if s["id"] == "survey_cadence")
    assert survey["status"] == "done"


@pytest.mark.asyncio
async def test_build_auto_signals_survival_saved():
    from app.services.compliance.evaluator import build_auto_signals

    project = SimpleNamespace(id=uuid.uuid4(), metadata_={"survey_interval_days": 15})
    db = AsyncMock()

    empty_trees = MagicMock()
    empty_trees.scalars.return_value.all.return_value = []
    empty_violations = MagicMock()
    empty_violations.scalars.return_value.all.return_value = []
    count_zero = MagicMock()
    count_zero.scalar_one.return_value = 0
    ledger_none = MagicMock()
    ledger_none.scalar_one_or_none.return_value = None

    db.execute = AsyncMock(
        side_effect=[empty_trees, empty_violations, count_zero, ledger_none]
    )

    async def fake_standard(db_, proj):
        return None

    monkeypatch = pytest.MonkeyPatch()
    monkeypatch.setattr(
        "app.services.compliance.evaluator.get_active_standard",
        fake_standard,
    )
    signals = await build_auto_signals(db, project)
    monkeypatch.undo()
    assert signals["survival_survey_configured"] == "yes"
