"""Server-side finality rules shared by Estate Watch audit operations."""

from __future__ import annotations

from app.models.audit_cycle import AuditCycle


def assert_cycle_exists(cycle: AuditCycle | None) -> AuditCycle:
    if cycle is None:
        raise ValueError("audit_cycle_not_found")
    return cycle


def assert_cycle_open(cycle: AuditCycle | None) -> AuditCycle:
    cycle = assert_cycle_exists(cycle)
    if cycle.status in {"attested", "superseded", "cancelled"}:
        raise ValueError("audit_cycle_closed")
    return cycle


def assert_cycle_can_edit(cycle: AuditCycle | None) -> AuditCycle:
    return assert_cycle_open(cycle)


def assert_cycle_can_analyze(cycle: AuditCycle | None) -> AuditCycle:
    cycle = assert_cycle_open(cycle)
    if cycle.status not in {"draft", "analysis_ready", "risk_assessed", "sampling_planned", "field_verification"}:
        raise ValueError("audit_cycle_not_analyzable")
    return cycle


def assert_cycle_can_attest(cycle: AuditCycle | None) -> AuditCycle:
    cycle = assert_cycle_open(cycle)
    if cycle.status != "under_review":
        raise ValueError("audit_cycle_not_ready_for_attestation")
    return cycle


def assert_cycle_is_attested(cycle: AuditCycle | None) -> AuditCycle:
    cycle = assert_cycle_exists(cycle)
    if cycle.status != "attested":
        raise ValueError("audit_cycle_not_attested")
    return cycle
