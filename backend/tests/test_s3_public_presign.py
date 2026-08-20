"""Presigned URLs must use the browser-reachable S3/MinIO endpoint."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.services.storage.s3 import S3Storage


@pytest.mark.parametrize(
    "public_endpoint",
    [
        "https://aranyix.tech/media",
        "https://media.aranyix.tech",
    ],
)
def test_presigned_put_uses_public_endpoint(monkeypatch, public_endpoint: str) -> None:
    monkeypatch.setattr("app.services.storage.s3.boto3", MagicMock())
    monkeypatch.setattr("app.services.storage.s3.Config", MagicMock())

    from app.core.config import settings

    monkeypatch.setattr(settings, "s3_endpoint_url", "http://minio:9000")
    monkeypatch.setattr(settings, "s3_public_endpoint_url", public_endpoint)
    monkeypatch.setattr(settings, "aws_access_key_id", "key")
    monkeypatch.setattr(settings, "aws_secret_access_key", "secret")
    monkeypatch.setattr(settings, "s3_bucket_media", "byot-media")

    internal_client = MagicMock(name="internal")
    public_client = MagicMock(name="public")
    public_client.generate_presigned_url.return_value = f"{public_endpoint}/byot-media/x.jpg?sig=1"

    with patch("app.services.storage.s3._build_s3_client", side_effect=[internal_client, public_client]):
        storage = S3Storage()
        url = storage.presigned_put("images/x.jpg", content_type="image/jpeg")

    assert url.startswith(public_endpoint)
    public_client.generate_presigned_url.assert_called_once()
    internal_client.generate_presigned_url.assert_not_called()
