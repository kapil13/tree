"""P0 security hardening: OTP, roles, docs/metrics, production boot guards."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.core.production_guards import validate_runtime_settings
from app.schemas.auth import RegisterRequest
from app.services.auth.otp import otp_dev_hint, verify_dev_otp


def test_verify_dev_otp_allowed_in_development(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.delenv("AUTH_ALLOW_DEV_OTP", raising=False)
    s = Settings(_env_file=None)
    monkeypatch.setattr("app.services.auth.otp.settings", s)
    assert s.allow_dev_otp is True
    assert verify_dev_otp("000000") is True
    assert verify_dev_otp("123456") is False


def test_verify_dev_otp_blocked_in_production(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("JWT_SECRET", "a" * 32)
    monkeypatch.setenv("APP_DEBUG", "false")
    monkeypatch.delenv("AUTH_ALLOW_DEV_OTP", raising=False)
    s = Settings(_env_file=None)
    monkeypatch.setattr("app.services.auth.otp.settings", s)
    assert s.allow_dev_otp is False
    assert verify_dev_otp("000000") is False
    assert otp_dev_hint("123456") is None


def test_register_request_rejects_professional_roles():
    with pytest.raises(ValidationError):
        RegisterRequest(
            email="gov@example.com",
            password="securepassword12",
            full_name="Gov User",
            role="government",  # type: ignore[arg-type]
        )


def test_register_request_allows_user_only():
    payload = RegisterRequest(
        email="citizen@example.com",
        password="securepassword12",
        full_name="Citizen User",
    )
    assert payload.role == "user"


def test_production_boot_rejects_weak_jwt(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("JWT_SECRET", "change-me")
    monkeypatch.setenv("APP_DEBUG", "false")
    monkeypatch.delenv("AUTH_ALLOW_DEV_OTP", raising=False)
    s = Settings(_env_file=None)
    monkeypatch.setattr("app.core.production_guards.settings", s)
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        validate_runtime_settings()


def test_production_boot_rejects_debug(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("JWT_SECRET", "a" * 32)
    monkeypatch.setenv("APP_DEBUG", "true")
    monkeypatch.delenv("AUTH_ALLOW_DEV_OTP", raising=False)
    s = Settings(_env_file=None)
    monkeypatch.setattr("app.core.production_guards.settings", s)
    with pytest.raises(RuntimeError, match="APP_DEBUG"):
        validate_runtime_settings()


def test_production_boot_rejects_explicit_dev_otp(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("JWT_SECRET", "a" * 32)
    monkeypatch.setenv("APP_DEBUG", "false")
    monkeypatch.setenv("AUTH_ALLOW_DEV_OTP", "true")
    s = Settings(_env_file=None)
    monkeypatch.setattr("app.core.production_guards.settings", s)
    with pytest.raises(RuntimeError, match="AUTH_ALLOW_DEV_OTP"):
        validate_runtime_settings()


def test_production_defaults_hide_docs_and_metrics(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("JWT_SECRET", "a" * 32)
    monkeypatch.setenv("APP_DEBUG", "false")
    monkeypatch.delenv("EXPOSE_API_DOCS", raising=False)
    monkeypatch.delenv("EXPOSE_METRICS", raising=False)
    monkeypatch.delenv("AUTH_ALLOW_DEV_OTP", raising=False)
    s = Settings(_env_file=None)
    assert s.api_docs_exposed is False
    assert s.metrics_exposed is False


def test_production_boot_ok_with_strong_secret(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("JWT_SECRET", "a" * 32)
    monkeypatch.setenv("APP_DEBUG", "false")
    monkeypatch.delenv("AUTH_ALLOW_DEV_OTP", raising=False)
    s = Settings(_env_file=None)
    monkeypatch.setattr("app.core.production_guards.settings", s)
    validate_runtime_settings()
