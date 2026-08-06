"""GEE SAR sampler helpers."""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

from app.services.satellite import gee_sar_sampler


def test_load_service_account_info_from_inline_json(monkeypatch):
    payload = {"type": "service_account", "client_email": "gee@test.iam.gserviceaccount.com"}
    monkeypatch.setattr(
        gee_sar_sampler.settings,
        "gee_service_account_json",
        json.dumps(payload),
    )
    assert gee_sar_sampler._load_service_account_info() == payload


def test_load_service_account_info_from_file(monkeypatch, tmp_path):
    payload = {"type": "service_account", "client_email": "gee@test.iam.gserviceaccount.com"}
    key_file = tmp_path / "gee.json"
    key_file.write_text(json.dumps(payload), encoding="utf-8")
    monkeypatch.setattr(gee_sar_sampler.settings, "gee_service_account_json", str(key_file))
    assert gee_sar_sampler._load_service_account_info() == payload


def test_initialize_gee_uses_service_account_file(monkeypatch, tmp_path):
    gee_sar_sampler._initialize_gee.cache_clear()
    payload = {
        "type": "service_account",
        "client_email": "gee@test.iam.gserviceaccount.com",
        "private_key": "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
    }
    key_file = tmp_path / "gee.json"
    key_file.write_text(json.dumps(payload), encoding="utf-8")
    monkeypatch.setattr(gee_sar_sampler.settings, "gee_service_account_json", str(key_file))
    monkeypatch.setattr(gee_sar_sampler, "gee_python_available", lambda: True)

    mock_ee = MagicMock()
    with patch.dict("sys.modules", {"ee": mock_ee}):
        assert gee_sar_sampler._initialize_gee() is True
        mock_ee.ServiceAccountCredentials.assert_called_once_with(
            "gee@test.iam.gserviceaccount.com",
            str(key_file.resolve()),
        )
        mock_ee.Initialize.assert_called_once()


def test_has_sar_credentials_requires_successful_init(monkeypatch):
    from app.services.satellite import sar_service

    sar_service.reset_sar_service()
    monkeypatch.setattr(sar_service.settings, "gee_service_account_json", "/run/secrets/gee-sa.json")
    monkeypatch.setattr(sar_service, "gee_python_available", lambda: True)
    monkeypatch.setattr(sar_service, "_initialize_gee", lambda: False)
    assert sar_service.has_sar_credentials() is False

    monkeypatch.setattr(sar_service, "_initialize_gee", lambda: True)
    assert sar_service.has_sar_credentials() is True
