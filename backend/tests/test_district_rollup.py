"""Tests for government district rollup aggregation."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.reports import district_rollup as district_rollup_module
from app.services.reports.district_rollup import (
    _bucket_key,
    _finalize_bucket,
    build_district_rollup,
)


def _project(
    *,
    state_code: str = "08",
    state_name: str = "Rajasthan",
    district_code: str = "101",
    district_name: str = "Barmer",
    block_name: str = "Barmer",
    scheme_code: str = "campa_ca",
    target: int = 100,
    site_type: str | None = None,
):
    project = MagicMock()
    project.id = uuid.uuid4()
    project.scheme_code = scheme_code
    project.target_tree_count = target
    project.metadata_ = {
        "location": {
            "state_code": state_code,
            "state_name": state_name,
            "district_code": district_code,
            "district_name": district_name,
            "block_name": block_name,
        },
        "scheme_refs": {"site_type": site_type} if site_type else {},
    }
    return project


def test_bucket_key_district_vs_block():
    loc = {
        "state_code": "08",
        "state_name": "Rajasthan",
        "district_code": "101",
        "district_name": "Barmer",
        "block_name": "Barmer",
    }
    assert _bucket_key(loc, group_by="district") == "08|Rajasthan|101|Barmer"
    assert _bucket_key(loc, group_by="block") == "08|Rajasthan|101|Barmer|Barmer"


def test_finalize_bucket_computes_weighted_metrics():
    bucket = {
        "project_count": 2,
        "target_trees": 200,
        "registered_trees": 150,
        "survival_due": 5,
        "open_violations": 1,
        "scheme_on_track": 1,
        "scheme_at_risk": 1,
        "scheme_off_track": 0,
        "survival_pct_sum": 180.0,
        "survival_pct_weight": 150,
        "geo_tagged_pct_sum": 120.0,
        "geo_tagged_pct_weight": 150,
        "by_scheme": {},
        "by_site_type": {},
    }
    out = _finalize_bucket(bucket)
    assert out["gap"] == 50
    assert out["achievement_pct"] == 75.0
    assert out["avg_survival_pct"] == 1.2
    assert out["avg_geo_tagged_pct"] == 0.8
    assert "survival_pct_sum" not in out


@pytest.mark.asyncio
async def test_build_district_rollup_groups_by_district():
    projects = [
        _project(district_name="Barmer", scheme_code="campa_ca", target=100),
        _project(district_name="Jaisalmer", district_code="102", scheme_code="nagar_van", target=50),
    ]
    db = AsyncMock()
    db.execute = AsyncMock(side_effect=[MagicMock(scalar_one=MagicMock(return_value=40)), MagicMock(scalar_one=MagicMock(return_value=2))] * 4)

    async def _summary(_db, project):
        return {"open_violations": 0}

    async def _kpis(_db, project):
        return {
            "status": "on_track",
            "metrics": {"survival_pct": 80.0, "geo_tagged_pct": 70.0},
        }

    with (
        patch.object(
            district_rollup_module,
            "_load_accessible_projects",
            new=AsyncMock(return_value=projects),
        ),
        patch.object(
            district_rollup_module,
            "project_summary",
            new=AsyncMock(side_effect=_summary),
        ),
        patch.object(
            district_rollup_module,
            "compute_scheme_kpis",
            new=AsyncMock(side_effect=_kpis),
        ),
    ):
        result = await build_district_rollup(db, MagicMock(), group_by="district")

    assert result["report"] == "district_rollup"
    assert result["total"] == 2
    assert result["totals"]["project_count"] == 2
    assert result["totals"]["registered_trees"] == 80
    assert "campa_ca" in result["by_scheme"]
    assert result["items"][0]["district_name"] in {"Barmer", "Jaisalmer"}


@pytest.mark.asyncio
async def test_build_district_rollup_tracks_site_type():
    projects = [_project(site_type="school")]
    db = AsyncMock()
    db.execute = AsyncMock(side_effect=[MagicMock(scalar_one=MagicMock(return_value=10)), MagicMock(scalar_one=MagicMock(return_value=0))])

    with (
        patch.object(
            district_rollup_module,
            "_load_accessible_projects",
            new=AsyncMock(return_value=projects),
        ),
        patch.object(
            district_rollup_module,
            "project_summary",
            new=AsyncMock(return_value={"open_violations": 0}),
        ),
        patch.object(
            district_rollup_module,
            "compute_scheme_kpis",
            new=AsyncMock(return_value={"status": "on_track", "metrics": {}}),
        ),
    ):
        result = await build_district_rollup(db, MagicMock())

    assert result["items"][0]["by_site_type"]["school"] == 1
