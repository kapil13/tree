"""Content and perceptual hashes for tree photo deduplication."""

from __future__ import annotations

import hashlib
import io
from dataclasses import dataclass

from PIL import Image


@dataclass
class PhotoHashes:
    content_sha256: str
    perceptual_hash: str


def _average_hash_hex(image: Image.Image, *, hash_size: int = 8) -> str:
    gray = image.convert("L").resize((hash_size, hash_size), Image.Resampling.LANCZOS)
    pixels = list(gray.getdata())
    avg = sum(pixels) / len(pixels)
    bits = "".join("1" if p >= avg else "0" for p in pixels)
    return f"{int(bits, 2):0{hash_size * hash_size // 4}x}"


def compute_photo_hashes(data: bytes) -> PhotoHashes | None:
    if not data:
        return None
    sha = hashlib.sha256(data).hexdigest()
    try:
        with Image.open(io.BytesIO(data)) as img:
            phash = _average_hash_hex(img)
    except Exception:
        phash = hashlib.sha256(data[:4096]).hexdigest()[:16]
    return PhotoHashes(content_sha256=sha, perceptual_hash=phash)


def hamming_distance_hex(a: str, b: str) -> int:
    if not a or not b:
        return 999
    length = min(len(a), len(b))
    dist = 0
    for i in range(length):
        dist += bin(int(a[i], 16) ^ int(b[i], 16)).count("1")
    dist += abs(len(a) - len(b)) * 4
    return dist
