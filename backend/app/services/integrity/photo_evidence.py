"""P1 strict-mode photo evidence validation — block gallery re-uploads."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.services.integrity.exif import ExifExtract

MAX_STRICT_PRIMARY_PHOTO_AGE_DAYS = 7


def strict_primary_photo_blockers(exif: ExifExtract | None) -> list[str]:
    """Return reasons a primary photo fails strict anti-fraud checks."""
    if exif is None:
        return ["missing_exif"]
    reasons: list[str] = []
    if exif.gps is None:
        reasons.append("missing_photo_gps")
    if exif.taken_at is None:
        reasons.append("missing_photo_timestamp")
    else:
        taken_at = exif.taken_at
        if taken_at.tzinfo is None:
            taken_at = taken_at.replace(tzinfo=UTC)
        now = datetime.now(UTC)
        if taken_at > now + timedelta(minutes=5):
            reasons.append("photo_timestamp_in_future")
        age = now - taken_at
        if age > timedelta(days=MAX_STRICT_PRIMARY_PHOTO_AGE_DAYS):
            reasons.append("photo_timestamp_stale")
    return reasons


def strict_primary_photo_valid(exif: ExifExtract | None) -> bool:
    return len(strict_primary_photo_blockers(exif)) == 0
