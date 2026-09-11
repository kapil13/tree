"""Tests for Estate Watch Phase 9 Sprint 8 — re-audit, integrity bridge, cross-org."""

from __future__ import annotations

import inspect
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.api.v1 import audit_engagements as audit_api
from app.services.audit_reaudit.cycle import cycle_summary, start_reaudit_cycle


def test_integrity_bridge_route_exists():
    assert "get_engagement_integrity_bridge" in dir(audit_api)
    params = inspect.signature(audit_api.get_engagement_integrity_bridge).parameters
    assert "engagement_id" in params


def test_reaudit_routes_exist():
    assert "get_engagement_audit_cycles" in dir(audit_api)
    assert "start_engagement_reaudit" in dir(audit_api)
    assert "get_cross_org_audit_summary" in dir(audit_api)


def test_cycle_summary_reads_metadata():
    engagement = SimpleNamespace(
        id=uuid4(),
        status="attested",
        metadata_={
            "cycle_number": 2,
            "audit_cycles": [{"cycle_number": 1, "status": "attested", "archived_at": "2026-01-01"}],
            "reaudit_started_at": "2026-02-01",
        },
    )
    summary = cycle_summary(engagement)
    assert summary["current_cycle"] == 2
    assert len(summary["cycles"]) == 1


@pytest.mark.asyncio
async def test_start_reaudit_cycle_requires_attested():
    engagement = SimpleNamespace(
        id=uuid4(),
        status="export_ready",
        metadata_={},
        status_set=lambda v: None,
    )
    db = SimpleNamespace(execute=None, flush=None)

    with pytest.raises(ValueError, match="engagement_not_attested"):
        await start_reaudit_cycle(db, engagement)


@pytest.mark.asyncio
async def test_cross_org_summary_requires_platform_admin():
    from app.services.audit_portfolio.cross_org_summary import build_cross_org_audit_summary

    user = SimpleNamespace(role="corporate")
    db = SimpleNamespace()

    with pytest.raises(PermissionError, match="platform_admin_required"):
        await build_cross_org_audit_summary(db, user)
