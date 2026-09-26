"""Tests for Estate Watch Phase 7 auditor attestation."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.services.audit_attestation.review import _resolve_new_status


def test_resolve_new_status_uphold_open():
    anomaly = SimpleNamespace(status="open")
    assert _resolve_new_status(anomaly, "uphold") == "confirmed"


def test_resolve_new_status_overturn_confirmed():
    anomaly = SimpleNamespace(status="confirmed")
    assert _resolve_new_status(anomaly, "overturn") == "dismissed"


def test_resolve_new_status_overturn_dismissed():
    anomaly = SimpleNamespace(status="dismissed")
    assert _resolve_new_status(anomaly, "overturn") == "confirmed"


def test_resolve_new_status_defer():
    anomaly = SimpleNamespace(status="confirmed")
    assert _resolve_new_status(anomaly, "defer") == "open"


@pytest.mark.asyncio
async def test_sign_requires_export_ready():
    from app.services.audit_attestation.attest import sign_attestation

    engagement = SimpleNamespace(
        id="00000000-0000-0000-0000-000000000001",
        status="field_verified",
        metadata_={},
    )
    db = SimpleNamespace()

    with pytest.raises(ValueError, match="export_not_ready"):
        await sign_attestation(
            db,
            engagement,
            reviewer_id="00000000-0000-0000-0000-000000000002",
            verdict="approved",
            summary="Looks good",
        )


@pytest.mark.asyncio
async def test_review_requires_export_ready():
    from uuid import uuid4

    from app.services.audit_attestation.review import review_anomaly

    engagement = SimpleNamespace(
        id="00000000-0000-0000-0000-000000000001",
        status="risk_assessed",
        metadata_={},
    )
    db = SimpleNamespace()

    with pytest.raises(ValueError, match="export_not_ready"):
        await review_anomaly(
            db,
            engagement,
            anomaly_id=uuid4(),
            reviewer_id=uuid4(),
            disposition="uphold",
            rationale="Reviewed on site",
        )
