"""Duplicate photo detection across trees."""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tree import Tree
from app.models.tree_image import TreeImage
from app.services.integrity.photo_hash import PhotoHashes, hamming_distance_hex

PHASH_NEAR_DUPLICATE_THRESHOLD = 8


@dataclass
class PhotoDuplicateMatch:
    duplicate_photo: bool
    exact_match: bool
    near_match: bool
    matched_tree_id: uuid.UUID | None
    matched_image_id: uuid.UUID | None
    matched_tree_code: str | None
    hamming_distance: int | None
    content_sha256: str | None


async def find_photo_duplicate(
    db: AsyncSession,
    *,
    hashes: PhotoHashes,
    organization_id: uuid.UUID | None,
    exclude_tree_id: uuid.UUID | None = None,
) -> PhotoDuplicateMatch:
    no_match = PhotoDuplicateMatch(
        duplicate_photo=False,
        exact_match=False,
        near_match=False,
        matched_tree_id=None,
        matched_image_id=None,
        matched_tree_code=None,
        hamming_distance=None,
        content_sha256=hashes.content_sha256,
    )
    if organization_id is None:
        return no_match

    stmt = (
        select(TreeImage, Tree)
        .join(Tree, TreeImage.tree_id == Tree.id)
        .where(
            Tree.organization_id == organization_id,
            Tree.status != "removed",
            TreeImage.content_sha256.isnot(None),
        )
    )
    if exclude_tree_id:
        stmt = stmt.where(Tree.id != exclude_tree_id)
    rows = (await db.execute(stmt)).all()

    for image, tree in rows:
        if image.content_sha256 == hashes.content_sha256:
            return PhotoDuplicateMatch(
                duplicate_photo=True,
                exact_match=True,
                near_match=False,
                matched_tree_id=tree.id,
                matched_image_id=image.id,
                matched_tree_code=tree.public_code,
                hamming_distance=0,
                content_sha256=hashes.content_sha256,
            )

    best_dist = 999
    best: tuple[TreeImage, Tree] | None = None
    for image, tree in rows:
        if not image.perceptual_hash:
            continue
        dist = hamming_distance_hex(hashes.perceptual_hash, image.perceptual_hash)
        if dist < best_dist:
            best_dist = dist
            best = (image, tree)

    if best is not None and best_dist <= PHASH_NEAR_DUPLICATE_THRESHOLD:
        image, tree = best
        return PhotoDuplicateMatch(
            duplicate_photo=True,
            exact_match=False,
            near_match=True,
            matched_tree_id=tree.id,
            matched_image_id=image.id,
            matched_tree_code=tree.public_code,
            hamming_distance=best_dist,
            content_sha256=hashes.content_sha256,
        )
    return no_match
