"""P0 audit-ready eligibility — anti-fraud hardening for credit issuance."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from app.services.integrity.fusion import FUSION_ISSUE_MIN_SCORE
from app.services.integrity.tree_risk import (
    VERIFICATION_SATELLITE_CORROBORATED,
)

if TYPE_CHECKING:
    from app.models.tree_image import TreeImage

MIN_PHOTOS_FOR_AUDIT = 2
MIN_PHOTO_SPAN_DAYS = 30
MAX_SATELLITE_AGE_DAYS = 90


def _photo_timestamps(images: list[TreeImage]) -> list[datetime]:
    stamps: list[datetime] = []
    for image in images:
        ts = image.taken_at or image.created_at
        if ts is None:
            continue
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=UTC)
        stamps.append(ts)
    return sorted(stamps)


def photo_span_days(images: list[TreeImage]) -> float | None:
    stamps = _photo_timestamps(images)
    if len(stamps) < 2:
        return None
    delta = stamps[-1] - stamps[0]
    return delta.total_seconds() / 86400.0


def has_sufficient_photo_evidence(images: list[TreeImage]) -> bool:
    stamps = _photo_timestamps(images)
    if len(stamps) < MIN_PHOTOS_FOR_AUDIT:
        return False
    span = photo_span_days(images)
    return span is not None and span >= MIN_PHOTO_SPAN_DAYS


def satellite_scan_within_days(
    scene_acquired_at: datetime | None,
    *,
    max_age_days: int = MAX_SATELLITE_AGE_DAYS,
) -> bool:
    if scene_acquired_at is None:
        return False
    ts = scene_acquired_at
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=UTC)
    age = datetime.now(UTC) - ts
    return age <= timedelta(days=max_age_days)


def audit_ready_blockers(
    *,
    duplicate_photo: bool,
    duplicate_coordinate: bool,
    images: list[TreeImage],
    satellite_verified: bool,
    satellite_scene_at: datetime | None,
    fusion_score: float | None,
    base_verification_status: str,
    ai_confidence_low: bool = False,
    regeotag_mismatch: bool = False,
) -> list[str]:
    """Return machine-readable reasons blocking audit-ready promotion."""
    if base_verification_status != VERIFICATION_SATELLITE_CORROBORATED:
        return ["not_satellite_corroborated"]
    reasons: list[str] = []
    if duplicate_photo:
        reasons.append("duplicate_photo")
    if duplicate_coordinate:
        reasons.append("duplicate_coordinate")
    stamps = _photo_timestamps(images)
    if len(stamps) < MIN_PHOTOS_FOR_AUDIT:
        reasons.append("insufficient_photos")
    else:
        span = photo_span_days(images)
        if span is None or span < MIN_PHOTO_SPAN_DAYS:
            reasons.append("photo_span_too_short")
    if not satellite_verified:
        reasons.append("satellite_not_verified")
    elif not satellite_scan_within_days(satellite_scene_at):
        reasons.append("satellite_scan_stale")
    if fusion_score is None or float(fusion_score) < FUSION_ISSUE_MIN_SCORE:
        reasons.append("fusion_below_audit_minimum")
    if ai_confidence_low:
        reasons.append("ai_confidence_low")
    if regeotag_mismatch:
        reasons.append("regeotag_mismatch")
    return reasons


def meets_audit_ready_criteria(**kwargs) -> bool:
    return len(audit_ready_blockers(**kwargs)) == 0
