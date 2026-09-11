"""Tests for Estate Watch Phase 5 field sampling."""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

import pytest
from sqlalchemy import column, func, select

from app.services.audit_sampling.stratify import plots_for_risk_level, stratified_plot_counts
from app.services.geo import geography_as_geometry, geography_point_xy


def test_plots_for_risk_level_defaults():
    assert plots_for_risk_level("critical") == 3
    assert plots_for_risk_level("high") == 2
    assert plots_for_risk_level("medium") == 1
    assert plots_for_risk_level("low") == 0


def test_stratified_plot_counts_skips_low_risk():
    queue = [
        {"boundary_version_id": "a", "risk_level": "critical", "priority_rank": 1},
        {"boundary_version_id": "b", "risk_level": "low", "priority_rank": 2},
        {"boundary_version_id": "c", "risk_level": "high", "priority_rank": 3},
    ]
    result = stratified_plot_counts(queue)
    assert len(result) == 2
    assert result[0]["plot_count"] == 3
    assert result[1]["plot_count"] == 2


def test_stratified_custom_rates():
    queue = [{"boundary_version_id": "a", "risk_level": "medium", "priority_rank": 1}]
    result = stratified_plot_counts(queue, plots_per_medium=2)
    assert result[0]["plot_count"] == 2


def test_geography_point_xy_casts_to_geometry():
    center = column("center")
    lon_expr, lat_expr = geography_point_xy(center)
    stmt = select(lon_expr.label("lon"), lat_expr.label("lat"))
    sql = str(stmt.compile(compile_kwargs={"literal_binds": True}))
    assert "ST_X" in sql
    assert "ST_Y" in sql
    assert "CAST" in sql.upper() or "cast" in sql


def test_geography_as_geometry_wraps_column():
    center = column("center")
    geom = geography_as_geometry(center)
    assert geom is not None
    assert func.ST_Contains(geom, func.ST_MakePoint(1, 2)) is not None


@pytest.mark.asyncio
async def test_generate_requires_risk_assessed():
    from app.services.audit_sampling.plan import generate_sampling_plan

    engagement = SimpleNamespace(
        id="00000000-0000-0000-0000-000000000001",
        status="confidence_mapped",
        metadata_={},
    )
    db = SimpleNamespace()

    with pytest.raises(ValueError, match="risk_not_assessed"):
        await generate_sampling_plan(db, engagement)


@pytest.mark.asyncio
async def test_point_in_boundary_falls_back_to_point_on_surface(monkeypatch):
    from app.services.audit_sampling.plan import _point_in_boundary

    boundary_id = uuid4()
    calls: list[str] = []

    async def fake_execute(stmt):
        sql = str(stmt)
        mock = SimpleNamespace()
        if "ST_XMin" in sql:
            calls.append("bbox")
            mock.one = lambda: SimpleNamespace(xmin=77.0, xmax=77.01, ymin=28.0, ymax=28.01)
        elif "ST_Contains" in sql:
            calls.append("contains")
            mock.scalar_one = lambda: False
        elif "ST_PointOnSurface" in sql:
            calls.append("surface")
            mock.one_or_none = lambda: SimpleNamespace(lon=77.005, lat=28.005)
        else:
            mock.scalar_one = lambda: False
            mock.one_or_none = lambda: None
        return mock

    db = SimpleNamespace(execute=fake_execute)
    import random

    coords = await _point_in_boundary(db, boundary_id, random.Random(42))

    assert coords == (77.005, 28.005)
    assert "surface" in calls


@pytest.mark.asyncio
async def test_record_visit_requires_sampling_planned():
    from app.services.audit_sampling.visits import record_field_visit

    engagement = SimpleNamespace(
        id="00000000-0000-0000-0000-000000000001",
        status="risk_assessed",
        metadata_={},
    )
    db = SimpleNamespace()

    with pytest.raises(ValueError, match="sampling_not_planned"):
        await record_field_visit(
            db,
            engagement=engagement,
            plot_id=uuid4(),
            visitor_id=uuid4(),
            tree_presence="present",
            photo_keys=["images/test/photo.jpg"],
            visitor_lat=28.0,
            visitor_lon=77.0,
        )


def test_field_visit_create_requires_photo():
    from pydantic import ValidationError

    from app.schemas.audit_sampling import FieldVisitCreate

    with pytest.raises(ValidationError):
        FieldVisitCreate(
            tree_presence="present",
            photo_keys=[],
            visitor_lat=28.0,
            visitor_lon=77.0,
        )


def test_field_visit_create_accepts_evidence_payload():
    from app.schemas.audit_sampling import FieldVisitCreate

    body = FieldVisitCreate(
        tree_presence="absent",
        photo_keys=["images/user-id/plot.jpg"],
        visitor_lat=28.6129,
        visitor_lon=77.2295,
        trees_observed=0,
        verification_outcome="claim_unsupported",
    )
    assert body.tree_presence == "absent"
    assert body.photo_keys == ["images/user-id/plot.jpg"]
