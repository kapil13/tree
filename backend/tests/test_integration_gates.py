"""Phase H — integration export gates and strip modes."""

from __future__ import annotations

import pytest

from app.services.intelligence.integration_gates import (
    IntegrationGateError,
    assert_audit_export_integrations,
    assert_compliance_export_integrations,
    integration_gate_summary,
    integration_modes,
)


def test_integration_modes_returns_all_strip_keys(monkeypatch):
    monkeypatch.setattr(
        "app.services.intelligence.integration_gates.has_sentinel_credentials",
        lambda: False,
    )
    monkeypatch.setattr(
        "app.services.intelligence.integration_gates.has_sar_credentials",
        lambda: False,
    )
    modes = integration_modes()
    assert set(modes) == {
        "optical_ndvi",
        "sar",
        "firms",
        "locust",
        "ai",
        "bioacoustic",
        "bhoonidhi",
    }


def test_assert_audit_export_blocks_stub_optical(monkeypatch):
    monkeypatch.setattr(
        "app.services.intelligence.integration_gates.has_sentinel_credentials",
        lambda: False,
    )
    monkeypatch.setattr(
        "app.services.intelligence.integration_gates.has_sar_credentials",
        lambda: True,
    )
    with pytest.raises(IntegrationGateError) as exc:
        assert_audit_export_integrations()
    assert exc.value.code == "integration_stub_blocks_audit_export"
    assert any(item["key"] == "optical_ndvi" for item in exc.value.blocked)


def test_assert_compliance_export_blocks_stub_ai(monkeypatch):
    monkeypatch.setattr(
        "app.services.intelligence.integration_gates.has_sentinel_credentials",
        lambda: True,
    )
    monkeypatch.setattr(
        "app.services.intelligence.integration_gates.ai_service_status",
        lambda: {"mode": "stub"},
    )
    with pytest.raises(IntegrationGateError):
        assert_compliance_export_integrations()


def test_locust_and_bioacoustic_not_stub_when_operational(monkeypatch):
    monkeypatch.setattr(
        "app.services.intelligence.integration_gates.has_locust_feed",
        lambda: False,
    )
    monkeypatch.setattr(
        "app.services.intelligence.integration_gates.settings.fao_locust_feed_enabled",
        True,
    )
    monkeypatch.setattr(
        "app.services.intelligence.integration_gates.build_bioacoustic_health",
        lambda: {"pipeline": "stub", "production_ready": True},
    )
    modes = integration_modes()
    assert modes["locust"] == "live"
    assert modes["bioacoustic"] == "live"


def test_integration_gate_summary_shape(monkeypatch):
    monkeypatch.setattr(
        "app.services.intelligence.integration_gates.integration_modes",
        lambda: {
            "optical_ndvi": "live",
            "sar": "live",
            "firms": "stub",
            "locust": "stub",
            "ai": "live",
            "bioacoustic": "stub",
            "bhoonidhi": "stub",
        },
    )
    summary = integration_gate_summary()
    assert summary["audit_export_ready"] is True
    assert summary["compliance_export_ready"] is True
    assert len(summary["integrations"]) == 7
