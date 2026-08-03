"""Tests for platform admin Phase H — billing and ops remediation."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.payments.wallet import adjust_scans
from app.services.platform.billing import grant_user_credits
from app.services.platform.exports import export_platform_orders_csv
from app.services.platform.ops import (
    RETRYABLE_JOBS,
    retry_monitoring_job,
    trigger_monitoring_job,
)


@pytest.mark.asyncio
async def test_adjust_scans_grants_and_debits():
    user_id = uuid.uuid4()
    wallet = MagicMock(purchased_scan_balance=5)
    db = AsyncMock()

    with patch("app.services.payments.wallet._lock_wallet", AsyncMock(return_value=wallet)):
        updated = await adjust_scans(db, user_id, 10)
        assert updated.purchased_scan_balance == 15

        updated = await adjust_scans(db, user_id, -3)
        assert updated.purchased_scan_balance == 12


@pytest.mark.asyncio
async def test_adjust_scans_rejects_overdraft():
    user_id = uuid.uuid4()
    wallet = MagicMock(purchased_scan_balance=2)
    db = AsyncMock()

    with (
        patch("app.services.payments.wallet._lock_wallet", AsyncMock(return_value=wallet)),
        pytest.raises(ValueError, match="insufficient_balance"),
    ):
        await adjust_scans(db, user_id, -5)


@pytest.mark.asyncio
async def test_grant_user_credits_updates_wallet():
    user_id = uuid.uuid4()
    user = MagicMock(id=user_id)
    wallet = MagicMock(purchased_scan_balance=20)
    db = AsyncMock()
    db.get = AsyncMock(return_value=user)

    with patch("app.services.platform.billing.adjust_scans", AsyncMock(return_value=wallet)):
        result = await grant_user_credits(db, user_id=user_id, credits=5)

    assert result["user_id"] == user_id
    assert result["credits_delta"] == 5
    assert result["new_balance"] == 20


@pytest.mark.asyncio
async def test_grant_user_credits_user_not_found():
    db = AsyncMock()
    db.get = AsyncMock(return_value=None)
    with pytest.raises(ValueError, match="user_not_found"):
        await grant_user_credits(db, user_id=uuid.uuid4(), credits=5)


@pytest.mark.asyncio
async def test_export_platform_orders_csv_header():
    db = AsyncMock()
    with patch(
        "app.services.platform.exports.query_payment_orders",
        AsyncMock(return_value=([], 0)),
    ):
        csv_text = await export_platform_orders_csv(db)
    assert "razorpay_order_id" in csv_text
    assert "user_email" in csv_text


@pytest.mark.asyncio
async def test_trigger_monitoring_job_whitelist():
    db = AsyncMock()
    task = MagicMock()
    task.delay.return_value = MagicMock(id="task-123")

    with patch("app.workers.tasks.daily_health_roundup", task):
        result = await trigger_monitoring_job(db, "daily_health_roundup")

    assert result["job_name"] == "daily_health_roundup"
    assert result["status"] == "queued"
    assert result["celery_task_id"] == "task-123"


@pytest.mark.asyncio
async def test_trigger_monitoring_job_rejects_unknown():
    db = AsyncMock()
    with pytest.raises(ValueError, match="job_not_allowed"):
        await trigger_monitoring_job(db, "not_a_real_job")


@pytest.mark.asyncio
async def test_retry_monitoring_job_requires_whitelisted_name():
    run_id = uuid.uuid4()
    run = MagicMock(job_name="daily_health_roundup")
    db = AsyncMock()
    db.get = AsyncMock(return_value=run)
    task = MagicMock()
    task.delay.return_value = MagicMock(id="task-456")

    with patch("app.workers.tasks.daily_health_roundup", task):
        result = await retry_monitoring_job(db, run_id)

    assert result["job_name"] == "daily_health_roundup"
    assert result["celery_task_id"] == "task-456"


@pytest.mark.asyncio
async def test_retry_monitoring_job_not_found():
    db = AsyncMock()
    db.get = AsyncMock(return_value=None)
    with pytest.raises(ValueError, match="job_run_not_found"):
        await retry_monitoring_job(db, uuid.uuid4())


def test_retryable_jobs_contains_expected_monitoring_tasks():
    assert "daily_health_roundup" in RETRYABLE_JOBS
    assert "compliance_deadline_scan" in RETRYABLE_JOBS
