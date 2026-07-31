"""Validate that an S3 object key is scoped to the uploading user."""

from __future__ import annotations

import uuid


def assert_owned_upload_key(
    user_id: uuid.UUID,
    s3_key: str,
    *,
    folders: tuple[str, ...] = ("images", "bioacoustic"),
) -> None:
    """Raise ValueError('invalid_s3_key' | 's3_key_forbidden') if key is not owned by user."""
    if not s3_key or not isinstance(s3_key, str):
        raise ValueError("invalid_s3_key")
    if ".." in s3_key or s3_key.startswith("/") or "\\" in s3_key:
        raise ValueError("invalid_s3_key")

    uid = str(user_id)
    for folder in folders:
        prefix = f"{folder}/{uid}/"
        if s3_key.startswith(prefix) and len(s3_key) > len(prefix):
            return
    raise ValueError("s3_key_forbidden")
