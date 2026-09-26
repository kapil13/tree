"""Field brief endpoint signature."""

from __future__ import annotations

import inspect

from app.api.v1 import planting_projects as planting_projects_api


def test_field_brief_route_exists():
    params = inspect.signature(planting_projects_api.field_brief).parameters
    assert "project_id" in params
