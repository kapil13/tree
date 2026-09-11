"""Tests for Estate Watch Phase 9 Sprint 5 — co-sign, public verify, webhooks."""

from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.services.audit_attestation.attest import (
    _combined_attestation_hash,
    _signature_hash,
    required_signatures,
)
from app.services.webhooks.events import WEBHOOK_EVENT_TYPES


def test_webhook_event_types_include_audit():
    assert "audit.export_ready" in WEBHOOK_EVENT_TYPES
    assert "audit.attested" in WEBHOOK_EVENT_TYPES
    assert "audit.reconciliation_mismatch" in WEBHOOK_EVENT_TYPES


def test_required_signatures_defaults_to_two():
    engagement = SimpleNamespace(metadata_={})
    assert required_signatures(engagement) == 2


def test_required_signatures_respects_metadata():
    engagement = SimpleNamespace(metadata_={"required_signatures": 3})
    assert required_signatures(engagement) == 3


def test_signature_hash_is_stable():
    engagement_id = uuid4()
    reviewer_id = uuid4()
    signed_at = datetime(2026, 1, 1, tzinfo=UTC)
    h1 = _signature_hash(
        engagement_id=engagement_id,
        export_sha="abc",
        verdict="approved",
        reviewer_id=reviewer_id,
        role="lead",
        summary="Lead summary",
        signed_at=signed_at,
    )
    h2 = _signature_hash(
        engagement_id=engagement_id,
        export_sha="abc",
        verdict="approved",
        reviewer_id=reviewer_id,
        role="lead",
        summary="Lead summary",
        signed_at=signed_at,
    )
    assert h1 == h2
    assert len(h1) == 64


def test_combined_attestation_hash_includes_all_signatures():
    engagement_id = uuid4()
    signed_at = datetime(2026, 1, 1, tzinfo=UTC)
    combined = _combined_attestation_hash(
        engagement_id=engagement_id,
        export_sha="export",
        verdict="conditional",
        summary="Summary",
        signature_hashes=["aaa", "bbb"],
        signed_at=signed_at,
    )
    assert len(combined) == 64
    assert combined != "aaa"


@pytest.mark.asyncio
async def test_resolve_audit_verification_rejects_invalid_digest():
    from app.services.public_verification.audit import resolve_audit_verification_by_digest

    db = SimpleNamespace()
    with pytest.raises(ValueError, match="invalid_digest"):
        await resolve_audit_verification_by_digest(db, "not-a-hash")
