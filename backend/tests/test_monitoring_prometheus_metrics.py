"""Prometheus metrics for monitoring read paths and sweeps."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from prometheus_client import REGISTRY, generate_latest

from app.core.config import settings
from app.main import app

from app.services.monitoring.prometheus_metrics import (
    observe_celery_job,
    observe_data_freshness_stale,
    observe_read_cache,
    observe_sweep_page_result,
    observe_threat_watch_cache,
    observe_threat_watch_sites,
)


def _metric_text() -> str:
    return generate_latest(REGISTRY).decode()


def test_threat_watch_cache_metrics():
    observe_threat_watch_cache(True)
    observe_threat_watch_cache(False)
    observe_threat_watch_sites(succeeded=2, failed=1)
    body = _metric_text()
    assert "monitoring_threat_watch_requests_total" in body
    assert 'cache_result="hit"' in body
    assert 'outcome="failure"' in body


def test_read_cache_metrics():
    observe_read_cache("threat_watch", hit=True)
    observe_read_cache("fence_health", hit=False)
    observe_read_cache("tree_health", hit=None)
    body = _metric_text()
    assert "monitoring_read_cache_total" in body
    assert 'cache="threat_watch"' in body
    assert 'result="invalidate"' in body


def test_sweep_page_metrics():
    observe_sweep_page_result(
        "monthly_sar_sweep",
        {
            "scanned": 3,
            "failed": 1,
            "boundary_invalid": 1,
            "provider_mode": "degraded",
        },
    )
    body = _metric_text()
    assert "monitoring_sweep_fences_total" in body
    assert 'outcome="boundary_invalid"' in body
    assert 'provider_mode="degraded"' in body


def test_celery_job_and_freshness_metrics():
    observe_celery_job("monthly_sar_sweep", "ok")
    observe_celery_job("monthly_sar_sweep", "error")
    observe_data_freshness_stale(
        {"satellite_health_stale": True, "optical_stale": True, "sar_stale": False}
    )
    body = _metric_text()
    assert "monitoring_celery_jobs_total" in body
    assert 'status="error"' in body
    assert 'signal="optical"' in body


@pytest.mark.skipif(not settings.metrics_exposed, reason="metrics endpoint disabled")
def test_metrics_endpoint_exposes_monitoring_series():
    observe_threat_watch_cache(True)
    response = TestClient(app).get("/metrics")
    assert response.status_code == 200
    assert "monitoring_threat_watch_requests_total" in response.text
    assert "monitoring_read_cache_total" in response.text
