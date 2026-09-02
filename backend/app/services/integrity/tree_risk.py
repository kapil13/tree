"""Tree registration integrity and risk scoring (Phase 0)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tree import Tree
from app.models.tree_image import TreeImage
from app.models.tree_risk_score import TreeRiskScore
from app.services.integrity.exif import ExifExtract, gps_photo_match
from app.services.planting_projects.compliance import nearest_tree_distance_m
from app.services.planting_projects.constants import ComplianceMode

STRICT_PROGRAM_CODES = frozenset({"government_nhai", "corporate_esg"})
STRICT_MAX_GPS_ACCURACY_M = 20.0
COORDINATE_DEDUP_THRESHOLD_M = 5.0

VERIFICATION_REGISTERED = "registered"
VERIFICATION_FIELD_VERIFIED = "field_verified"
VERIFICATION_SATELLITE_CORROBORATED = "satellite_corroborated"
VERIFICATION_AUDIT_READY = "audit_ready"


@dataclass
class RiskAssessment:
    gps_photo_match: bool
    duplicate_photo: bool
    duplicate_coordinate: bool
    ai_confidence_low: bool
    regeotag_mismatch: bool
    composite_risk: float
    details: dict[str, Any]


def assess_gps_accuracy(
    accuracy_m: float | None,
    *,
    compliance_mode: ComplianceMode,
    program_code: str,
    rules_max_accuracy_m: float | None = None,
) -> tuple[bool, str | None]:
    """Return (passes, issue_message)."""
    if accuracy_m is None:
        return True, None
    limit = rules_max_accuracy_m
    if (
        compliance_mode == "strict"
        and program_code in STRICT_PROGRAM_CODES
        and (limit is None or limit > STRICT_MAX_GPS_ACCURACY_M)
    ):
        limit = STRICT_MAX_GPS_ACCURACY_M
    if limit is not None and accuracy_m > float(limit):
        return False, f"GPS accuracy {accuracy_m:.1f} m exceeds limit of {limit} m."
    return True, None


async def assess_coordinate_duplicate(
    db: AsyncSession,
    *,
    work_area_id: uuid.UUID | None,
    lat: float,
    lon: float,
    exclude_tree_id: uuid.UUID | None = None,
    threshold_m: float = COORDINATE_DEDUP_THRESHOLD_M,
) -> tuple[bool, float | None]:
    """Return (is_duplicate, nearest_distance_m)."""
    if work_area_id is None:
        return False, None
    nearest = await nearest_tree_distance_m(
        db,
        work_area_id=work_area_id,
        lon=lon,
        lat=lat,
        exclude_tree_id=exclude_tree_id,
    )
    if nearest is None:
        return False, None
    return nearest < threshold_m, nearest


def compute_composite_risk(
    *,
    gps_photo_match: bool,
    duplicate_photo: bool,
    duplicate_coordinate: bool,
    ai_confidence_low: bool,
    regeotag_mismatch: bool,
    gps_accuracy_fail: bool = False,
    has_photo_gps: bool = True,
) -> float:
    score = 0.0
    if duplicate_coordinate:
        score += 0.45
    if duplicate_photo:
        score += 0.35
    if not gps_photo_match:
        score += 0.20 if has_photo_gps else 0.10
    if gps_accuracy_fail:
        score += 0.15
    if ai_confidence_low:
        score += 0.10
    if regeotag_mismatch:
        score += 0.15
    return round(min(1.0, score), 4)


def resolve_verification_status(assessment: RiskAssessment) -> str:
    if assessment.composite_risk >= 0.5 or assessment.duplicate_coordinate:
        return VERIFICATION_REGISTERED
    if assessment.gps_photo_match and assessment.composite_risk < 0.3:
        return VERIFICATION_FIELD_VERIFIED
    return VERIFICATION_REGISTERED


def assess_from_registration(
    *,
    tree_lat: float,
    tree_lon: float,
    accuracy_m: float | None,
    compliance_mode: ComplianceMode,
    program_code: str,
    rules_max_accuracy_m: float | None,
    duplicate_coordinate: bool,
    nearest_m: float | None,
    primary_exif: ExifExtract | None,
) -> RiskAssessment:
    gps_match, photo_dist_m = gps_photo_match(tree_lat, tree_lon, primary_exif.gps if primary_exif else None)
    gps_acc_ok, gps_msg = assess_gps_accuracy(
        accuracy_m,
        compliance_mode=compliance_mode,
        program_code=program_code,
        rules_max_accuracy_m=rules_max_accuracy_m,
    )
    composite = compute_composite_risk(
        gps_photo_match=gps_match,
        duplicate_photo=False,
        duplicate_coordinate=duplicate_coordinate,
        ai_confidence_low=False,
        regeotag_mismatch=False,
        gps_accuracy_fail=not gps_acc_ok,
        has_photo_gps=primary_exif is not None and primary_exif.gps is not None,
    )
    return RiskAssessment(
        gps_photo_match=gps_match,
        duplicate_photo=False,
        duplicate_coordinate=duplicate_coordinate,
        ai_confidence_low=False,
        regeotag_mismatch=False,
        composite_risk=composite,
        details={
            "photo_gps_distance_m": photo_dist_m,
            "nearest_tree_m": nearest_m,
            "gps_accuracy_issue": gps_msg,
            "gps_accuracy_ok": gps_acc_ok,
        },
    )


async def persist_tree_risk_score(
    db: AsyncSession,
    *,
    tree: Tree,
    assessment: RiskAssessment,
) -> TreeRiskScore:
    existing = tree.risk_score
    if existing is None:
        row = TreeRiskScore(
            tree_id=tree.id,
            gps_photo_match=assessment.gps_photo_match,
            duplicate_photo=assessment.duplicate_photo,
            duplicate_coordinate=assessment.duplicate_coordinate,
            ai_confidence_low=assessment.ai_confidence_low,
            regeotag_mismatch=assessment.regeotag_mismatch,
            composite_risk=assessment.composite_risk,
            details=assessment.details,
        )
        db.add(row)
        await db.flush()
        return row
    existing.gps_photo_match = assessment.gps_photo_match
    existing.duplicate_photo = assessment.duplicate_photo
    existing.duplicate_coordinate = assessment.duplicate_coordinate
    existing.ai_confidence_low = assessment.ai_confidence_low
    existing.regeotag_mismatch = assessment.regeotag_mismatch
    existing.composite_risk = assessment.composite_risk
    existing.details = assessment.details
    await db.flush()
    return existing


def apply_exif_to_image(image: TreeImage, exif: ExifExtract | None) -> None:
    if exif is None:
        return
    image.taken_at = exif.taken_at
    image.width_px = exif.width_px
    image.height_px = exif.height_px
    image.exif = exif.raw or None
    if exif.gps is not None:
        image.taken_location = (
            f"POINT({exif.gps.longitude} {exif.gps.latitude})"
        )
