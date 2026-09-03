"""P3 anti-fraud remediation tests: survey photo, export endpoint, audit evidence."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.tree import TreeRegeotag
from app.services.integrity.audit_readiness import (
    audit_ready_blockers,
    has_sufficient_photo_evidence,
)


def test_tree_regeotag_accepts_optional_photo_key():
    payload = TreeRegeotag(
        latitude=12.9,
        longitude=77.6,
        photo_key="images/user/survey.jpg",
    )
    assert payload.photo_key == "images/user/survey.jpg"


def test_has_sufficient_photo_evidence_with_30_day_span():
    now = datetime.now(UTC)
    images = [
        SimpleNamespace(
            is_primary=True,
            taken_at=now - timedelta(days=35),
            created_at=now - timedelta(days=35),
        ),
        SimpleNamespace(
            is_primary=False,
            taken_at=now,
            created_at=now,
        ),
    ]
    assert has_sufficient_photo_evidence(images) is True
    reasons = audit_ready_blockers(
        duplicate_photo=False,
        duplicate_coordinate=False,
        images=images,
        satellite_verified=True,
        satellite_scene_at=now - timedelta(days=5),
        fusion_score=80.0,
        base_verification_status="satellite_corroborated",
    )
    assert "insufficient_photos" not in reasons
    assert "photo_span_too_short" not in reasons


def test_insufficient_photos_blocker_cleared_with_follow_up():
    now = datetime.now(UTC)
    single = [
        SimpleNamespace(
            is_primary=True,
            taken_at=now,
            created_at=now,
            taken_location=None,
            width_px=None,
            height_px=None,
            exif=None,
        ),
    ]
    assert "insufficient_photos" in audit_ready_blockers(
        duplicate_photo=False,
        duplicate_coordinate=False,
        images=single,
        satellite_verified=True,
        satellite_scene_at=now,
        fusion_score=80.0,
        base_verification_status="satellite_corroborated",
    )

    follow_up = SimpleNamespace(
        is_primary=False,
        taken_at=now - timedelta(days=31),
        created_at=now - timedelta(days=31),
        taken_location=None,
        width_px=None,
        height_px=None,
        exif=None,
    )
    with_follow_up = [*single, follow_up]
    blockers = audit_ready_blockers(
        duplicate_photo=False,
        duplicate_coordinate=False,
        images=with_follow_up,
        satellite_verified=True,
        satellite_scene_at=now,
        fusion_score=80.0,
        base_verification_status="satellite_corroborated",
    )
    assert "insufficient_photos" not in blockers
    assert "photo_span_too_short" not in blockers


@pytest.mark.asyncio
async def test_export_integrity_fusion_endpoint_builds_payload():
    from app.api.v1.planting_projects import export_integrity_fusion

    project = SimpleNamespace(id=uuid.uuid4(), code="DEMO-P3")
    user = SimpleNamespace(id=uuid.uuid4())
    request = MagicMock()
    db = AsyncMock()

    payload = {
        "export_version": "aranyix-integrity-fusion-1.0.0",
        "project_code": "DEMO-P3",
        "summary": {"tree_count": 2},
        "trees": [],
    }

    with (
        patch(
            "app.api.v1.planting_projects.load_project",
            new=AsyncMock(return_value=project),
        ),
        patch(
            "app.services.integrity.export.build_integrity_fusion_export",
            new=AsyncMock(return_value=payload),
        ),
        patch(
            "app.api.v1.planting_projects.record_audit",
            new=AsyncMock(),
        ),
    ):
        response = await export_integrity_fusion(project.id, request, user, db)

    assert response.media_type == "application/json"
    assert "integrity-fusion.json" in response.headers["Content-Disposition"]
    assert b"DEMO-P3" in response.body
