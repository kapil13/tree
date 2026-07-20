"""Tests for framework-mapped reports."""

from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.reports.framework_context import build_framework_report_context
from app.services.reports.framework_exporter import render_framework_report_pdf
from app.services.reports.frameworks import get_framework_profile, list_framework_profiles


def test_list_framework_profiles():
    profiles = list_framework_profiles()
    codes = {p["code"] for p in profiles}
    assert "verra_vm0047" in codes
    assert "ngt_campa" in codes
    assert len(profiles) >= 7


def test_get_framework_profile_unknown():
    assert get_framework_profile("not_a_real_profile") is None


def test_build_framework_report_context_verra(monkeypatch):
    project = SimpleNamespace(
        code="NHAI-01",
        name="Test Highway",
        segment="nhai_highway",
        compliance_mode="strict",
        status="active",
        target_tree_count=100,
        id="00000000-0000-0000-0000-000000000001",
    )

    db = AsyncMock()
    db.execute = AsyncMock(
        return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=lambda: [])))
    )

    mrv_ctx = {
        "project": {
            "code": "NHAI-01",
            "name": "Test Highway",
            "segment": "nhai_highway",
            "compliance_mode": "strict",
        },
        "summary": {
            "tree_count": 0,
            "work_area_count": 0,
            "open_violations": 0,
            "resolved_violations": 0,
            "native_species_pct": None,
            "survival_counts": {},
        },
        "work_areas": [],
        "trees": [],
        "violations": [],
        "rules_summary": {},
        "segment_report": {},
    }

    monkeypatch.setattr(
        "app.services.reports.framework_context.build_project_mrv_context",
        AsyncMock(return_value=mrv_ctx),
    )

    ctx = asyncio.run(build_framework_report_context(db, project, "verra_vm0047"))

    assert ctx["framework"]["code"] == "verra_vm0047"
    assert ctx["carbon_summary"]["buffer_pct"] == 0.20
    assert ctx["carbon_summary"]["methodology"] == "VERRA_VM0047"
    assert len(ctx["sections"]) >= 2


def test_render_framework_report_pdf():
    ctx = {
        "framework": {
            "code": "ipcc_ar6",
            "title": "IPCC AR6",
            "short_label": "IPCC AR6",
            "reference": "IPCC AR6",
            "disclaimer": "Test disclaimer",
        },
        "project": {"name": "Demo", "code": "DEMO-01"},
        "carbon_summary": {
            "methodology": "IPCC_AR6",
            "engine_version": "byot-carbon-1.0.0",
            "total_co2e_kg": 100.0,
            "gross_credits_tco2e": 0.1,
            "buffer_pct": 0,
            "buffer_withheld_tco2e": 0,
            "net_credits_tco2e": 0.1,
        },
        "summary": {"tree_count": 1, "work_area_count": 1, "open_violations": 0},
        "sections": [{"title": "Test section", "rows": [["A", "1"]]}],
        "trees": [],
    }
    pdf = render_framework_report_pdf(ctx)
    assert pdf.startswith(b"%PDF")


@pytest.mark.asyncio
async def test_unknown_profile_raises():
    project = SimpleNamespace(id="x", code="X", name="X")
    db = AsyncMock()
    with pytest.raises(ValueError, match="unknown_framework_profile"):
        await build_framework_report_context(db, project, "invalid_profile")
