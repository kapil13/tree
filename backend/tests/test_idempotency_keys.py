"""Idempotency-Key header support."""

from __future__ import annotations

from app.services.idempotency.keys import payload_fingerprint


def test_payload_fingerprint_stable():
    a = payload_fingerprint({"sku": "scan_10", "user_id": "abc"})
    b = payload_fingerprint({"user_id": "abc", "sku": "scan_10"})
    assert a == b


def test_payload_fingerprint_differs():
    a = payload_fingerprint({"sku": "scan_10"})
    b = payload_fingerprint({"sku": "scan_25"})
    assert a != b
