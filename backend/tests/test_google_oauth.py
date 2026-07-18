from __future__ import annotations

from unittest.mock import MagicMock

from app.services.auth.google_oauth import google_authorize_url


def test_google_authorize_url_encodes_redirect(monkeypatch) -> None:
    mock_settings = MagicMock()
    mock_settings.google_client_id = "test-client.apps.googleusercontent.com"
    mock_settings.google_redirect_uri = "https://api.aranyix.tech/api/v1/auth/google/callback"
    monkeypatch.setattr("app.services.auth.google_oauth.settings", mock_settings)
    url = google_authorize_url()
    assert "redirect_uri=https%3A%2F%2Fapi.aranyix.tech%2Fapi%2Fv1%2Fauth%2Fgoogle%2Fcallback" in url
    assert "client_id=test-client.apps.googleusercontent.com" in url
