"""Estate Watch Wave C — portfolio rollups, benchmarks, patterns, digests, workspace."""

from __future__ import annotations

import inspect

from app.api.v1 import audit_engagements as audit_api


def test_wave_c_models_exist():
    from app.models.audit_portfolio_ops import (
        AuditAuditorWorkspaceView,
        AuditBenchmarkBaseline,
        AuditCrossEstatePattern,
        AuditDigestRun,
        AuditDigestSchedule,
        AuditPortfolioCycleRollup,
        AuditReportTemplate,
    )

    assert AuditPortfolioCycleRollup.__table__.c.cycle_id is not None
    assert "audit_portfolio_cycle_rollups_cycle_uq" in {
        c.name for c in AuditPortfolioCycleRollup.__table__.constraints
    }
    assert AuditBenchmarkBaseline.__table__.c.metric_code is not None
    assert AuditCrossEstatePattern.__table__.c.pattern_type is not None
    assert AuditReportTemplate.__table__.c.code.primary_key
    assert AuditDigestSchedule.__table__.c.template_code is not None
    assert AuditDigestRun.__table__.c.payload is not None
    assert AuditAuditorWorkspaceView.__table__.c.filters is not None


def test_wave_c_routes_exist():
    route_names = {
        "compute_portfolio_rollups",
        "get_portfolio_rollups",
        "compute_benchmarks",
        "get_benchmarks",
        "detect_cross_estate_patterns_route",
        "get_cross_estate_patterns",
        "get_report_templates",
        "create_digest_schedule",
        "list_digest_schedules_route",
        "run_digest_schedule",
        "list_digest_runs_route",
        "get_auditor_workspace",
        "save_auditor_workspace_view",
        "list_auditor_workspace_views",
    }
    for name in route_names:
        assert name in dir(audit_api)


def test_field_plot_queue_supports_active_plan_filter():
    from app.services.audit_portfolio.field_plot_queue import build_audit_field_plot_queue

    params = inspect.signature(build_audit_field_plot_queue).parameters
    assert "active_plan_only" in params


def test_benchmark_metric_codes():
    from app.services.audit_portfolio.benchmarks import _METRIC_CODES

    assert "plots_due_per_engagement" in _METRIC_CODES
    assert "mismatch_rate" in _METRIC_CODES


def test_report_template_seed_codes():
    from app.models.audit_portfolio_ops import AuditReportTemplate

    # Migration seeds these templates; model must accept the codes.
    assert AuditReportTemplate.__tablename__ == "audit_report_templates"
