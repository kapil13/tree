"""Focused contract tests for the immutable Estate Watch audit kernel."""

from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.services.audit_governance.mutability import (
    assert_cycle_can_attest,
    assert_cycle_can_edit,
    assert_cycle_is_attested,
)


def cycle(status: str):
    return SimpleNamespace(id=uuid4(), status=status, opened_at=datetime.now(UTC))


def test_attested_cycle_is_immutable():
    with pytest.raises(ValueError, match="audit_cycle_closed"):
        assert_cycle_can_edit(cycle("attested"))


def test_only_under_review_cycle_can_attest():
    assert assert_cycle_can_attest(cycle("under_review")).status == "under_review"
    with pytest.raises(ValueError, match="audit_cycle_not_ready_for_attestation"):
        assert_cycle_can_attest(cycle("export_ready"))


def test_attestation_guard_requires_attested_cycle():
    assert assert_cycle_is_attested(cycle("attested")).status == "attested"
    with pytest.raises(ValueError, match="audit_cycle_not_attested"):
        assert_cycle_is_attested(cycle("superseded"))


def test_audit_cycle_model_has_required_constraints():
    from app.models.audit_cycle import AuditCycle

    names = {constraint.name for constraint in AuditCycle.__table__.constraints}
    assert "audit_cycles_engagement_number_uq" in names
    assert "parent_cycle_id" in AuditCycle.__table__.c


def test_audit_run_model_is_cycle_scoped():
    from app.models.audit_run import AuditRun

    assert AuditRun.__table__.c.cycle_id.foreign_keys
    assert "parameters" in AuditRun.__table__.c
