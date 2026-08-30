"""Tests for cross-project satellite watch helpers."""

from __future__ import annotations

from types import SimpleNamespace

from app.services.schemes.monitoring import (
    SATELLITE_WATCH_METADATA_KEY,
    is_satellite_watch_enabled,
    set_satellite_watch_enabled,
)


def test_estate_scheme_always_watch_enabled():
    project = SimpleNamespace(scheme_code="estate_monitoring", metadata_={})
    assert is_satellite_watch_enabled(project) is True


def test_planting_project_opt_in():
    project = SimpleNamespace(
        scheme_code="campa_ca",
        metadata_={SATELLITE_WATCH_METADATA_KEY: True},
    )
    assert is_satellite_watch_enabled(project) is True


def test_planting_project_opt_out_by_default():
    project = SimpleNamespace(scheme_code="campa_ca", metadata_={})
    assert is_satellite_watch_enabled(project) is False


def test_set_satellite_watch_enabled():
    meta = set_satellite_watch_enabled({"foo": "bar"}, True)
    assert meta[SATELLITE_WATCH_METADATA_KEY] is True
    meta = set_satellite_watch_enabled(meta, False)
    assert SATELLITE_WATCH_METADATA_KEY not in meta
    assert meta["foo"] == "bar"


def test_metadata_merge_preserves_satellite_watch_key():
    existing = {"survey_interval_days": 30, "scheme_refs": {"district": "Pune"}}
    payload = {SATELLITE_WATCH_METADATA_KEY: True, "survey_interval_days": 30}
    merged = dict(existing)
    merged.update(payload)
    assert merged[SATELLITE_WATCH_METADATA_KEY] is True
    assert merged["scheme_refs"]["district"] == "Pune"
