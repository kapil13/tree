"""Tree registration integrity and risk scoring (Phase 0–1)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any

from geoalchemy2.shape import to_shape
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tree import Tree
from app.models.tree_analysis import TreeAnalysis
from app.models.tree_image import TreeImage
from app.models.tree_risk_score import TreeRiskScore
from app.services.integrity.exif import ExifExtract, gps_photo_match
from app.services.integrity.photo_dedup import PhotoDuplicateMatch, find_photo_duplicate
from app.services.integrity.photo_hash import PhotoHashes, compute_photo_hashes
from app.services.planting_projects.compliance import nearest_tree_distance_m
from app.services.planting_projects.constants import ComplianceMode

STRICT_PROGRAM_CODES = frozenset({"government_nhai", "corporate_esg"})
STRICT_MAX_GPS_ACCURACY_M = 20.0
COORDINATE_DEDUP_THRESHOLD_M = 5.0
AI_CONFIDENCE_THRESHOLD = 0.65
REGEOTAG_MISMATCH_THRESHOLD_M = 25.0

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


def assess_ai_confidence_low(overall_confidence: float | None) -> bool:
    if overall_confidence is None:
        return False
    return float(overall_confidence) < AI_CONFIDENCE_THRESHOLD


def assess_regeotag_mismatch(
    tree_lat: float,
    tree_lon: float,
    primary_image: TreeImage | None,
) -> tuple[bool, float | None]:
    if primary_image is None or primary_image.taken_location is None:
        return False, None
    try:
        img_pt = to_shape(primary_image.taken_location)
        from app.services.integrity.exif import ExifGps, gps_photo_match

        gps = ExifGps(latitude=img_pt.y, longitude=img_pt.x)
        matched, dist = gps_photo_match(
            tree_lat,
            tree_lon,
            gps,
            threshold_m=REGEOTAG_MISMATCH_THRESHOLD_M,
        )
        return not matched, dist
    except Exception:
        return False, None


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


def resolve_verification_status(
    assessment: RiskAssessment,
    *,
    satellite_verified: bool = False,
) -> str:
    if assessment.composite_risk >= 0.5 or assessment.duplicate_coordinate:
        return VERIFICATION_REGISTERED
    if (
        satellite_verified
        and assessment.gps_photo_match
        and not assessment.duplicate_photo
        and assessment.composite_risk < 0.25
    ):
        if not assessment.ai_confidence_low and not assessment.regeotag_mismatch:
            return VERIFICATION_AUDIT_READY
        return VERIFICATION_SATELLITE_CORROBORATED
    if assessment.gps_photo_match and assessment.composite_risk < 0.3:
        return VERIFICATION_FIELD_VERIFIED
    return VERIFICATION_REGISTERED


def _tree_coordinates(tree: Tree) -> tuple[float, float] | None:
    try:
        pt = to_shape(tree.location)
        return pt.y, pt.x
    except Exception:
        return None


async def _latest_analysis_confidence(db: AsyncSession, tree_id: uuid.UUID) -> float | None:
    res = await db.execute(
        select(TreeAnalysis.overall_confidence)
        .where(TreeAnalysis.tree_id == tree_id)
        .order_by(TreeAnalysis.created_at.desc())
        .limit(1)
    )
    val = res.scalar_one_or_none()
    return float(val) if val is not None else None


def _primary_image(images: list[TreeImage]) -> TreeImage | None:
    if not images:
        return None
    for img in images:
        if img.is_primary:
            return img
    return images[0]


def apply_photo_hashes_to_image(image: TreeImage, hashes: PhotoHashes) -> None:
    image.content_sha256 = hashes.content_sha256
    image.perceptual_hash = hashes.perceptual_hash


async def recalculate_tree_integrity(
    db: AsyncSession,
    tree: Tree,
    *,
    compliance_mode: ComplianceMode = "open",
    program_code: str = "byot",
    rules_max_accuracy_m: float | None = None,
    primary_exif: ExifExtract | None = None,
    photo_duplicate: PhotoDuplicateMatch | None = None,
    overall_confidence: float | None = None,
) -> RiskAssessment:
    coords = _tree_coordinates(tree)
    if coords is None:
        tree_lat, tree_lon = 0.0, 0.0
    else:
        tree_lat, tree_lon = coords

    images = list(tree.images or [])
    primary = _primary_image(images)

    if photo_duplicate is None and primary and primary.content_sha256:
        from app.services.integrity.photo_hash import PhotoHashes as PH

        photo_duplicate = await find_photo_duplicate(
            db,
            hashes=PH(
                content_sha256=primary.content_sha256,
                perceptual_hash=primary.perceptual_hash or "",
            ),
            organization_id=tree.organization_id,
            exclude_tree_id=tree.id,
        )
    dup_photo = bool(photo_duplicate and photo_duplicate.duplicate_photo)

    dup_coord, nearest_m = await assess_coordinate_duplicate(
        db,
        work_area_id=tree.plantation_id,
        lat=tree_lat,
        lon=tree_lon,
        exclude_tree_id=tree.id,
    )

    if primary_exif is None and primary and primary.taken_location is not None:
        try:
            img_pt = to_shape(primary.taken_location)
            from app.services.integrity.exif import ExifGps

            primary_exif = ExifExtract(
                taken_at=primary.taken_at,
                gps=ExifGps(latitude=img_pt.y, longitude=img_pt.x),
                width_px=primary.width_px,
                height_px=primary.height_px,
                raw=primary.exif or {},
            )
        except Exception:
            primary_exif = None

    gps_match, photo_dist_m = gps_photo_match(
        tree_lat, tree_lon, primary_exif.gps if primary_exif else None
    )
    gps_acc_ok, gps_msg = assess_gps_accuracy(
        float(tree.accuracy_m) if tree.accuracy_m is not None else None,
        compliance_mode=compliance_mode,
        program_code=program_code,
        rules_max_accuracy_m=rules_max_accuracy_m,
    )

    if overall_confidence is None:
        overall_confidence = await _latest_analysis_confidence(db, tree.id)
    ai_low = assess_ai_confidence_low(overall_confidence)
    regeotag_bad, regeotag_dist = assess_regeotag_mismatch(tree_lat, tree_lon, primary)

    composite = compute_composite_risk(
        gps_photo_match=gps_match,
        duplicate_photo=dup_photo,
        duplicate_coordinate=dup_coord,
        ai_confidence_low=ai_low,
        regeotag_mismatch=regeotag_bad,
        gps_accuracy_fail=not gps_acc_ok,
        has_photo_gps=primary_exif is not None and primary_exif.gps is not None,
    )
    details: dict[str, Any] = {
        "photo_gps_distance_m": photo_dist_m,
        "nearest_tree_m": nearest_m,
        "gps_accuracy_issue": gps_msg,
        "gps_accuracy_ok": gps_acc_ok,
        "overall_confidence": overall_confidence,
        "regeotag_photo_distance_m": regeotag_dist,
    }
    if photo_duplicate:
        details["photo_duplicate"] = {
            "exact_match": photo_duplicate.exact_match,
            "near_match": photo_duplicate.near_match,
            "matched_tree_code": photo_duplicate.matched_tree_code,
            "hamming_distance": photo_duplicate.hamming_distance,
        }

    return RiskAssessment(
        gps_photo_match=gps_match,
        duplicate_photo=dup_photo,
        duplicate_coordinate=dup_coord,
        ai_confidence_low=ai_low,
        regeotag_mismatch=regeotag_bad,
        composite_risk=composite,
        details=details,
    )


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
    duplicate_photo: bool = False,
    photo_duplicate_details: dict[str, Any] | None = None,
) -> RiskAssessment:
    gps_match, photo_dist_m = gps_photo_match(
        tree_lat, tree_lon, primary_exif.gps if primary_exif else None
    )
    gps_acc_ok, gps_msg = assess_gps_accuracy(
        accuracy_m,
        compliance_mode=compliance_mode,
        program_code=program_code,
        rules_max_accuracy_m=rules_max_accuracy_m,
    )
    composite = compute_composite_risk(
        gps_photo_match=gps_match,
        duplicate_photo=duplicate_photo,
        duplicate_coordinate=duplicate_coordinate,
        ai_confidence_low=False,
        regeotag_mismatch=False,
        gps_accuracy_fail=not gps_acc_ok,
        has_photo_gps=primary_exif is not None and primary_exif.gps is not None,
    )
    details: dict[str, Any] = {
        "photo_gps_distance_m": photo_dist_m,
        "nearest_tree_m": nearest_m,
        "gps_accuracy_issue": gps_msg,
        "gps_accuracy_ok": gps_acc_ok,
    }
    if photo_duplicate_details:
        details["photo_duplicate"] = photo_duplicate_details
    return RiskAssessment(
        gps_photo_match=gps_match,
        duplicate_photo=duplicate_photo,
        duplicate_coordinate=duplicate_coordinate,
        ai_confidence_low=False,
        regeotag_mismatch=False,
        composite_risk=composite,
        details=details,
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


async def apply_integrity_to_tree(
    db: AsyncSession,
    tree: Tree,
    assessment: RiskAssessment,
) -> None:
    await persist_tree_risk_score(db, tree=tree, assessment=assessment)
    tree.verification_status = resolve_verification_status(
        assessment,
        satellite_verified=bool(tree.satellite_verified),
    )


def apply_exif_to_image(image: TreeImage, exif: ExifExtract | None) -> None:
    if exif is None:
        return
    image.taken_at = exif.taken_at
    image.width_px = exif.width_px
    image.height_px = exif.height_px
    image.exif = exif.raw or None
    if exif.gps is not None:
        image.taken_location = f"POINT({exif.gps.longitude} {exif.gps.latitude})"


def apply_hashes_to_image_from_bytes(image: TreeImage, data: bytes) -> PhotoHashes | None:
    hashes = compute_photo_hashes(data)
    if hashes is None:
        return None
    apply_photo_hashes_to_image(image, hashes)
    return hashes
