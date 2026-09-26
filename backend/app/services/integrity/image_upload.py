"""Shared tree image upload integrity processing (P2)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.models.tree_image import TreeImage
from app.services.integrity.exif import ExifExtract
from app.services.integrity.image_loader import load_exif_for_upload_key, load_image_bytes
from app.services.integrity.photo_dedup import PhotoDuplicateMatch, find_photo_duplicate
from app.services.integrity.photo_evidence import strict_primary_photo_blockers
from app.services.integrity.tree_risk import apply_exif_to_image, apply_hashes_to_image_from_bytes
from app.services.planting_projects.constants import ComplianceMode
from app.services.planting_projects.rule_engine import get_effective_rules, resolve_compliance_mode
from app.services.planting_projects.service import get_active_standard
from app.services.storage import get_storage


@dataclass
class ProcessedTreeImage:
    duplicate: PhotoDuplicateMatch | None
    exif: ExifExtract | None


def duplicate_photo_http_error(match: PhotoDuplicateMatch) -> HTTPException:
    return HTTPException(
        status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail={
            "compliance_errors": [
                {
                    "violation_type": "duplicate_photo",
                    "severity": "block",
                    "message": (
                        "This photo matches an existing tree registration"
                        + (
                            f" ({match.matched_tree_code})."
                            if match.matched_tree_code
                            else "."
                        )
                    ),
                    "metadata": {
                        "matched_tree_code": match.matched_tree_code,
                        "exact_match": match.exact_match,
                        "near_match": match.near_match,
                    },
                }
            ],
        },
    )


def strict_photo_http_error(blockers: list[str], *, mode: str) -> HTTPException:
    return HTTPException(
        status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail={
            "compliance_errors": [
                {
                    "violation_type": blocker,
                    "severity": "block",
                    "message": (
                        "Photo must be a recent live camera capture with GPS metadata "
                        f"({mode} compliance)."
                    ),
                }
                for blocker in blockers
            ],
            "mode": mode,
        },
    )


def should_block_duplicate_photo(
    match: PhotoDuplicateMatch,
    *,
    compliance_mode: ComplianceMode,
    program_code: str,
) -> bool:
    if not match.duplicate_photo:
        return False
    if compliance_mode == "strict":
        return match.exact_match or match.near_match
    if program_code in ("government_nhai", "corporate_esg"):
        return match.exact_match or match.near_match
    return False


async def process_tree_image_upload(
    db: AsyncSession,
    *,
    tree: Tree,
    image: TreeImage,
    s3_key: str,
    organization_id: uuid.UUID | None,
    compliance_mode: ComplianceMode = "open",
    validate_strict_exif: bool = False,
    check_duplicates: bool = True,
) -> ProcessedTreeImage:
    exif = load_exif_for_upload_key(s3_key)
    if exif is not None:
        apply_exif_to_image(image, exif)

    if validate_strict_exif:
        blockers = strict_primary_photo_blockers(exif)
        if blockers:
            raise strict_photo_http_error(blockers, mode=compliance_mode)

    storage = get_storage()
    image_bytes = load_image_bytes(s3_key) or storage.get_bytes(s3_key)
    duplicate: PhotoDuplicateMatch | None = None
    if image_bytes:
        hashes = apply_hashes_to_image_from_bytes(image, image_bytes)
        if check_duplicates and hashes is not None:
            duplicate = await find_photo_duplicate(
                db,
                hashes=hashes,
                organization_id=organization_id,
                exclude_tree_id=tree.id,
            )
    return ProcessedTreeImage(duplicate=duplicate, exif=exif)


async def resolve_tree_compliance_context(
    db: AsyncSession,
    tree: Tree,
) -> tuple[ComplianceMode, str]:
    program_code = tree.planting_program.code if tree.planting_program else "byot"
    compliance_mode: ComplianceMode = "open"
    if tree.project_id:
        project = await db.get(PlantingProject, tree.project_id)
        if project:
            standard = await get_active_standard(db, project)
            await get_effective_rules(db, standard, project_id=project.id)
            compliance_mode = await resolve_compliance_mode(
                db,
                template_code=standard.template_code if standard else project.standard_template_code,
                project_compliance_mode=project.compliance_mode,
                project_id=project.id,
            )
    return compliance_mode, program_code
