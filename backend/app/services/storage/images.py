"""Helpers for tree/pit photo uploads stored on MinIO/S3."""

from __future__ import annotations

import uuid
from typing import Protocol

MAX_IMAGE_BYTES = 12 * 1024 * 1024
IMAGE_EXT_TO_TYPE = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
    "heic": "image/heic",
    "heif": "image/heif",
    "gif": "image/gif",
}


class ImageStorage(Protocol):
    def put_bytes(self, key: str, data: bytes, *, content_type: str) -> str: ...


class ImageUploadError(ValueError):
    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


def image_content_type(filename: str, content_type: str | None) -> tuple[str, str]:
    """Return (extension, mime). Infer from filename when browsers send empty/octet-stream."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
    if ext not in IMAGE_EXT_TO_TYPE:
        ext = "jpg"
    ct = (content_type or "").lower().strip()
    if not ct.startswith("image/"):
        ct = IMAGE_EXT_TO_TYPE[ext]
    return ext, ct


def persist_image_bytes(
    storage: ImageStorage,
    *,
    user_id: uuid.UUID,
    filename: str,
    content_type: str | None,
    data: bytes,
) -> tuple[str, str]:
    """Write image bytes to storage. Returns (s3_key, mime)."""
    if not data:
        raise ImageUploadError("empty_file")
    if len(data) > MAX_IMAGE_BYTES:
        raise ImageUploadError("image_too_large")
    ext, mime = image_content_type(filename, content_type)
    key = f"images/{user_id}/{uuid.uuid4()}.{ext}"
    storage.put_bytes(key, data, content_type=mime)
    return key, mime
