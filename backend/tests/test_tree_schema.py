"""Tests for tree serialization helpers."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from app.schemas.tree import TreeImageOut, TreeOut


def test_tree_out_accepts_images_list():
    img = TreeImageOut(
        id=uuid.uuid4(),
        tree_id=uuid.uuid4(),
        s3_key="trees/demo.jpg",
        cdn_url=None,
        is_primary=True,
        created_at=datetime.now(UTC),
    )
    out = TreeOut(
        id=uuid.uuid4(),
        public_code="BYOT-TEST-0001",
        owner_user_id=uuid.uuid4(),
        organization_id=None,
        program_id=None,
        program_code="byot",
        species_id=None,
        species_text="Neem",
        status="active",
        planted_at=None,
        registered_at=datetime.now(UTC),
        latitude=12.97,
        longitude=77.59,
        altitude_m=None,
        accuracy_m=5.0,
        current_height_m=3.2,
        current_dbh_cm=8.0,
        current_canopy_m=2.1,
        current_health="healthy",
        current_carbon_kg=12.5,
        satellite_verified=False,
        last_analysis_at=None,
        last_satellite_at=None,
        metadata={},
        images=[img],
        created_at=datetime.now(UTC),
    )
    dumped = out.model_dump(mode="json")
    assert dumped["public_code"] == "BYOT-TEST-0001"
    assert len(dumped["images"]) == 1
