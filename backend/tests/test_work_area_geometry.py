"""Tests for work area geometry updates."""

import pytest
from pydantic import ValidationError

from app.schemas.planting_project import GeoJsonLineString, GeoJsonPolygon, WorkAreaUpdate
from app.services.planting_projects.work_area_geometry import resolve_work_area_geometry_update


def _square_polygon():
    return GeoJsonPolygon(
        type="Polygon",
        coordinates=[[[77.0, 12.0], [77.01, 12.0], [77.01, 12.01], [77.0, 12.01], [77.0, 12.0]]],
    )


def test_resolve_work_area_geometry_update_polygon():
    payload = WorkAreaUpdate(boundary=_square_polygon())
    wkt, meta = resolve_work_area_geometry_update("polygon", payload)
    assert wkt.startswith("POLYGON")
    assert meta == {}


def test_resolve_work_area_geometry_update_corridor():
    payload = WorkAreaUpdate(
        centerline=GeoJsonLineString(
            type="LineString",
            coordinates=[[77.0, 12.0], [77.01, 12.01]],
        ),
        buffer_m=10,
    )
    wkt, meta = resolve_work_area_geometry_update("corridor", payload)
    assert wkt.startswith("POLYGON")
    assert meta["source_geometry"]["type"] == "LineString"


def test_resolve_work_area_geometry_update_none_when_metadata_only():
    assert resolve_work_area_geometry_update("polygon", WorkAreaUpdate(name="Renamed")) is None


def test_work_area_update_accepts_geometry_fields():
    payload = WorkAreaUpdate(
        geometry_type="polygon",
        boundary=_square_polygon(),
        name="Updated block",
    )
    assert payload.name == "Updated block"
    assert payload.geometry_type == "polygon"
