"""Tests for Estate Watch Phase 8 portfolio ops."""

from __future__ import annotations

import inspect

from app.api.v1 import audit_engagements as audit_api


def test_portfolio_summary_route_exists():
    assert "get_audit_portfolio_summary" in dir(audit_api)
    params = inspect.signature(audit_api.get_audit_portfolio_summary).parameters
    assert "user" in params
    assert "db" in params


def test_field_plot_queue_route_exists():
    assert "get_audit_field_plot_queue" in dir(audit_api)
    params = inspect.signature(audit_api.get_audit_field_plot_queue).parameters
    assert "project_id" in params
    assert "limit" in params


def test_engagement_statuses_include_attested():
    from app.services.audit_portfolio.portfolio_summary import ENGAGEMENT_STATUSES

    assert "attested" in ENGAGEMENT_STATUSES
    assert "sampling_planned" in ENGAGEMENT_STATUSES
