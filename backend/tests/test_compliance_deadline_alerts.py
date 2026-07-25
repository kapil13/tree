"""Tests for Wave 7.5 compliance deadline alerts."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.services.monitoring.compliance_deadline_alerts import (
    REMINDER_DAYS,
    VIOLATION_RESOLVE_DAYS,
    _days_until,
    _reminder_tier,
)


def test_violation_resolve_days():
    assert VIOLATION_RESOLVE_DAYS == 7


def test_reminder_days_includes_overdue():
    assert 0 in REMINDER_DAYS
    assert 7 in REMINDER_DAYS


def test_reminder_tier_overdue():
    past = datetime.now(UTC) - timedelta(days=1)
    assert _reminder_tier(_days_until(past)) == "overdue"


def test_reminder_tier_seven_days():
    future = datetime.now(UTC) + timedelta(days=7)
    assert _reminder_tier(_days_until(future)) == "d7"


def test_reminder_tier_none_for_non_milestone():
    future = datetime.now(UTC) + timedelta(days=5)
    assert _reminder_tier(_days_until(future)) is None
