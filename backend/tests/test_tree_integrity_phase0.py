"""Phase 0 tree integrity tests."""

from __future__ import annotations

import asyncio
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.integrity.exif import ExifExtract, ExifGps, gps_photo_match, haversine_distance_m
from app.services.integrity.tree_risk import (
    assess_from_registration,
    assess_gps_accuracy,
    compute_composite_risk,
    resolve_verification_status,
)
from app.services.planting_projects.compliance import evaluate_tree_placement


def test_haversine_same_point():
    assert haversine_distance_m(12.97, 77.59, 12.97, 77.59) == 0.0


def test_gps_photo_match_within_threshold():
    gps = ExifGps(latitude=12.9716, longitude=77.5946)
    matched, dist = gps_photo_match(12.9716, 77.5946, gps)
    assert matched is True
    assert dist == 0.0


def test_gps_photo_match_far():
    gps = ExifGps(latitude=13.0, longitude=78.0)
    matched, dist = gps_photo_match(12.9716, 77.5946, gps)
    assert matched is False
    assert dist is not None and dist > 25


def test_strict_program_gps_gate():
    ok, msg = assess_gps_accuracy(25.0, compliance_mode="strict", program_code="government_nhai")
    assert ok is False
    assert msg is not None
    ok2, _ = assess_gps_accuracy(15.0, compliance_mode="strict", program_code="government_nhai")
    assert ok2 is True


def test_composite_risk_duplicate_coordinate():
    score = compute_composite_risk(
        gps_photo_match=True,
        duplicate_photo=False,
        duplicate_coordinate=True,
        ai_confidence_low=False,
        regeotag_mismatch=False,
    )
    assert score >= 0.45


def test_verification_status_field_verified():
    assessment = assess_from_registration(
        tree_lat=12.9716,
        tree_lon=77.5946,
        accuracy_m=5.0,
        compliance_mode="strict",
        program_code="government_nhai",
        rules_max_accuracy_m=10.0,
        duplicate_coordinate=False,
        nearest_m=None,
        primary_exif=ExifExtract(
            taken_at=None,
            gps=ExifGps(latitude=12.9716, longitude=77.5946),
            width_px=100,
            height_px=100,
            raw={},
        ),
    )
    assert assessment.gps_photo_match is True
    assert resolve_verification_status(assessment) == "field_verified"


def test_duplicate_coordinate_blocks_strict():
    work_area = MagicMock()
    work_area.id = uuid.uuid4()
    work_area.area_ha = 10.0
    work_area.geometry_type = "polygon"
    work_area.metadata_ = {}
    work_area.chainage_start_km = None
    work_area.chainage_end_km = None
    work_area.boundary = "POLYGON(...)"

    db = AsyncMock()

    async def _run():
        with (
            patch(
                "app.services.planting_projects.compliance.point_inside_work_area",
                new_callable=AsyncMock,
                return_value=True,
            ),
            patch(
                "app.services.planting_projects.compliance.nearest_tree_distance_m",
                new_callable=AsyncMock,
                return_value=2.5,
            ),
        ):
            return await evaluate_tree_placement(
                db,
                project=MagicMock(),
                work_area=work_area,
                rules={"min_separation_m": 5.0},
                compliance_mode="strict",
                latitude=12.95,
                longitude=77.55,
                accuracy_m=5.0,
                species_text="Neem",
                photo_count=1,
                metadata={},
                program_code="government_nhai",
            )

    result = asyncio.run(_run())
    types = {i.violation_type for i in result.issues}
    assert "duplicate_coordinate" in types
    assert result.passed is False
