"""Tests for STAC catalog and OGC Features."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.stac.catalog import build_project_stac_items, build_stac_catalog


def _org():
    org = MagicMock()
    org.id = uuid.uuid4()
    org.name = "Demo"
    org.slug = "demo"
    return org


def _project():
    p = MagicMock()
    p.id = uuid.uuid4()
    p.code = "P1"
    p.name = "Project"
    return p


@pytest.mark.asyncio
async def test_build_stac_catalog_links():
    org = _org()
    db = AsyncMock()
    projects_result = MagicMock()
    projects_result.scalars.return_value.all.return_value = []
    db.execute = AsyncMock(return_value=projects_result)

    cat = await build_stac_catalog(db, organization=org, api_base="http://localhost:8000/api/v1")
    assert cat["type"] == "Catalog"
    assert cat["stac_version"] == "1.0.0"
    assert any(link["rel"] == "self" for link in cat["links"])


@pytest.mark.asyncio
async def test_build_project_stac_items_empty():
    project = _project()
    db = AsyncMock()
    fences_result = MagicMock()
    fences_result.scalars.return_value.all.return_value = []
    db.execute = AsyncMock(return_value=fences_result)

    fc = await build_project_stac_items(db, project=project, api_base="http://localhost:8000/api/v1")
    assert fc["type"] == "FeatureCollection"
    assert fc["features"] == []
