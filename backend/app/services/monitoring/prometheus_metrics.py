"""Prometheus metrics for monitoring read paths and sweep workers."""

from __future__ import annotations

import time
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

from prometheus_client import Counter, Histogram

MONITORING_THREAT_WATCH_REQUESTS = Counter(
    "monitoring_threat_watch_requests_total",
    "Portfolio threat watch builds",
    labelnames=("cache_result",),
)

MONITORING_THREAT_WATCH_SITES = Counter(
    "monitoring_threat_watch_sites_total",
    "Threat watch sites processed per portfolio build",
    labelnames=("outcome",),
)

MONITORING_THREAT_WATCH_DURATION = Histogram(
    "monitoring_threat_watch_duration_seconds",
    "Portfolio threat watch build duration",
    buckets=(0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0),
)

MONITORING_READ_CACHE = Counter(
    "monitoring_read_cache_total",
    "Monitoring Redis read-cache operations",
    labelnames=("cache", "result"),
)

MONITORING_SWEEP_FENCES = Counter(
    "monitoring_sweep_fences_total",
    "Fences processed in paginated sweep pages",
    labelnames=("job", "outcome"),
)

MONITORING_SWEEP_PAGES = Counter(
    "monitoring_sweep_pages_total",
    "Completed paginated sweep pages",
    labelnames=("job", "provider_mode"),
)

MONITORING_SWEEP_PAGE_DURATION = Histogram(
    "monitoring_sweep_page_duration_seconds",
    "Paginated sweep page processing duration",
    labelnames=("job",),
    buckets=(1.0, 5.0, 10.0, 30.0, 60.0, 120.0, 300.0, 600.0),
)

MONITORING_CELERY_JOBS = Counter(
    "monitoring_celery_jobs_total",
    "Monitoring Celery jobs recorded via job_runs",
    labelnames=("job", "status"),
)

MONITORING_DATA_FRESHNESS_STALE = Counter(
    "monitoring_data_freshness_stale_total",
    "Threat-watch sites with stale input signals",
    labelnames=("signal",),
)

WEBHOOK_DELIVERIES = Counter(
    "webhook_deliveries_total",
    "Organization webhook delivery outcomes",
    labelnames=("outcome",),
)

def observe_threat_watch_cache(cache_hit: bool) -> None:
    MONITORING_THREAT_WATCH_REQUESTS.labels(
        cache_result="hit" if cache_hit else "miss",
    ).inc()


def observe_threat_watch_sites(*, succeeded: int, failed: int) -> None:
    if succeeded:
        MONITORING_THREAT_WATCH_SITES.labels(outcome="success").inc(succeeded)
    if failed:
        MONITORING_THREAT_WATCH_SITES.labels(outcome="failure").inc(failed)


def observe_read_cache(cache: str, *, hit: bool | None) -> None:
    if hit is True:
        result = "hit"
    elif hit is False:
        result = "miss"
    else:
        result = "invalidate"
    MONITORING_READ_CACHE.labels(cache=cache, result=result).inc()


def observe_sweep_page_result(job_name: str, result: dict[str, Any]) -> None:
    scanned = int(result.get("scanned") or 0)
    failed = int(result.get("failed") or 0)
    boundary_invalid = int(result.get("boundary_invalid") or 0)
    provider_mode = str(result.get("provider_mode") or "n/a")

    if scanned:
        MONITORING_SWEEP_FENCES.labels(job=job_name, outcome="scanned").inc(scanned)
    if failed:
        MONITORING_SWEEP_FENCES.labels(job=job_name, outcome="failed").inc(failed)
    if boundary_invalid:
        MONITORING_SWEEP_FENCES.labels(job=job_name, outcome="boundary_invalid").inc(boundary_invalid)

    MONITORING_SWEEP_PAGES.labels(job=job_name, provider_mode=provider_mode).inc()


def observe_sweep_page_duration(job_name: str, duration_seconds: float) -> None:
    MONITORING_SWEEP_PAGE_DURATION.labels(job=job_name).observe(duration_seconds)


def observe_celery_job(job_name: str, status: str) -> None:
    MONITORING_CELERY_JOBS.labels(job=job_name, status=status).inc()


def observe_data_freshness_stale(freshness: dict[str, Any] | None) -> None:
    if not freshness:
        return
    if freshness.get("satellite_health_stale"):
        MONITORING_DATA_FRESHNESS_STALE.labels(signal="satellite_health").inc()
    if freshness.get("optical_stale"):
        MONITORING_DATA_FRESHNESS_STALE.labels(signal="optical").inc()
    if freshness.get("sar_stale"):
        MONITORING_DATA_FRESHNESS_STALE.labels(signal="sar").inc()


@contextmanager
def track_threat_watch_duration() -> Iterator[None]:
    start = time.perf_counter()
    try:
        yield
    finally:
        MONITORING_THREAT_WATCH_DURATION.observe(time.perf_counter() - start)


def observe_webhook_delivery(outcome: str) -> None:
    WEBHOOK_DELIVERIES.labels(outcome=outcome).inc()

