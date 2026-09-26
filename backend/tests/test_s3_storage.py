"""S3 storage client selection — local dev without credentials uses stub."""

from __future__ import annotations

from app.services.storage.s3 import S3Storage


def test_storage_stub_when_no_endpoint_or_credentials(monkeypatch):
    monkeypatch.setattr("app.services.storage.s3.settings.aws_access_key_id", None)
    monkeypatch.setattr("app.services.storage.s3.settings.aws_secret_access_key", None)
    storage = S3Storage()
    assert storage._client is None
    assert storage.put_bytes("images/demo/x.jpg", b"abc", content_type="image/jpeg") == (
        "stub://images/demo/x.jpg"
    )
