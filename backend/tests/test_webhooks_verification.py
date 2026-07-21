"""Tests for webhooks and public verification."""

from __future__ import annotations

import json

from app.services.public_verification.builder import _snapshot_hash
from app.services.webhooks.events import WEBHOOK_EVENT_TYPES, audit_action_to_event
from app.services.webhooks.signer import dumps_payload, sign_payload


def test_audit_action_to_event_mapping():
    assert audit_action_to_event("tree.create") == "tree.registered"
    assert audit_action_to_event("mrv.export") == "project.mrv.exported"
    assert audit_action_to_event("unknown.action") is None


def test_webhook_event_catalog_includes_test():
    assert "webhook.test" in WEBHOOK_EVENT_TYPES


def test_sign_payload_deterministic_with_timestamp():
    body = dumps_payload({"hello": "world"})
    sig1, ts = sign_payload("secret-key", body, timestamp=1700000000)
    sig2, _ = sign_payload("secret-key", body, timestamp=1700000000)
    assert sig1 == sig2
    assert sig1.startswith("sha256=")


def test_snapshot_hash_stable():
    payload = {"a": 1, "b": {"c": 2}}
    assert _snapshot_hash(payload) == _snapshot_hash(payload)
    assert len(_snapshot_hash(payload)) == 64


def test_dumps_payload_sorted_keys():
    raw = dumps_payload({"z": 1, "a": 2})
    parsed = json.loads(raw)
    assert list(parsed.keys()) == ["a", "z"]
