"""Compliance Phase B — UNFCCC & carbon integrity."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.compliance.checklists import get_checklist
from app.services.compliance.evaluator import build_auto_signals
from app.services.reports.carbon_integrity_exports import (
    build_leakage_worksheet_context,
    render_leakage_worksheet_xlsx,
)
from app.services.reports.etf_handoff import (
    ETF_COLUMNS,
    build_org_inventory_handoff,
    render_etf_handoff_csv,
)
from app.services.reports.framework_context import _profile_sections
from app.services.reports.frameworks import get_framework_profile


def test_article6_readiness_checklist_exists():
    checklist = get_checklist("article6_readiness")
    assert checklist is not None
    auto_keys = {item.auto_key for item in checklist.items if item.auto_key}
    assert "ca_ref_documented" in auto_keys
    assert "leakage_documented" in auto_keys


def test_redd_plus_profile_sections_include_leakage():
    profile = get_framework_profile("redd_plus")
    assert profile is not None
    base = {
        "summary": {"tree_count": 10, "open_violations": 0},
        "project": {"code": "P1", "segment": "general"},
    }
    carbon = {
        "total_trees": 10,
        "total_carbon_kg": 100.0,
        "total_co2e_kg": 366.67,
        "engine_version": "test",
    }
    integrity = {
        "leakage": {"entry_count": 1, "total_net_leakage_tco2e": 0.5},
        "permanence": {"nprt_score": 40, "buffer_pct": 0.15, "sar_ground_risk_sites": 0},
        "article6": {},
    }
    sections = _profile_sections(profile, base, carbon, [], integrity=integrity)
    redd_section = sections[0]["rows"]
    assert any("Documented" in row[1] for row in redd_section if row[0] == "Leakage assessment")


def test_paris_ndc_sections_include_article6():
    profile = get_framework_profile("paris_ndc")
    assert profile is not None
    base = {
        "summary": {"tree_count": 5, "open_violations": 0},
        "project": {"code": "P2", "segment": "general"},
    }
    carbon = {
        "total_trees": 5,
        "total_carbon_kg": 50.0,
        "total_co2e_kg": 183.33,
        "gross_credits_tco2e": 0.18,
        "engine_version": "test",
    }
    integrity = {
        "leakage": {"total_net_leakage_tco2e": 0.0},
        "permanence": {},
        "article6": {
            "authorization_ref": "MOEFCC-A6-2025-001",
            "article6_serial_count": 2,
            "retired_article6_count": 1,
            "corresponding_adjustment_refs": ["CA-IN-2025-42"],
        },
    }
    sections = _profile_sections(profile, base, carbon, [], integrity=integrity)
    art6 = next(s for s in sections if s["title"].startswith("Article 6"))
    assert any(row[1] == "MOEFCC-A6-2025-001" for row in art6["rows"])


def test_etf_handoff_csv_columns():
    ctx = {
        "rows": [
            {
                "project_code": "P1",
                "project_name": "Demo",
                "activity_class": "ARR",
                "reporting_year": 2026,
                "tree_count": 10,
                "removals_tco2e": 1.0,
                "leakage_tco2e": 0.1,
                "net_removals_tco2e": 0.9,
                "buffer_pct": 0.2,
                "uncertainty_flag": "tier1_default",
                "qa_qc_notes": "test",
                "engine_version": "v1",
                "sar_integrity_score": 85.0,
                "open_violations": 0,
            }
        ]
    }
    data = render_etf_handoff_csv(ctx).decode("utf-8")
    header = data.splitlines()[0]
    for col in ETF_COLUMNS:
        assert col in header


@pytest.mark.asyncio
async def test_build_auto_signals_leakage_and_article6(monkeypatch):
    project = SimpleNamespace(
        id=uuid.uuid4(),
        metadata_={"scheme_refs": {"article6_authorization_ref": "AUTH-1"}},
        scheme_code=None,
    )
    db = AsyncMock()

    tree = SimpleNamespace(
        status="alive",
        last_geotag_at=None,
        satellite_verified=False,
        metadata_={},
    )
    trees_result = MagicMock()
    trees_result.scalars.return_value.all.return_value = [tree]

    violations_result = MagicMock()
    violations_result.scalars.return_value.all.return_value = []

    count_result = MagicMock()
    count_result.scalar_one.return_value = 0

    ledger_result = MagicMock()
    ledger_result.scalar_one_or_none.return_value = None

    serial = SimpleNamespace(
        paris_article6=True,
        corresponding_adjustment_ref="CA-1",
        status="retired",
    )
    serial_result = MagicMock()
    serial_result.scalars.return_value.all.return_value = [serial]

    sar_result = MagicMock()
    sar_result.scalars.return_value.all.return_value = []

    async def execute_side_effect(stmt):
        sql = str(stmt)
        if "trees" in sql.lower():
            return trees_result
        if "planting_compliance_violations" in sql.lower():
            return violations_result
        if "plantation_fences" in sql.lower() and "count" in sql.lower():
            return count_result
        if "project_credit_ledgers" in sql.lower():
            return ledger_result
        if "credit_serials" in sql.lower():
            return serial_result
        if "plantation_satellite_records" in sql.lower():
            return sar_result
        if "project_safeguard_documents" in sql.lower():
            empty = MagicMock()
            empty.scalars.return_value.all.return_value = []
            return empty
        if "bioacoustic_recordings" in sql.lower():
            bio = MagicMock()
            bio.scalar_one.return_value = 0
            return bio
        return MagicMock()

    db.execute = AsyncMock(side_effect=execute_side_effect)

    async def fake_standard(db_, proj):
        return None

    def fake_survey_days(proj):
        return 30

    async def fake_latest_risk(db_, pid):
        return None

    async def fake_leakage(db_, pid):
        return [{"net_leakage_tco2e": 0.2}]

    async def fake_doc_types(db_, pid):
        return set()

    monkeypatch.setattr(
        "app.services.compliance.evaluator.get_active_standard", fake_standard
    )
    monkeypatch.setattr(
        "app.services.compliance.evaluator.survey_interval_days", fake_survey_days
    )
    monkeypatch.setattr(
        "app.services.carbon.risk_ops.latest_risk_assessment", fake_latest_risk
    )
    monkeypatch.setattr(
        "app.services.carbon.vm0047_ops.list_leakage", fake_leakage
    )
    monkeypatch.setattr(
        "app.services.compliance.safeguards.safeguard_doc_types_present", fake_doc_types
    )

    signals = await build_auto_signals(db, project)
    assert signals["leakage_documented"] == "yes"
    assert signals["article6_authorization_ref"] == "yes"
    assert signals["ca_ref_documented"] == "yes"


@pytest.mark.asyncio
async def test_leakage_worksheet_xlsx(monkeypatch):
    project = SimpleNamespace(
        id=uuid.uuid4(),
        code="DEMO",
        name="Demo",
        scheme_code="general",
        segment="general",
    )
    db = AsyncMock()

    async def fake_envelope(db_, proj):
        return {
            "leakage": {"entries": [], "entry_count": 0, "total_net_leakage_tco2e": 0},
            "permanence": {"nprt_score": None, "buffer_pct": None, "sar_ground_risk_sites": 0},
            "article6": {},
        }

    monkeypatch.setattr(
        "app.services.reports.carbon_integrity_exports.build_carbon_integrity_envelope",
        fake_envelope,
    )
    ctx = await build_leakage_worksheet_context(db, project)
    xlsx = render_leakage_worksheet_xlsx(ctx)
    assert len(xlsx) > 100


@pytest.mark.asyncio
async def test_org_inventory_handoff_empty_org(monkeypatch):
    db = AsyncMock()
    projects_result = MagicMock()
    projects_result.scalars.return_value.all.return_value = []
    db.execute = AsyncMock(return_value=projects_result)

    ctx = await build_org_inventory_handoff(db, uuid.uuid4())
    assert ctx["totals"]["project_count"] == 0
    assert ctx["rows"] == []
