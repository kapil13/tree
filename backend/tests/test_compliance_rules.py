"""Tests for NHAI and ESG compliance rule enforcement."""

from __future__ import annotations

import asyncio
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.planting_projects.compliance import (
    _parse_pit_size_cm,
    _tree_is_native,
    evaluate_tree_placement,
)


def test_parse_pit_size_cm_string():
    assert _parse_pit_size_cm("60×60×60") == (60.0, 60.0, 60.0)
    assert _parse_pit_size_cm("45x45x45") == (45.0, 45.0, 45.0)


def test_parse_pit_size_cm_dict():
    assert _parse_pit_size_cm({"length": 60, "width": 60, "depth": 60}) == (
        60.0,
        60.0,
        60.0,
    )


def test_tree_is_native_from_metadata():
    assert _tree_is_native({"species_native": True}) is True
    assert _tree_is_native({"species_native": "yes"}) is True
    assert _tree_is_native({"species_native": False}) is False


def test_nhai_guard_type_required_blocks():
    work_area = MagicMock()
    work_area.id = uuid.uuid4()
    work_area.area_ha = 10.0
    work_area.geometry_type = "corridor"
    work_area.metadata_ = {
        "source_geometry": {"type": "LineString", "coordinates": [[77.5, 12.9], [77.6, 13.0]]}
    }
    work_area.chainage_start_km = None
    work_area.chainage_end_km = None
    work_area.boundary = "POLYGON(...)"

    rules = {
        "spacing_m": {"min": 6.0},
        "pit_size_cm": {"length": 60, "width": 60, "depth": 60},
        "max_gps_accuracy_m": 10.0,
        "min_photos": 3,
        "guard_type_required": True,
        "layout_pattern": "single_row",
        "chainage_enabled": True,
    }

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
                return_value=None,
            ),
            patch(
                "app.services.planting_projects.compliance.chainage_km_along_line",
                return_value=1.5,
            ),
        ):
            return await evaluate_tree_placement(
                db,
                project=MagicMock(),
                work_area=work_area,
                rules=rules,
                compliance_mode="strict",
                latitude=12.95,
                longitude=77.55,
                accuracy_m=5.0,
                species_text="Neem",
                photo_count=3,
                metadata={
                    "pit_size_cm": "60×60×60",
                    "road_side": "lhs",
                },
            )

    result = asyncio.run(_run())
    types = {i.violation_type for i in result.issues}
    assert "guard_type_missing" in types
    assert result.passed is False


def test_nhai_passes_with_full_metadata():
    work_area = MagicMock()
    work_area.id = uuid.uuid4()
    work_area.area_ha = 10.0
    work_area.geometry_type = "corridor"
    work_area.metadata_ = {
        "source_geometry": {"type": "LineString", "coordinates": [[77.5, 12.9], [77.6, 13.0]]}
    }
    work_area.chainage_start_km = None
    work_area.chainage_end_km = None
    work_area.boundary = "POLYGON(...)"

    rules = {
        "spacing_m": {"min": 6.0},
        "pit_size_cm": {"length": 60, "width": 60, "depth": 60},
        "max_gps_accuracy_m": 10.0,
        "min_photos": 3,
        "guard_type_required": True,
        "layout_pattern": "single_row",
        "chainage_enabled": True,
    }

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
                return_value=None,
            ),
            patch(
                "app.services.planting_projects.compliance.chainage_km_along_line",
                return_value=1.5,
            ),
        ):
            return await evaluate_tree_placement(
                db,
                project=MagicMock(),
                work_area=work_area,
                rules=rules,
                compliance_mode="strict",
                latitude=12.95,
                longitude=77.55,
                accuracy_m=5.0,
                species_text="Neem",
                photo_count=3,
                metadata={
                    "pit_size_cm": "60×60×60",
                    "road_side": "lhs",
                    "guard_type": "bamboo",
                },
            )

    result = asyncio.run(_run())
    blocking = [i for i in result.issues if i.severity == "block"]
    assert result.passed is True
    assert not blocking


def test_esg_native_species_pct_blocks_exotic():
    work_area = MagicMock()
    work_area.id = uuid.uuid4()
    work_area.area_ha = 1.0
    work_area.geometry_type = "polygon"
    work_area.metadata_ = {}
    work_area.chainage_start_km = None
    work_area.chainage_end_km = None
    work_area.boundary = "POLYGON(...)"

    rules = {
        "spacing_m": {"min": 3.0},
        "species_native_pct_min": 70,
        "planting_density_per_ha": {"min": 400, "max": 1200},
    }

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
                return_value=10.0,
            ),
            patch(
                "app.services.planting_projects.compliance.work_area_tree_count",
                new_callable=AsyncMock,
                return_value=9,
            ),
            patch(
                "app.services.planting_projects.compliance.work_area_native_stats",
                new_callable=AsyncMock,
                return_value=(6, 9),
            ),
        ):
            return await evaluate_tree_placement(
                db,
                project=MagicMock(),
                work_area=work_area,
                rules=rules,
                compliance_mode="strict",
                latitude=12.95,
                longitude=77.55,
                accuracy_m=5.0,
                species_text="Eucalyptus",
                photo_count=2,
                metadata={"species_native": False},
            )

    result = asyncio.run(_run())
    types = {i.violation_type for i in result.issues}
    assert "native_species_pct_low" in types
    assert result.passed is False


def test_esg_density_max_blocks():
    work_area = MagicMock()
    work_area.id = uuid.uuid4()
    work_area.area_ha = 0.1
    work_area.geometry_type = "polygon"
    work_area.metadata_ = {}
    work_area.chainage_start_km = None
    work_area.chainage_end_km = None
    work_area.boundary = "POLYGON(...)"

    rules = {"planting_density_per_ha": {"min": 400, "max": 1200}}

    db = AsyncMock()

    async def _run():
        with (
            patch(
                "app.services.planting_projects.compliance.point_inside_work_area",
                new_callable=AsyncMock,
                return_value=True,
            ),
            patch(
                "app.services.planting_projects.compliance.work_area_tree_count",
                new_callable=AsyncMock,
                return_value=120,
            ),
        ):
            return await evaluate_tree_placement(
                db,
                project=MagicMock(),
                work_area=work_area,
                rules=rules,
                compliance_mode="strict",
                latitude=12.95,
                longitude=77.55,
                accuracy_m=5.0,
                species_text="Neem",
                photo_count=2,
                metadata={"species_native": True},
            )

    result = asyncio.run(_run())
    assert any(i.violation_type == "density_out_of_range" for i in result.issues)
    assert result.passed is False
