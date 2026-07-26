"""CMS legal documents seed and update."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from app.services.auth.org_access import assert_user_may_authenticate
from app.services.cms.legal import LEGAL_PAGE_SLUGS, LEGAL_PAGES_DEFAULT
from app.services.cms.service import _legal_body_from_page, update_legal_document


def test_legal_slugs_cover_terms_privacy_data_use():
    assert set(LEGAL_PAGE_SLUGS) == {"terms", "privacy", "data-use"}
    assert {p["slug"] for p in LEGAL_PAGES_DEFAULT} == set(LEGAL_PAGE_SLUGS)


def test_legal_body_prefers_plain_body():
    section = SimpleNamespace(
        section_type="rich_text",
        sort_order=0,
        content={"body": "Hello terms", "html": "<p>ignored</p>"},
    )
    page = SimpleNamespace(sections=[section])
    assert _legal_body_from_page(page) == "Hello terms"


@pytest.mark.asyncio
async def test_update_legal_document_unknown_slug():
    with pytest.raises(ValueError, match="unknown_legal_slug"):
        await update_legal_document(AsyncMock(), "cookies", body="x")


@pytest.mark.asyncio
async def test_update_legal_document_writes_body(monkeypatch):
    page_id = uuid.uuid4()
    section = SimpleNamespace(
        section_type="rich_text",
        sort_order=0,
        title="Terms",
        content={"body": "old", "html": ""},
        enabled=True,
    )
    page = SimpleNamespace(
        id=page_id,
        slug="terms",
        title="Terms of Service",
        meta_description="meta",
        published=True,
        sections=[section],
        updated_at=None,
        updated_by_user_id=None,
    )

    async def fake_ensure(db):
        return None

    async def fake_get(db, slug):
        return page

    monkeypatch.setattr("app.services.cms.service.ensure_cms_seeded", fake_ensure)
    monkeypatch.setattr("app.services.cms.service.get_page_admin_by_slug", fake_get)

    db = AsyncMock()
    result = await update_legal_document(
        db,
        "terms",
        body="New terms body",
        title="Terms of Service v2",
        actor_user_id=uuid.uuid4(),
    )
    assert result["slug"] == "terms"
    assert result["title"] == "Terms of Service v2"
    assert section.content["body"] == "New terms body"
    assert db.flush.called


@pytest.mark.asyncio
async def test_assert_user_may_authenticate_blocks_suspended_org():
    user = SimpleNamespace(is_active=True, organization_id=uuid.uuid4())
    org = SimpleNamespace(is_active=False)
    db = AsyncMock()
    db.get = AsyncMock(return_value=org)

    with pytest.raises(HTTPException) as exc:
        await assert_user_may_authenticate(db, user)
    assert exc.value.detail == "organization_suspended"


@pytest.mark.asyncio
async def test_assert_user_may_authenticate_allows_active_org():
    user = SimpleNamespace(is_active=True, organization_id=uuid.uuid4())
    org = SimpleNamespace(is_active=True)
    db = AsyncMock()
    db.get = AsyncMock(return_value=org)
    await assert_user_may_authenticate(db, user)
