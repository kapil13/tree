"""Verifier role cannot write measurements."""

from __future__ import annotations

from app.core.security import Permission, Role, has_permission


def test_verifier_cannot_update_trees():
    assert not has_permission(Role.VERIFIER, Permission.TREE_UPDATE)


def test_verifier_can_attest():
    assert has_permission(Role.VERIFIER, Permission.MEASUREMENT_ATTEST)
    assert has_permission(Role.VERIFIER, Permission.MEASUREMENT_READ)


def test_field_worker_can_update_trees():
    assert has_permission(Role.FIELD_WORKER, Permission.TREE_UPDATE)
