"""Phase A — PMCP/FMCP closure milestones and EC green-belt compliance."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.planting_projects.closure_milestones import (
    _green_belt_area_ha,
    compute_closure_milestones,
    compute_green_belt_compliance,
)


def test_green_belt_area_counts_eligible_blocks():
    fences = [
        SimpleNamespace(
            area_ha=10.0,
            metadata_={"block_type": "green_belt_strip"},
            segment_code=None,
        ),
        SimpleNamespace(
            area_ha=5.0,
            metadata_={"block_type": "overburden_dump"},
            segment_code=None,
        ),
        SimpleNamespace(
            area_ha=8.0,
            metadata_={},
            segment_code="buffer_zone",
        ),
    ]
    assert _green_belt_area_ha(fences, project_block_type=None) == 18.0


@pytest.mark.asyncio
async def test_green_belt_compliance_33_percent():
    project = SimpleNamespace(
        metadata_={
            "scheme_refs": {
                "lease_area_ha": 100,
                "reclamation_block_type": "green_belt_strip",
            }
        }
    )
    fences = [
        SimpleNamespace(
            area_ha=20.0,
            metadata_={"block_type": "green_belt_strip"},
            segment_code="green_belt_strip",
        )
    ]
    result = await compute_green_belt_compliance(
        AsyncMock(),
        project,
        rules={"ec_green_belt_pct_min": 33.0},
        fences=fences,
    )
    assert result["applicable"] is True
    assert result["required_green_belt_ha"] == 33.0
    assert result["mapped_green_belt_ha"] == 20.0
    assert result["status"] == "partial"
    assert result["coverage_pct"] == pytest.approx(60.6, rel=0.1)


@pytest.mark.asyncio
async def test_closure_milestones_for_mining_project(monkeypatch):
    project = SimpleNamespace(
        id=uuid.uuid4(),
        scheme_code="mining_reclamation",
        metadata_={
            "scheme_refs": {
                "mine_lease_number": "ML-TEST-002",
                "ibm_closure_plan_ref": "IBM/PCP/2025/TEST2",
                "closure_plan_year": 2024,
                "closure_phase": "phase_i_dump_stabilization",
                "reclamation_block_type": "overburden_dump",
                "lease_area_ha": 50,
            },
            "survey_interval_days": 30,
        },
    )
    fence = SimpleNamespace(
        area_ha=5.0,
        metadata_={},
        segment_code="overburden_dump",
        last_satellite_at=None,
    )
    tree = SimpleNamespace(
        metadata_={"is_native": True, "survival_status": "alive"},
        last_geotag_at=object(),
        species_id=None,
        species_text="Neem",
        satellite_verified=False,
    )

    async def fake_standard(db, proj):
        return SimpleNamespace(template_code="mining_reclamation_v1", id=uuid.uuid4())

    async def fake_rules(db, standard, project_id=None):
        return {
            "progressive_closure_tracking": True,
            "species_native_pct_min": 80,
            "satellite_scan_cadence_days": 30,
            "ec_green_belt_pct_min": 33.0,
        }

    monkeypatch.setattr(
        "app.services.planting_projects.closure_milestones.get_active_standard",
        fake_standard,
    )
    monkeypatch.setattr(
        "app.services.planting_projects.closure_milestones.get_effective_rules",
        fake_rules,
    )

    db = AsyncMock()
    fences_result = MagicMock()
    fences_result.scalars.return_value.all.return_value = [fence]
    trees_result = MagicMock()
    trees_result.scalars.return_value.all.return_value = [tree]
    block_violation_none = MagicMock()
    block_violation_none.scalars.return_value.first.return_value = None
    ledger_none = MagicMock()
    ledger_none.scalar_one_or_none.return_value = None
    baseline_none = MagicMock()
    baseline_none.scalar_one_or_none.return_value = None

    db.execute = AsyncMock(
        side_effect=[
            fences_result,
            trees_result,
            block_violation_none,
            ledger_none,
            baseline_none,
        ]
    )

    result = await compute_closure_milestones(db, project)
    assert result["applicable"] is True
    assert result["current_phase"] == "phase_i_dump_stabilization"
    assert len(result["phases"]) == 4
    assert any(p["is_current"] for p in result["phases"])
    assert result["green_belt"]["applicable"] is True
    assert any(a["kind"] == "ec_green_belt_shortfall" for a in result["alerts"])


@pytest.mark.asyncio
async def test_mining_auto_signals_include_closure_fields(monkeypatch):
    from app.services.compliance.evaluator import build_auto_signals

    project = SimpleNamespace(
        id=uuid.uuid4(),
        scheme_code="mining_reclamation",
        metadata_={
            "scheme_refs": {
                "mine_lease_number": "ML-TEST-003",
                "ibm_closure_plan_ref": "IBM/PCP/2025/TEST3",
                "closure_phase": "phase_ii_greenbelt",
                "reclamation_block_type": "green_belt_strip",
                "lease_area_ha": 10,
            }
        },
    )

    async def fake_standard(db, proj):
        return SimpleNamespace(
            id=uuid.uuid4(),
            template_code="mining_reclamation_v1",
            rules={"species_native_pct_min": 80},
        )

    async def fake_rules(db, standard, project_id=None):
        return {"species_native_pct_min": 80, "satellite_scan_cadence_days": 30}

    async def fake_mining_signals(db, project, **kwargs):
        return {
            "mine_lease_linked": "yes",
            "closure_plan_on_file": "yes",
            "closure_phase_recorded": "yes",
            "reclamation_block_documented": "yes",
            "ec_green_belt_compliant": "partial",
            "native_stocking_target": "no",
            "satellite_mrv_active": "no",
            "fmcp_documented": "no",
            "no_block_violations": "yes",
        }

    monkeypatch.setattr(
        "app.services.compliance.evaluator.get_active_standard",
        fake_standard,
    )
    monkeypatch.setattr(
        "app.services.planting_projects.rule_engine.get_effective_rules",
        fake_rules,
    )
    monkeypatch.setattr(
        "app.services.planting_projects.closure_milestones.build_mining_compliance_signals",
        fake_mining_signals,
    )

    db = AsyncMock()
    empty_trees = MagicMock()
    empty_trees.scalars.return_value.all.return_value = []
    empty_violations = MagicMock()
    empty_violations.scalars.return_value.all.return_value = []
    count_zero = MagicMock()
    count_zero.scalar_one.return_value = 0
    fences_empty = MagicMock()
    fences_empty.scalars.return_value.all.return_value = []
    ledger_none = MagicMock()
    ledger_none.scalar_one_or_none.return_value = None
    risk_none = MagicMock()
    risk_none.scalar_one_or_none.return_value = None
    serial_empty = MagicMock()
    serial_empty.scalars.return_value.all.return_value = []
    sar_empty = MagicMock()
    sar_empty.scalars.return_value.all.return_value = []
    bio_count = MagicMock()
    bio_count.scalar_one.return_value = 0

    db.execute = AsyncMock(
        side_effect=[
            empty_trees,
            empty_violations,
            count_zero,
            fences_empty,
            ledger_none,
            risk_none,
            sar_empty,
            serial_empty,
            bio_count,
        ]
    )

    monkeypatch.setattr("app.services.carbon.vm0047_ops.list_leakage", AsyncMock(return_value=[]))
    monkeypatch.setattr(
        "app.services.compliance.safeguards.safeguard_doc_types_present",
        AsyncMock(return_value=set()),
    )

    signals = await build_auto_signals(db, project)
    assert signals["mine_lease_linked"] == "yes"
    assert signals["closure_plan_on_file"] == "yes"
    assert signals["closure_phase_recorded"] == "yes"
    assert signals["ec_green_belt_compliant"] == "partial"
