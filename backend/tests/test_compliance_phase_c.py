"""Compliance Phase C — multilateral & DFI."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.compliance.checklists import get_checklist
from app.services.compliance.evaluator import build_auto_signals
from app.services.reports.multilateral_exports import (
    _ses_risk_tier,
    build_esf_ps5_context,
    build_undp_ses_context,
    render_esf_ps5_xlsx,
    render_undp_ses_xlsx,
)
from app.services.schemes.registry import get_scheme


def test_world_bank_esf_checklist_exists():
    checklist = get_checklist("world_bank_esf")
    assert checklist is not None
    auto_keys = {item.auto_key for item in checklist.items if item.auto_key}
    assert "ps6_biodiversity_evidence" in auto_keys
    assert "safeguards_tenure_ref" in auto_keys


def test_undp_ses_checklist_exists():
    checklist = get_checklist("undp_ses")
    assert checklist is not None
    assert any(item.auto_key == "ses_risk_screened" for item in checklist.items)


def test_dfi_green_corridor_scheme():
    scheme = get_scheme("dfi_green_corridor")
    assert scheme is not None
    assert "world_bank_esf" in scheme["checklist_codes"]
    assert "undp_ses" in scheme["checklist_codes"]


def test_ses_risk_tier_low():
    assert _ses_risk_tier(
        open_violations=0,
        safeguard_doc_count=4,
        native_species_pct=80.0,
        biodiversity_sites=2,
    ) == "low"


def test_ses_risk_tier_high_on_violations():
    assert _ses_risk_tier(
        open_violations=1,
        safeguard_doc_count=4,
        native_species_pct=80.0,
        biodiversity_sites=2,
    ) == "high"


@pytest.mark.asyncio
async def test_esf_ps5_context_includes_safeguards(monkeypatch):
    project = SimpleNamespace(
        id=uuid.uuid4(),
        code="DFI-01",
        name="Green corridor",
        scheme_code="dfi_green_corridor",
    )
    db = AsyncMock()

    async def fake_mrv(db_, proj):
        return {"summary": {"open_violations": 0, "work_area_count": 2}}

    async def fake_safeguards(db_, proj):
        return [{"doc_type": "fpic_minutes", "doc_type_label": "FPIC", "title": "Jan 2025"}]

    monkeypatch.setattr(
        "app.services.reports.multilateral_exports.build_project_mrv_context", fake_mrv
    )
    monkeypatch.setattr(
        "app.services.reports.multilateral_exports.list_safeguard_documents", fake_safeguards
    )

    ctx = await build_esf_ps5_context(db, project)
    assert ctx["tenure_evidence"]["document_count"] == 1
    xlsx = render_esf_ps5_xlsx(ctx)
    assert len(xlsx) > 100


@pytest.mark.asyncio
async def test_undp_ses_export_xlsx(monkeypatch):
    project = SimpleNamespace(
        id=uuid.uuid4(),
        code="DFI-02",
        name="NHAI CAMPA",
        scheme_code="dfi_green_corridor",
    )
    db = AsyncMock()

    async def fake_mrv(db_, proj):
        return {"summary": {"open_violations": 0, "native_species_pct": 70, "tree_count": 100}}

    async def fake_safeguards(db_, proj):
        return [
            {"doc_type": "stakeholder_consultation_log", "doc_type_label": "Log", "title": "Q1"},
            {"doc_type": "fpic_minutes", "doc_type_label": "FPIC", "title": "Q1"},
            {"doc_type": "gram_sabha_resolution", "doc_type_label": "GS", "title": "Q1"},
            {"doc_type": "patta_cfr_reference", "doc_type_label": "Tenure", "title": "Ref"},
        ]

    async def fake_sites(db_, pid):
        return [{"site_name": "Site A", "ndvi_mean": 0.5, "recording_count": 1, "species_richness": 3}]

    monkeypatch.setattr(
        "app.services.reports.multilateral_exports.build_project_mrv_context", fake_mrv
    )
    monkeypatch.setattr(
        "app.services.reports.multilateral_exports.list_safeguard_documents", fake_safeguards
    )
    monkeypatch.setattr(
        "app.services.reports.multilateral_exports._site_biodiversity_rows", fake_sites
    )

    ctx = await build_undp_ses_context(db, project)
    assert ctx["screening"]["risk_tier"] == "low"
    xlsx = render_undp_ses_xlsx(ctx)
    assert len(xlsx) > 100


@pytest.mark.asyncio
async def test_ps6_and_ses_auto_signals(monkeypatch):
    project = SimpleNamespace(id=uuid.uuid4(), metadata_={}, scheme_code=None)
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
    serial_empty = MagicMock()
    serial_empty.scalars.return_value.all.return_value = []
    sar_empty = MagicMock()
    sar_empty.scalars.return_value.all.return_value = []
    bio_count = MagicMock()
    bio_count.scalar_one.return_value = 2
    doc_types_result = MagicMock()
    doc_types_result.scalars.return_value.all.return_value = [
        "gram_sabha_resolution",
        "fpic_minutes",
        "patta_cfr_reference",
        "stakeholder_consultation_log",
    ]

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

    async def fake_standard(db_, proj):
        return None

    async def fake_leakage(db_, pid):
        return []

    monkeypatch.setattr(
        "app.services.compliance.evaluator.get_active_standard", fake_standard
    )
    monkeypatch.setattr("app.services.carbon.vm0047_ops.list_leakage", fake_leakage)

    signals = await build_auto_signals(db, project)
    assert signals["ses_risk_screened"] == "yes"
