"""Estate Watch P1 — audit finality, policy, and verification snapshots."""

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
from app.services.audit_governance.mutability import assert_cycle_can_edit
from app.services.audit_governance.policy import (
    assert_policy_allows_attestation,
    evaluate_attestation_policy,
)
from app.services.audit_governance.snapshots import snapshot_hash


def cycle(status: str, cycle_id=None):
    return SimpleNamespace(
        id=cycle_id or uuid4(),
        status=status,
        cycle_number=1,
        opened_at=datetime.now(UTC),
    )


def engagement(status: str = "export_ready", export_sha: str = "abc123"):
    return SimpleNamespace(
        id=uuid4(),
        status=status,
        metadata_={"export_bundle_sha256": export_sha},
        project_id=uuid4(),
        organization_id=uuid4(),
    )


def test_required_signatures_defaults_to_one():
    assert required_signatures(engagement()) == 1


def test_attested_cycle_is_immutable():
    with pytest.raises(ValueError, match="audit_cycle_closed"):
        assert_cycle_can_edit(cycle("attested"))


@pytest.mark.asyncio
async def test_policy_blocks_pending_reviews(monkeypatch):
    db = SimpleNamespace()

    async def fake_queue(*_args, **_kwargs):
        return {"pending_review_count": 2, "items": [], "anomaly_count": 2}

    monkeypatch.setattr(
        "app.services.audit_governance.policy.anomaly_review_queue",
        fake_queue,
    )
    evaluation = await evaluate_attestation_policy(
        db,
        engagement("export_ready"),
        cycle("export_ready"),
        persist=False,
    )
    assert evaluation["result"] == "blocked"
    assert "pending_anomaly_reviews" in evaluation["blocking_items"]
    with pytest.raises(ValueError, match="pending_anomaly_reviews"):
        assert_policy_allows_attestation(evaluation)


@pytest.mark.asyncio
async def test_policy_passes_when_ready(monkeypatch):
    db = SimpleNamespace()

    async def fake_queue(*_args, **_kwargs):
        return {"pending_review_count": 0, "items": [], "anomaly_count": 0}

    monkeypatch.setattr(
        "app.services.audit_governance.policy.anomaly_review_queue",
        fake_queue,
    )
    evaluation = await evaluate_attestation_policy(
        db,
        engagement("export_ready"),
        cycle("export_ready"),
        persist=False,
    )
    assert evaluation["result"] == "pass"
    assert_policy_allows_attestation(evaluation)


def test_signature_hash_includes_cycle_id():
    engagement_id = uuid4()
    cycle_id = uuid4()
    reviewer_id = uuid4()
    signed_at = datetime(2026, 1, 1, tzinfo=UTC)
    h1 = _signature_hash(
        engagement_id=engagement_id,
        cycle_id=cycle_id,
        export_sha="export",
        verdict="approved",
        reviewer_id=reviewer_id,
        role="lead",
        summary="Summary",
        signed_at=signed_at,
    )
    h2 = _signature_hash(
        engagement_id=engagement_id,
        cycle_id=uuid4(),
        export_sha="export",
        verdict="approved",
        reviewer_id=reviewer_id,
        role="lead",
        summary="Summary",
        signed_at=signed_at,
    )
    assert h1 != h2


def test_combined_attestation_hash_includes_cycle_id():
    engagement_id = uuid4()
    signed_at = datetime(2026, 1, 1, tzinfo=UTC)
    combined = _combined_attestation_hash(
        engagement_id=engagement_id,
        cycle_id=uuid4(),
        export_sha="export",
        verdict="approved",
        summary="Summary",
        signature_hashes=["aaa"],
        signed_at=signed_at,
    )
    assert len(combined) == 64


def test_snapshot_hash_is_stable():
    payload = {"cycle": {"id": "x"}, "attestation": {"verdict": "approved"}}
    assert snapshot_hash(payload) == snapshot_hash(payload)
