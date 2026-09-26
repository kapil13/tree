"""Load uploaded images from storage for integrity checks."""

from __future__ import annotations

from app.services.integrity.exif import ExifExtract, extract_exif_from_bytes
from app.services.storage import get_storage


def load_image_bytes(s3_key: str) -> bytes | None:
    return get_storage().get_bytes(s3_key)


def load_exif_for_upload_key(s3_key: str) -> ExifExtract | None:
    data = load_image_bytes(s3_key)
    if not data:
        return None
    return extract_exif_from_bytes(data)
