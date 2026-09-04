"""P0 audit security regressions — health probes and integrity backfill auth."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app


@pytest.mark.asyncio
async def test_integrations_health_requires_auth_in_production(monkeypatch):
    monkeypatch.setattr(settings, "app_env", "production")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/health/integrations")
    assert res.status_code == 401
    body = res.json()
    assert body["error"]["code"] == "missing_token"


@pytest.mark.asyncio
async def test_v1_integrations_health_requires_auth_in_production(monkeypatch):
    monkeypatch.setattr(settings, "app_env", "production")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/health/integrations")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_worker_health_requires_auth_in_production(monkeypatch):
    monkeypatch.setattr(settings, "app_env", "production")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/health/workers")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_v1_worker_health_requires_auth_in_production(monkeypatch):
    monkeypatch.setattr(settings, "app_env", "production")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/health/workers")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_integrations_health_allows_anonymous_in_development(monkeypatch):
    monkeypatch.setattr(settings, "app_env", "development")
    with patch(
        "app.services.intelligence.integrations.check_all_integrations",
        new_callable=AsyncMock,
        return_value={"status": "ok"},
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/health/integrations")
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_health_returns_503_when_redis_unavailable_in_production(monkeypatch):
    monkeypatch.setattr(settings, "app_env", "production")
    with (
        patch(
            "app.core.health_checks.ping_database",
            new_callable=AsyncMock,
            return_value="ok",
        ),
        patch(
            "app.core.health_checks.ping_redis",
            new_callable=AsyncMock,
            return_value="error",
        ),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/health")
    assert res.status_code == 503
    body = res.json()
    assert body["status"] == "error"
    assert body["redis"] == "error"


@pytest.mark.asyncio
async def test_backfill_integrity_fusion_rejects_org_member():
    from fastapi import HTTPException

    from app.api.v1.deps import require_org_admin

    user = MagicMock(
        role="ngo",
        organization_id=uuid.uuid4(),
        is_org_admin=False,
    )
    with pytest.raises(HTTPException) as exc:
        await require_org_admin(user)
    assert exc.value.status_code == 403
    assert exc.value.detail == "org_admin_required"


@pytest.mark.asyncio
async def test_backfill_integrity_fusion_scopes_org_admin():
    from app.api.v1.planting_projects import backfill_integrity_fusion_projects

    org_id = uuid.uuid4()
    user = MagicMock(
        role="ngo",
        organization_id=org_id,
        is_org_admin=True,
    )
    request = MagicMock()
    db = AsyncMock()

    with (
        patch(
            "app.services.integrity.project_refresh.backfill_integrity_fusion",
            new_callable=AsyncMock,
            return_value={"projects_processed": 0, "trees_refreshed": 0},
        ) as mock_backfill,
        patch("app.api.v1.planting_projects.record_audit", new_callable=AsyncMock),
    ):
        result = await backfill_integrity_fusion_projects(
            request=request,
            user=user,
            db=db,
            limit=10,
            async_=False,
        )

    mock_backfill.assert_awaited_once_with(db, limit_projects=10, organization_id=org_id)
    assert result["projects_processed"] == 0
