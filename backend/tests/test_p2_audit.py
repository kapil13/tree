"""P2 audit regressions — extended feature gating, route guards, security docs."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.api.v1.deps import require_ai_scan_feature, require_satellite_feature


@pytest.mark.asyncio
async def test_require_satellite_feature_blocks_disabled_org():
    org_id = uuid.uuid4()
    user = MagicMock(role="user", organization_id=org_id)
    org = MagicMock(metadata_={"feature_flags": {"satellite": False}})
    db = AsyncMock()
    db.get = AsyncMock(return_value=org)

    with pytest.raises(HTTPException) as exc:
        await require_satellite_feature(user, db)
    assert exc.value.detail == "org_feature_disabled:satellite"


@pytest.mark.asyncio
async def test_require_ai_scan_feature_blocks_disabled_org():
    org_id = uuid.uuid4()
    user = MagicMock(role="user", organization_id=org_id)
    org = MagicMock(metadata_={"feature_flags": {"ai_scan": False}})
    db = AsyncMock()
    db.get = AsyncMock(return_value=org)

    with pytest.raises(HTTPException) as exc:
        await require_ai_scan_feature(user, db)
    assert exc.value.detail == "org_feature_disabled:ai_scan"


@pytest.mark.asyncio
async def test_intelligence_router_requires_satellite_feature():
    from app.api.v1.intelligence import router

    dep_callables = []
    for route in router.routes:
        for dep in getattr(route, "dependencies", []):
            dep_callables.append(dep.dependency)

    assert any(
        getattr(fn, "__name__", "") == "require_satellite_feature" for fn in dep_callables
    )


def test_security_txt_is_present():
    from pathlib import Path

    path = Path(__file__).resolve().parents[2] / "frontend/public/.well-known/security.txt"
    text = path.read_text(encoding="utf-8")
    assert "Contact:" in text
    assert "security@aranyix.tech" in text


def test_incident_response_doc_exists():
    from pathlib import Path

    path = Path(__file__).resolve().parents[2] / "docs/incident-response.md"
    text = path.read_text(encoding="utf-8")
    assert "SEV-1" in text
    assert "maintenance mode" in text.lower()
