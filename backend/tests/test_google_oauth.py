from __future__ import annotations

from unittest.mock import MagicMock

from app.services.auth.google_oauth import GoogleProfile, google_authorize_url


def test_google_authorize_url_uses_frontend_callback_when_api_subdomain_configured(
    monkeypatch,
) -> None:
    mock_settings = MagicMock()
    mock_settings.google_client_id = "test-client.apps.googleusercontent.com"
    mock_settings.google_redirect_uri = "https://api.aranyix.tech/api/v1/auth/google/callback"
    mock_settings.google_oauth_redirect_uri = (
        "https://aranyix.tech/api/v1/auth/google/callback"
    )
    monkeypatch.setattr("app.services.auth.google_oauth.settings", mock_settings)
    url = google_authorize_url(state="csrf-token-abc")
    assert (
        "redirect_uri=https%3A%2F%2Faranyix.tech%2Fapi%2Fv1%2Fauth%2Fgoogle%2Fcallback" in url
    )
    assert "client_id=test-client.apps.googleusercontent.com" in url
    assert "state=csrf-token-abc" in url


def test_google_oauth_redirect_uri_prefers_app_origin(monkeypatch) -> None:
    from app.core.config import Settings

    settings = Settings(
        frontend_url="https://aranyix.tech",
        google_redirect_uri="https://api.aranyix.tech/api/v1/auth/google/callback",
    )
    assert settings.google_oauth_redirect_uri == "https://aranyix.tech/api/v1/auth/google/callback"


def test_google_profile_email_verified_field() -> None:
    verified = GoogleProfile(
        sub="1", email="a@b.com", name="A", email_verified=True
    )
    unverified = GoogleProfile(sub="2", email="c@d.com", name="C")
    assert verified.email_verified is True
    assert unverified.email_verified is False
