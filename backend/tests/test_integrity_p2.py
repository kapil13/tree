"""P2 anti-fraud hardening tests: follow-up photo pipeline and registry alignment."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.integrity.audit_readiness import audit_ready_blockers
from app.services.integrity.image_upload import should_block_duplicate_photo
from app.services.integrity.photo_dedup import PhotoDuplicateMatch
from app.services.integrity.registry_integration import tree_registry_eligibility


def test_should_block_near_duplicate_in_strict_mode():
    match = PhotoDuplicateMatch(
        duplicate_photo=True,
        exact_match=False,
        near_match=True,
        matched_tree_id=uuid.uuid4(),
        matched_image_id=uuid.uuid4(),
        matched_tree_code="T-DUP",
        hamming_distance=4,
        content_sha256="abc",
    )
    assert should_block_duplicate_photo(match, compliance_mode="strict", program_code="byot") is True
    assert should_block_duplicate_photo(match, compliance_mode="open", program_code="byot") is False


def test_audit_ready_blockers_include_strict_exif_for_primary():
    now = datetime.now(UTC)
    primary = SimpleNamespace(
        is_primary=True,
        taken_at=now - timedelta(days=30),
        created_at=now - timedelta(days=30),
        taken_location=None,
        width_px=None,
        height_px=None,
        exif=None,
    )
    follow_up = SimpleNamespace(
        is_primary=False,
        taken_at=now,
        created_at=now,
        taken_location=None,
        width_px=None,
        height_px=None,
        exif=None,
    )
    reasons = audit_ready_blockers(
        duplicate_photo=False,
        duplicate_coordinate=False,
        images=[primary, follow_up],
        satellite_verified=True,
        satellite_scene_at=now - timedelta(days=5),
        fusion_score=80.0,
        base_verification_status="satellite_corroborated",
        strict_photo_evidence=True,
    )
    assert "missing_photo_gps" in reasons


@pytest.mark.asyncio
async def test_tree_registry_eligibility_blocks_with_audit_blockers():
    tree = SimpleNamespace(id=uuid.uuid4(), verification_status="audit_ready", public_code="T-1")
    risk = SimpleNamespace(
        credit_eligible=True,
        fusion_score=80.0,
        fusion_details={"audit_ready_blockers": ["photo_span_too_short"]},
    )
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(first=MagicMock(return_value=(tree, risk))))
    result = await tree_registry_eligibility(db, tree.id)
    assert result.eligible is False
    assert "photo_span_too_short" in result.reasons
