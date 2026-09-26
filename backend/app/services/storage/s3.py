"""S3 (and MinIO) storage helper. Generates presigned URLs for direct uploads."""

from __future__ import annotations

from typing import Any

try:
    import boto3
    from botocore.client import Config
except Exception:  # pragma: no cover
    boto3 = None
    Config = None  # type: ignore[assignment]

from app.core.config import settings


def _build_s3_client(endpoint_url: str | None) -> Any | None:
    if boto3 is None:
        return None
    endpoint = (endpoint_url or "").strip() or None
    has_aws_creds = bool(settings.aws_access_key_id and settings.aws_secret_access_key)
    if endpoint is None and not has_aws_creds:
        return None
    kwargs: dict[str, Any] = {"region_name": settings.aws_region}
    if endpoint:
        kwargs["endpoint_url"] = endpoint
        kwargs["config"] = Config(signature_version="s3v4")
    if has_aws_creds:
        kwargs["aws_access_key_id"] = settings.aws_access_key_id
        kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
    return boto3.client("s3", **kwargs)


class S3Storage:
    def __init__(self) -> None:
        self.bucket = settings.s3_bucket_media
        if boto3 is None:
            self._client = None
            self._presign_client = None
            return
        self._client = _build_s3_client(settings.s3_endpoint_url)
        public_endpoint = (settings.s3_public_endpoint_url or "").strip() or settings.s3_endpoint_url
        self._presign_client = _build_s3_client(public_endpoint)

    def is_available(self) -> bool:
        return self._client is not None

    def presigned_put(
        self, key: str, *, content_type: str = "image/jpeg", expires_in: int = 900
    ) -> str:
        client = self._presign_client or self._client
        if client is None:
            return f"https://stub.local/upload?key={key}&expires={expires_in}"
        return client.generate_presigned_url(
            "put_object",
            Params={"Bucket": self.bucket, "Key": key, "ContentType": content_type},
            ExpiresIn=expires_in,
        )

    def presigned_get(self, key: str, *, expires_in: int = 900) -> str:
        client = self._presign_client or self._client
        if client is None:
            return f"https://stub.local/download?key={key}&expires={expires_in}"
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires_in,
        )

    def put_bytes(self, key: str, data: bytes, *, content_type: str = "application/octet-stream") -> str:
        if self._client is None:
            return f"stub://{key}"
        self._client.put_object(
            Bucket=self.bucket, Key=key, Body=data, ContentType=content_type
        )
        return f"s3://{self.bucket}/{key}"

    def get_bytes(self, key: str) -> bytes | None:
        if self._client is None:
            return None
        try:
            obj = self._client.get_object(Bucket=self.bucket, Key=key)
            return obj["Body"].read()
        except Exception:
            return None


_storage: S3Storage | None = None


def get_storage() -> S3Storage:
    global _storage
    if _storage is None:
        _storage = S3Storage()
    return _storage
