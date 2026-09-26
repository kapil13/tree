"""Tests for compliance portfolio summary API."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.compliance.portfolio_summary import build_compliance_portfolio_summary


@pytest.mark.asyncio
async def test_build_compliance_portfolio_summary_aggregates(monkeypatch):
    project_a = SimpleNamespace(
        id=uuid.uuid4(),
        code="P-A",
        name="Alpha",
        segment="nhai_highway",
        compliance_mode="strict",
        status="active",
        metadata_={"survey_interval_days": 30},
        organization_id=uuid.uuid4(),
        scheme_code=None,
        created_at=None,
    )
    project_b = SimpleNamespace(
        id=uuid.uuid4(),
        code="P-B",
        name="Beta",
        segment="industrial_greenbelt",
        compliance_mode="strict",
        status="active",
        metadata_={},
        organization_id=uuid.uuid4(),
        scheme_code=None,
        created_at=None,
    )

    def fake_filter(user, stmt):
        return stmt

    async def fake_metrics(db, project):
        if project.id == project_a.id:
            return {
                "tree_count": 10,
                "geo_tagged_count": 8,
                "satellite_verified_count": 5,
                "open_violations": 2,
                "blocking_violations": 1,
                "work_area_count": 1,
            }
        return {
            "tree_count": 0,
            "geo_tagged_count": 0,
            "satellite_verified_count": 0,
            "open_violations": 0,
            "blocking_violations": 0,
            "work_area_count": 0,
        }

    async def fake_workflow(db, project):
        if project.id == project_a.id:
            return {
                "recommended_checklist": "ngt_campa",
                "recommended_checklist_label": "NGT / CAMPA",
                "progress": {"done": 6, "partial": 1, "total": 8, "pct": 75.0},
                "auto_signals": {
                    "safeguards_gram_sabha": "no",
                    "safeguards_fpic": "yes",
                    "safeguards_tenure_ref": "no",
                    "safeguards_stakeholder_log": "yes",
                },
            }
        return {
            "recommended_checklist": "verra_vm0047",
            "recommended_checklist_label": "Verra VM0047",
            "progress": {"done": 2, "partial": 0, "total": 8, "pct": 25.0},
            "auto_signals": {
                "safeguards_gram_sabha": "yes",
                "safeguards_fpic": "yes",
                "safeguards_tenure_ref": "yes",
                "safeguards_stakeholder_log": "yes",
            },
        }

    db = AsyncMock()
    result_mock = MagicMock()
    result_mock.scalars.return_value.all.return_value = [project_a, project_b]
    db.execute = AsyncMock(return_value=result_mock)

    monkeypatch.setattr(
        "app.services.compliance.portfolio_summary.project_list_filter",
        fake_filter,
    )
    monkeypatch.setattr(
        "app.services.compliance.portfolio_summary._project_metrics",
        fake_metrics,
    )
    monkeypatch.setattr(
        "app.services.compliance.portfolio_summary.build_compliance_workflow",
        fake_workflow,
    )

    user = SimpleNamespace(id=uuid.uuid4(), organization_id=uuid.uuid4(), role="org_admin")
    summary = await build_compliance_portfolio_summary(db, user)

    assert summary["project_count"] == 2
    assert summary["open_violations"] == 2
    assert summary["blocking_violations"] == 1
    assert summary["avg_readiness_pct"] == 50.0
    assert summary["projects_with_safeguard_gaps"] == 1
    assert summary["safeguard_gap_count"] == 2
    assert summary["projects_below_80_readiness"] == 2
    assert summary["projects"][0]["code"] == "P-A"
    assert summary["projects"][0]["safeguard_gaps"] == 2
    assert len(summary["report_links"]) >= 4
