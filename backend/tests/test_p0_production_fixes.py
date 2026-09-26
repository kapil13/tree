"""P0 production readiness fixes — security, terminology, validation."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.bioacoustic.ops import create_recording
from app.services.evidence import signing
from app.services.storage.images import ImageUploadError, persist_image_bytes


@pytest.mark.asyncio
async def test_create_recording_rejects_inaccessible_fence(monkeypatch):
    user = MagicMock(id=uuid.uuid4(), role="user", organization_id=uuid.uuid4())
    fence_id = uuid.uuid4()
    monkeypatch.setattr(
        "app.services.planting_projects.access.load_work_area",
        AsyncMock(return_value=None),
    )
    db = AsyncMock()
    with pytest.raises(ValueError, match="fence_not_found"):
        await create_recording(
            db,
            user,
            s3_key=f"bioacoustic/{user.id}/test.webm",
            duration_seconds=90.0,
            latitude=17.0,
            longitude=78.0,
            plantation_fence_id=fence_id,
        )


def test_persist_rejects_non_image_magic_bytes():
    with pytest.raises(ImageUploadError, match="invalid_image_content"):
        persist_image_bytes(
            MagicMock(),
            user_id=uuid.uuid4(),
            filename="photo.jpg",
            content_type="image/jpeg",
            data=b"not-a-real-image",
        )


def test_signing_rejects_missing_key_in_hardened_env(monkeypatch):
    signing._private_key.cache_clear()
    monkeypatch.setattr(signing.settings, "evidence_signing_key", "")
    monkeypatch.setattr(signing, "is_hardened_env", lambda: True)
    with pytest.raises(RuntimeError, match="EVIDENCE_SIGNING_KEY"):
        signing._private_key()
    signing._private_key.cache_clear()


@pytest.mark.asyncio
async def test_credit_transition_issued_requires_admin():
    from httpx import ASGITransport, AsyncClient

    from app.api.v1.deps import require_write_access
    from app.main import app

    user = MagicMock()
    user.id = uuid.uuid4()
    user.role = "government"
    user.organization_id = uuid.uuid4()

    project_id = uuid.uuid4()
    project = MagicMock(id=project_id)

    async def _write_access():
        return user

    app.dependency_overrides[require_write_access] = _write_access

    with (
        patch(
            "app.api.v1.credits.load_project",
            new=AsyncMock(return_value=project),
        ),
        patch(
            "app.api.v1.credits.can_manage_project",
            new=AsyncMock(return_value=True),
        ),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                f"/api/v1/credits/projects/{project_id}/transition",
                json={"to_status": "issued", "registry_reference": "VCS-123"},
            )

    app.dependency_overrides.clear()
    assert response.status_code == 403
    payload = response.json()
    assert (payload.get("error") or {}).get("code") == "admin_only" or payload.get("detail") == "admin_only"


@pytest.mark.asyncio
async def test_update_project_requires_manage_permission():
    from httpx import ASGITransport, AsyncClient

    from app.api.v1.deps import require_write_access
    from app.main import app

    user = MagicMock()
    user.id = uuid.uuid4()
    user.role = "government"
    user.organization_id = uuid.uuid4()

    project_id = uuid.uuid4()
    project = MagicMock(id=project_id, code="TEST", metadata_=None)

    async def _write_access():
        return user

    app.dependency_overrides[require_write_access] = _write_access

    with (
        patch(
            "app.api.v1.planting_projects.load_project",
            new=AsyncMock(return_value=project),
        ),
        patch(
            "app.api.v1.planting_projects.can_manage_project",
            new=AsyncMock(return_value=False),
        ),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.patch(
                f"/api/v1/planting-projects/{project_id}",
                json={"name": "Renamed"},
            )

    app.dependency_overrides.clear()
    assert response.status_code == 403
    payload = response.json()
    assert (payload.get("error") or {}).get("code") == "forbidden" or payload.get("detail") == "forbidden"
