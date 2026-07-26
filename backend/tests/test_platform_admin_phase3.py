"""Tests for platform admin Phase 3 — billing and ops dashboards."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.platform.billing import build_billing_summary, query_payment_orders
from app.services.platform.ops import build_ops_summary


@pytest.mark.asyncio
async def test_build_billing_summary_counts(monkeypatch):
    db = AsyncMock()
    result_mock = MagicMock()
    result_mock.scalar_one.side_effect = [10, 6, 2, 50000, 120, 3, 45]
    db.execute = AsyncMock(return_value=result_mock)
    monkeypatch.setattr(
        "app.services.platform.billing.payments_enabled",
        lambda: True,
    )
    summary = await build_billing_summary(db)
    assert summary["payments_enabled"] is True
    assert summary["orders"]["total"] == 10
    assert summary["orders"]["paid"] == 6
    assert summary["orders"]["failed"] == 2
    assert summary["orders"]["pending"] == 2
    assert summary["revenue_paise"] == 50000
    assert summary["wallets"]["users_with_balance"] == 3


@pytest.mark.asyncio
async def test_query_payment_orders_empty():
    db = AsyncMock()
    count_result = MagicMock()
    count_result.scalar_one.return_value = 0
    rows_result = MagicMock()
    rows_result.all.return_value = []
    db.execute = AsyncMock(side_effect=[count_result, rows_result])
    items, total = await query_payment_orders(db)
    assert items == []
    assert total == 0


@pytest.mark.asyncio
async def test_build_ops_summary_composes_health(monkeypatch):
    db = AsyncMock()
    monkeypatch.setattr(
        "app.services.platform.ops.build_worker_health",
        AsyncMock(
            return_value={
                "status": "ok",
                "celery": {"reachable": True, "workers": ["celery@host"]},
                "recent_jobs": [],
                "failed_job_count": 0,
            }
        ),
    )
    monkeypatch.setattr(
        "app.services.platform.ops.build_integrations_health",
        AsyncMock(return_value={"status": "ok", "integrations": {"open_meteo": {"status": "ok"}}}),
    )
    monkeypatch.setattr(
        "app.services.platform.ops.get_recent_job_runs",
        AsyncMock(return_value=[{"job_name": "daily_health_roundup", "status": "ok"}]),
    )
    count_result = MagicMock()
    count_result.scalar_one.return_value = 5
    db.execute = AsyncMock(return_value=count_result)
    summary = await build_ops_summary(db)
    assert summary["status"] == "ok"
    assert summary["workers"]["celery"]["reachable"] is True
    assert summary["jobs"]["total_recorded"] == 5
    assert summary["jobs"]["recent_count"] == 1
