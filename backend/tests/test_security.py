"""Tests for JWT + password + RBAC."""

from __future__ import annotations

import pytest

from app.core.security import (
    Permission,
    Role,
    create_access_token,
    decode_token,
    has_permission,
    hash_password,
    verify_password,
)


def test_password_hash_roundtrip():
    h = hash_password("CorrectHorseBattery123!")
    assert verify_password("CorrectHorseBattery123!", h)
    assert not verify_password("wrong", h)


def test_jwt_roundtrip():
    token = create_access_token("00000000-0000-0000-0000-000000000001", role="farmer")
    data = decode_token(token)
    assert data["sub"] == "00000000-0000-0000-0000-000000000001"
    assert data["role"] == "farmer"
    assert data["type"] == "access"


def test_jwt_invalid():
    with pytest.raises(ValueError):
        decode_token("not-a-jwt")


def test_rbac_user_cannot_delete_trees():
    assert not has_permission(Role.USER, Permission.TREE_DELETE)
    assert has_permission(Role.NGO, Permission.TREE_DELETE)
    assert has_permission(Role.ADMIN, Permission.TREE_DELETE)
    assert has_permission(Role.ADMIN, Permission.SATELLITE_TRIGGER)
