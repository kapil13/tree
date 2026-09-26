"""Phase 1 integrity tests: photo hash dedup and risk recalculation."""

from __future__ import annotations

import uuid
from io import BytesIO
from unittest.mock import AsyncMock, MagicMock

from PIL import Image

from app.services.integrity.photo_hash import compute_photo_hashes, hamming_distance_hex
from app.services.integrity.tree_risk import (
    RiskAssessment,
    assess_ai_confidence_low,
    compute_composite_risk,
    resolve_verification_status,
)


def _png_bytes() -> bytes:
    buf = BytesIO()
    Image.new("RGB", (32, 32), color=(20, 120, 40)).save(buf, format="PNG")
    return buf.getvalue()


def test_compute_photo_hashes_stable():
    data = _png_bytes()
    h1 = compute_photo_hashes(data)
    h2 = compute_photo_hashes(data)
    assert h1 is not None and h2 is not None
    assert h1.content_sha256 == h2.content_sha256
    assert h1.perceptual_hash == h2.perceptual_hash


def test_hamming_distance_identical_zero():
    data = _png_bytes()
    hashes = compute_photo_hashes(data)
    assert hashes is not None
    assert hamming_distance_hex(hashes.perceptual_hash, hashes.perceptual_hash) == 0


def test_ai_confidence_low_threshold():
    assert assess_ai_confidence_low(0.5) is True
    assert assess_ai_confidence_low(0.8) is False
    assert assess_ai_confidence_low(None) is False


def test_composite_risk_duplicate_photo():
    score = compute_composite_risk(
        gps_photo_match=True,
        duplicate_photo=True,
        duplicate_coordinate=False,
        ai_confidence_low=False,
        regeotag_mismatch=False,
    )
    assert score >= 0.35


def test_verification_satellite_corroborated():
    assessment = RiskAssessment(
        gps_photo_match=True,
        duplicate_photo=False,
        duplicate_coordinate=False,
        ai_confidence_low=False,
        regeotag_mismatch=False,
        composite_risk=0.1,
        details={},
    )
    assert (
        resolve_verification_status(assessment, satellite_verified=True)
        == "satellite_corroborated"
    )


def test_verification_satellite_corroborated_even_with_ai_low():
    assessment = RiskAssessment(
        gps_photo_match=True,
        duplicate_photo=False,
        duplicate_coordinate=False,
        ai_confidence_low=True,
        regeotag_mismatch=False,
        composite_risk=0.1,
        details={},
    )
    assert (
        resolve_verification_status(assessment, satellite_verified=True)
        == "satellite_corroborated"
    )


def test_find_photo_duplicate_exact_match():
    from app.services.integrity.photo_dedup import find_photo_duplicate

    data = _png_bytes()
    hashes = compute_photo_hashes(data)
    assert hashes is not None
    org_id = uuid.uuid4()
    other_tree_id = uuid.uuid4()

    image = MagicMock()
    image.id = uuid.uuid4()
    image.content_sha256 = hashes.content_sha256
    image.perceptual_hash = hashes.perceptual_hash
    tree = MagicMock()
    tree.id = other_tree_id
    tree.public_code = "BYOT-DUP-0001"

    db = AsyncMock()
    db.execute = AsyncMock(
        return_value=MagicMock(all=MagicMock(return_value=[(image, tree)]))
    )

    import asyncio

    match = asyncio.run(
        find_photo_duplicate(
            db,
            hashes=hashes,
            organization_id=org_id,
            exclude_tree_id=uuid.uuid4(),
        )
    )
    assert match.duplicate_photo is True
    assert match.exact_match is True
    assert match.matched_tree_code == "BYOT-DUP-0001"
