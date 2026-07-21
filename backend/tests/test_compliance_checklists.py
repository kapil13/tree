"""Tests for compliance eligibility checklists."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.compliance.checklists import get_checklist, list_checklists
from app.services.compliance.evaluator import (
    build_auto_signals,
    score_checklist,
    save_project_checklist_responses,
)


def test_list_checklists_includes_verra_and_ngt():
    codes = {c["code"] for c in list_checklists()}
    assert "verra_vm0047" in codes
    assert "ngt_campa" in codes
    assert len(codes) >= 5


def test_get_checklist_unknown():
    assert get_checklist("not_real") is None


def test_score_checklist_eligible_when_all_yes():
    checklist = get_checklist("esg_general")
    assert checklist is not None
    responses = {item.id: {"answer": "yes"} for item in checklist.items}
    metrics = score_checklist(checklist, responses, {})
    assert metrics["completion_pct"] == 100.0
    assert metrics["score_pct"] == 100.0
    assert metrics["eligibility_status"] == "eligible"


def test_score_checklist_not_started_without_answers():
    checklist = get_checklist("redd_plus")
    assert checklist is not None
    metrics = score_checklist(checklist, {}, {})
    assert metrics["eligibility_status"] == "not_started"
    assert metrics["completion_pct"] == 0.0


def test_score_checklist_uses_auto_signals():
    checklist = get_checklist("verra_vm0047")
    assert checklist is not None
    auto = {item.auto_key: "yes" for item in checklist.items if item.auto_key}
    metrics = score_checklist(checklist, {}, auto)
    assert metrics["completion_pct"] > 0
    assert metrics["eligibility_status"] in ("in_progress", "eligible", "gaps_identified")


@pytest.mark.asyncio
async def test_save_project_checklist_responses_persists(monkeypatch):
    checklist = get_checklist("esg_general")
    assert checklist is not None
    project = SimpleNamespace(
        id=uuid.uuid4(),
        organization_id=uuid.uuid4(),
        metadata_={},
    )
    stored = None

    async def fake_get_or_create(db, proj, code):
        return stored

    async def fake_build_auto_signals(db, proj):
        return {"geo_tagged_majority": "yes", "has_work_areas": "yes"}

    monkeypatch.setattr(
        "app.services.compliance.evaluator.get_or_create_response",
        fake_get_or_create,
    )
    monkeypatch.setattr(
        "app.services.compliance.evaluator.build_auto_signals",
        fake_build_auto_signals,
    )
    monkeypatch.setattr(
        "app.services.compliance.evaluator.build_project_checklist_state",
        AsyncMock(return_value={"eligibility_status": "eligible"}),
    )

    db = AsyncMock()

    state = await save_project_checklist_responses(
        db,
        project,
        "esg_general",
        {"data_governance": {"answer": "yes", "notes": "RBAC enabled"}},
        actor_user_id=uuid.uuid4(),
    )
    assert state["eligibility_status"] == "eligible"
    assert db.add.called


@pytest.mark.asyncio
async def test_build_auto_signals_no_trees():
    project = SimpleNamespace(id=uuid.uuid4(), metadata_={}, organization_id=None)
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
    assert signals["has_trees"] == "no"
    assert signals["geo_tagged_majority"] == "no"
