"""Webhook event catalog and audit action mapping."""

from __future__ import annotations

WEBHOOK_EVENT_TYPES: tuple[str, ...] = (
    "tree.registered",
    "tree.updated",
    "compliance.violation.resolved",
    "project.mrv.exported",
    "project.evidence_bundle.generated",
    "project.framework_report.exported",
    "project.credit_ledger.updated",
    "compliance.checklist.updated",
    "webhook.test",
)

AUDIT_ACTION_EVENT_MAP: dict[str, str] = {
    "tree.create": "tree.registered",
    "tree.update": "tree.updated",
    "tree.regeotag": "tree.updated",
    "compliance.violation.resolve": "compliance.violation.resolved",
    "mrv.export": "project.mrv.exported",
    "evidence_bundle.generate": "project.evidence_bundle.generated",
    "framework_report.export": "project.framework_report.exported",
    "credit_ledger.sync": "project.credit_ledger.updated",
    "credit_ledger.transition": "project.credit_ledger.updated",
    "compliance.checklist.save": "compliance.checklist.updated",
}


def audit_action_to_event(action: str) -> str | None:
    return AUDIT_ACTION_EVENT_MAP.get(action)
