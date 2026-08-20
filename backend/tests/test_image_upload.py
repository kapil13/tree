"""Tree/pit photos are stored via the API, not browser→MinIO presign."""

from __future__ import annotations

import uuid
from unittest.mock import MagicMock

import pytest

from app.services.storage.images import (
    IMAGE_EXT_TO_TYPE,
    MAX_IMAGE_BYTES,
    ImageUploadError,
    image_content_type,
    persist_image_bytes,
)


def test_jpg_keeps_jpeg_mime():
    ext, mime = image_content_type("pit.jpg", "image/jpeg")
    assert ext == "jpg"
    assert mime == "image/jpeg"


def test_jpg_infers_type_when_browser_sends_empty_or_octet_stream():
    assert image_content_type("tree.JPG", "") == ("jpg", "image/jpeg")
    assert image_content_type("tree.jpg", "application/octet-stream") == ("jpg", "image/jpeg")
    assert image_content_type("photo.png", None) == ("png", "image/png")


def test_unknown_extension_defaults_to_jpg():
    ext, mime = image_content_type("scan", "image/jpeg")
    assert ext == "jpg"
    assert mime == "image/jpeg"


def test_persist_jpg_writes_owned_key():
    storage = MagicMock()
    user_id = uuid.UUID("00000000-0000-4000-8000-000000000001")
    key, mime = persist_image_bytes(
        storage,
        user_id=user_id,
        filename="pit.jpg",
        content_type="image/jpeg",
        data=b"\xff\xd8\xff fake-jpeg",
    )
    assert key.startswith(f"images/{user_id}/")
    assert key.endswith(".jpg")
    assert mime == "image/jpeg"
    storage.put_bytes.assert_called_once_with(key, b"\xff\xd8\xff fake-jpeg", content_type="image/jpeg")


def test_persist_rejects_empty_file():
    with pytest.raises(ImageUploadError, match="empty_file"):
        persist_image_bytes(
            MagicMock(),
            user_id=uuid.uuid4(),
            filename="empty.jpg",
            content_type="image/jpeg",
            data=b"",
        )


def test_persist_rejects_oversized_file():
    with pytest.raises(ImageUploadError, match="image_too_large"):
        persist_image_bytes(
            MagicMock(),
            user_id=uuid.uuid4(),
            filename="huge.jpg",
            content_type="image/jpeg",
            data=b"x" * (MAX_IMAGE_BYTES + 1),
        )


def test_persist_storage_failure_propagates():
    storage = MagicMock()
    storage.put_bytes.side_effect = RuntimeError("minio down")
    with pytest.raises(RuntimeError, match="minio down"):
        persist_image_bytes(
            storage,
            user_id=uuid.uuid4(),
            filename="pit.jpg",
            content_type="image/jpeg",
            data=b"jpeg",
        )


def test_supported_extensions_cover_common_field_photos():
    assert "jpg" in IMAGE_EXT_TO_TYPE
    assert "jpeg" in IMAGE_EXT_TO_TYPE
    assert "png" in IMAGE_EXT_TO_TYPE
    assert "heic" in IMAGE_EXT_TO_TYPE
