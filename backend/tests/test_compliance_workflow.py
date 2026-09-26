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
    violations = next(s for s in result["steps"] if s["id"] == "resolve_violations")
    assert violations["action_href"].endswith("/compliance?section=issues")
    checklist = next(s for s in result["steps"] if s["id"] == "review_checklist")
    assert checklist["action_href"].endswith("/compliance?section=checklist")
    survey = next(s for s in result["steps"] if s["id"] == "survey_cadence")
    assert survey["status"] == "done"


@pytest.mark.asyncio
async def test_build_monitoring_compliance_workflow(monkeypatch):
    project = SimpleNamespace(
        id=uuid.uuid4(),
        segment="estate_monitoring",
        scheme_code="estate_monitoring",
        compliance_mode="guided",
        metadata_={"scheme_refs": {"estate_name": "Block A"}},
        organization_id=uuid.uuid4(),
    )

    async def fake_auto_signals(db, proj):
        return {
            "estate_metadata_complete": "partial",
            "active_standard_attached": "yes",
            "has_work_areas": "yes",
            "work_area_scan_coverage": "partial",
            "sar_permanence_risk": "no",
            "no_block_violations": "yes",
        }

    async def fake_summaries(db, proj):
        return [
            {
                "code": "estate_monitoring",
                "title": "Estate",
                "short_label": "Estate",
                "completion_pct": 40,
                "score_pct": 40,
                "eligibility_status": "in_progress",
                "updated_at": None,
            }
        ]

    async def fake_metrics(db, proj):
        return {
            "tree_count": 0,
            "geo_tagged_count": 0,
            "satellite_verified_count": 0,
            "open_violations": 0,
            "blocking_violations": 0,
            "work_area_count": 2,
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

    assert result["monitoring_mode"] is True
    assert result["recommended_checklist"] == "estate_monitoring"
    step_ids = [s["id"] for s in result["steps"]]
    assert "register_trees" not in step_ids
    assert "initial_satellite_scan" in step_ids
    assert "estate_details" in step_ids
    scan = next(s for s in result["steps"] if s["id"] == "initial_satellite_scan")
    assert scan["action_href"].startswith("/satellite?project=")
    violations = next(s for s in result["steps"] if s["id"] == "resolve_violations")
    assert violations["action_href"].endswith("/compliance?section=issues")


@pytest.mark.asyncio
async def test_build_mining_compliance_workflow(monkeypatch):
    project = SimpleNamespace(
        id=uuid.uuid4(),
        segment="industrial_greenbelt",
        scheme_code="mining_reclamation",
        compliance_mode="strict",
        metadata_={
            "scheme_refs": {
                "mine_lease_number": "ML-TEST-001",
                "ibm_closure_plan_ref": "IBM/PCP/2025/TEST",
            }
        },
        organization_id=uuid.uuid4(),
    )

    async def fake_auto_signals(db, proj):
        return {
            "mine_lease_linked": "yes",
            "closure_plan_on_file": "yes",
            "has_work_areas": "partial",
            "reclamation_block_documented": "no",
            "ec_green_belt_compliant": "partial",
            "has_trees": "no",
            "native_stocking_target": "no",
            "satellite_mrv_active": "no",
            "no_block_violations": "yes",
        }

    async def fake_summaries(db, proj):
        return [
            {
                "code": "mining_reclamation",
                "title": "Mining",
                "short_label": "Mining",
                "completion_pct": 10,
                "score_pct": 10,
                "eligibility_status": "in_progress",
                "updated_at": None,
            }
        ]

    async def fake_metrics(db, proj):
        return {
            "tree_count": 0,
            "geo_tagged_count": 0,
            "satellite_verified_count": 0,
            "open_violations": 0,
            "blocking_violations": 0,
            "work_area_count": 1,
        }

    async def fake_closure(db, proj):
        return {
            "applicable": True,
            "status": "in_progress",
            "current_phase": "phase_i_dump_stabilization",
            "green_belt": {
                "applicable": True,
                "status": "partial",
                "mapped_green_belt_ha": 5.0,
                "required_green_belt_ha": 16.5,
                "coverage_pct": 30.3,
            },
            "native_species_pct": 0.0,
            "native_species_target_pct": 80.0,
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
    monkeypatch.setattr(
        "app.services.planting_projects.closure_milestones.compute_closure_milestones",
        fake_closure,
    )
    monkeypatch.setattr(
        "app.services.compliance.workflow.is_satellite_watch_enabled",
        lambda project: False,
    )

    result = await build_compliance_workflow(AsyncMock(), project)

    assert result["mining_mode"] is True
    assert result["recommended_checklist"] == "mining_reclamation"
    step_ids = [s["id"] for s in result["steps"]]
    assert "mine_lease_pmcp" in step_ids
    assert "ec_green_belt" in step_ids
    assert "review_checklist" in step_ids
    lease_step = next(s for s in result["steps"] if s["id"] == "mine_lease_pmcp")
    assert lease_step["status"] == "done"


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
    risk_none = MagicMock()
    risk_none.scalar_one_or_none.return_value = None
    safeguard_empty = MagicMock()
    safeguard_empty.scalars.return_value.all.return_value = []

    async def fake_standard(db_, proj):
        return None

    bio_count = MagicMock()
    bio_count.scalar_one.return_value = 0

    monkeypatch = pytest.MonkeyPatch()
    monkeypatch.setattr(
        "app.services.compliance.evaluator.get_active_standard",
        fake_standard,
    )
    async def fake_leakage(db_, pid):
        return []

    monkeypatch.setattr("app.services.carbon.vm0047_ops.list_leakage", fake_leakage)

    serial_empty = MagicMock()
    serial_empty.scalars.return_value.all.return_value = []
    sar_empty = MagicMock()
    sar_empty.scalars.return_value.all.return_value = []
    doc_types_result = MagicMock()
    doc_types_result.scalars.return_value.all.return_value = []

    db.execute = AsyncMock(
        side_effect=[
            empty_trees,
            empty_violations,
            count_zero,
            ledger_none,
            risk_none,
            safeguard_empty,
            serial_empty,
            sar_empty,
            doc_types_result,
            bio_count,
        ]
    )

    signals = await build_auto_signals(db, project)
    monkeypatch.undo()
    assert signals["survival_survey_configured"] == "yes"
