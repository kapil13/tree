"""Phase D — scan cycle timeline, tree scan history, and weekly digest tests."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.monitoring.scan_cycle import (
    SCAN_CYCLE_SCHEDULE,
    _stale_flag,
    build_scan_cycle,
)
from app.services.monitoring.scan_cycle_digest import (
    DIGEST_KIND,
    build_digest_content,
    scan_cycle_prefs,
)
from app.services.monitoring.tree_scan_history import build_tree_scan_history_rows


def _sat_rec(*, tree_id: uuid.UUID, day: int, ndvi: float = 0.58) -> SimpleNamespace:
    return SimpleNamespace(
        tree_id=tree_id,
        provider="sentinel-2-stub",
        scene_id=f"S2-{day}",
        scene_acquired_at=datetime(2025, 8, day, tzinfo=UTC),
        ndvi_mean=ndvi,
        change_vs_baseline=-0.03,
        cloud_cover_pct=8.0,
        presence_confirmed=True,
    )


def test_tree_scan_history_merges_same_day():
    tree_id = uuid.uuid4()
    tree = SimpleNamespace(
        id=tree_id,
        public_code="T-001",
        species_text="Neem",
        project_id=uuid.uuid4(),
        plantation_id=None,
    )
    rows = build_tree_scan_history_rows(
        tree,
        [_sat_rec(tree_id=tree_id, day=10), _sat_rec(tree_id=tree_id, day=10, ndvi=0.61)],
        project_name="Demo Project",
    )
    assert len(rows) == 1
    assert rows[0].ndvi_mean == 0.61
    assert rows[0].tree_code == "T-001"
    assert rows[0].project_name == "Demo Project"


def test_tree_scan_history_separate_days():
    tree_id = uuid.uuid4()
    tree = SimpleNamespace(
        id=tree_id,
        public_code="T-002",
        species_text=None,
        project_id=None,
        plantation_id=None,
    )
    rows = build_tree_scan_history_rows(
        tree,
        [_sat_rec(tree_id=tree_id, day=10), _sat_rec(tree_id=tree_id, day=12)],
    )
    assert len(rows) == 2
    assert rows[0].scan_date.day == 12


def test_stale_flag_daily_recent_not_stale():
    run = SimpleNamespace(finished_at=datetime.now(UTC))
    assert not _stale_flag(run, "daily")


def test_stale_flag_daily_old_is_stale():
    run = SimpleNamespace(finished_at=datetime.now(UTC) - __import__("datetime").timedelta(days=3))
    assert _stale_flag(run, "daily")


def test_stale_flag_missing_run_is_stale():
    assert _stale_flag(None, "daily")


def test_build_digest_content_includes_registry():
    cycle = {
        "registry": {
            "enrolled_trees": 120,
            "due_now": 5,
            "watch_work_areas": 2,
            "distinct_scan_tiles": 8,
        },
        "due_within_7_days": 18,
        "scheduled_jobs": [{"stale": True}, {"stale": False}],
        "recent_runs": [{"status": "ok"}, {"status": "error"}],
    }
    title, message, payload, severity = build_digest_content(cycle, digest_week="2026-09-01")
    assert "week of 2026-09-01" in title
    assert "120 trees" in message
    assert payload["enrolled_trees"] == 120
    assert payload["due_now"] == 5
    assert severity == "high"


def test_scan_cycle_prefs_defaults():
    user = SimpleNamespace(notification_preferences={})
    prefs = scan_cycle_prefs(user)
    assert prefs["enabled"] is True
    assert prefs["weekly_digest"] is True


def test_scan_cycle_schedule_includes_digest():
    assert "weekly_scan_cycle_digest" in SCAN_CYCLE_SCHEDULE


@pytest.mark.asyncio
async def test_build_scan_cycle_returns_jobs():
    user = SimpleNamespace(id=uuid.uuid4(), role="admin", organization_id=None)

    db = AsyncMock()

    async def _execute(stmt):
        mock = MagicMock()
        if "monitoring_scan_targets" in str(stmt):
            mock.scalar_one = MagicMock(return_value=3)
        else:
            mock.scalar_one_or_none = MagicMock(return_value=None)
        return mock

    db.execute = AsyncMock(side_effect=_execute)

    with (
        patch(
            "app.services.monitoring.scan_cycle.build_scan_engine_summary",
            new_callable=AsyncMock,
            return_value={"enrolled_trees": 10, "due_now": 2},
        ),
        patch(
            "app.services.monitoring.scan_cycle.get_recent_job_runs",
            new_callable=AsyncMock,
            return_value=[{"job_name": "daily_tree_scan_sweep", "status": "ok"}],
        ),
    ):
        result = await build_scan_cycle(db, user)

    assert result["due_within_7_days"] == 3
    assert len(result["scheduled_jobs"]) == len(SCAN_CYCLE_SCHEDULE)
    assert result["registry"]["enrolled_trees"] == 10


@pytest.mark.asyncio
async def test_run_weekly_digest_skips_disabled(monkeypatch):
    from app.services.monitoring import scan_cycle_digest as mod

    user_id = uuid.uuid4()

    class _User:
        id = user_id
        role = "corporate"
        is_org_admin = False
        org_role = "manager"
        is_active = True
        notification_preferences = {"scan_cycle": {"enabled": False}}

    class _Scalars:
        def all(self):
            return [_User()]

    class _Result:
        def scalars(self):
            return _Scalars()

    class _DB:
        async def execute(self, _stmt):
            return _Result()

        async def commit(self):
            pass

    create_called = False

    async def _fake_create(*_args, **_kwargs):
        nonlocal create_called
        create_called = True
        return None

    monkeypatch.setattr(mod, "create_monitoring_alert", _fake_create)
    result = await mod.run_weekly_scan_cycle_digest(_DB())  # type: ignore[arg-type]
    assert result["users_skipped"] == 1
    assert result["digests_sent"] == 0
    assert not create_called


@pytest.mark.asyncio
async def test_run_weekly_digest_sends_when_enabled(monkeypatch):
    from app.services.monitoring import scan_cycle_digest as mod

    user_id = uuid.uuid4()

    class _User:
        id = user_id
        role = "corporate"
        is_org_admin = False
        org_role = "manager"
        is_active = True
        notification_preferences = {"scan_cycle": {"enabled": True, "weekly_digest": True}}

    class _Scalars:
        def all(self):
            return [_User()]

    class _Result:
        def scalars(self):
            return _Scalars()

    class _DB:
        async def execute(self, _stmt):
            return _Result()

        async def commit(self):
            pass

    create_called = False

    async def _fake_build_cycle(db, user):
        return {
            "registry": {"enrolled_trees": 5, "due_now": 1, "watch_work_areas": 0, "distinct_scan_tiles": 2},
            "due_within_7_days": 3,
            "scheduled_jobs": [],
            "recent_runs": [],
        }

    async def _fake_create(db, *, user, kind, **_kwargs):
        nonlocal create_called
        create_called = True
        assert kind == DIGEST_KIND
        assert user.id == user_id
        return SimpleNamespace(kind=kind)

    monkeypatch.setattr(mod, "build_scan_cycle", _fake_build_cycle)
    monkeypatch.setattr(mod, "create_monitoring_alert", _fake_create)
    result = await mod.run_weekly_scan_cycle_digest(_DB())  # type: ignore[arg-type]
    assert result["digests_sent"] == 1
    assert create_called
