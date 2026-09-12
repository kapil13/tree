"""Content-type validation via magic bytes."""

from __future__ import annotations

IMAGE_MAGIC_CHECKS: tuple[tuple[bytes, str], ...] = (
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"GIF87a", "image/gif"),
    (b"GIF89a", "image/gif"),
    (b"RIFF", "image/webp"),  # WEBP: RIFF....WEBP — checked further below
)


def detect_image_mime(data: bytes) -> str | None:
    """Return MIME type when magic bytes match a supported image format."""
    if len(data) < 12:
        return None
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    # HEIC/HEIF — ISO BMFF ftyp box
    if len(data) >= 12 and data[4:8] == b"ftyp":
        brand = data[8:12]
        if brand in (b"heic", b"heix", b"hevc", b"hevx", b"mif1", b"msf1"):
            return "image/heic"
    return None


def assert_valid_image_bytes(data: bytes) -> str:
    """Raise ValueError with code when bytes are not a supported image."""
    mime = detect_image_mime(data)
    if mime is None:
        raise ValueError("invalid_image_content")
    return mime
