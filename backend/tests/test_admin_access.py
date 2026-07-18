"""Tests for platform admin access helpers."""

from types import SimpleNamespace

from app.core.access import is_platform_admin, is_superadmin
from app.services.admin.modules import role_can_access_module


class _Rule:
    def __init__(self, enabled: bool, allowed_roles: list[str]):
        self.enabled = enabled
        self.allowed_roles = allowed_roles


def test_is_platform_admin():
    assert is_platform_admin(SimpleNamespace(role="admin"))
    assert is_platform_admin(SimpleNamespace(role="superadmin"))
    assert not is_platform_admin(SimpleNamespace(role="user"))
    assert not is_platform_admin(None)


def test_is_superadmin():
    assert is_superadmin(SimpleNamespace(role="superadmin"))
    assert not is_superadmin(SimpleNamespace(role="admin"))


def test_role_can_access_module():
    rule = _Rule(True, ["ngo", "corporate"])
    assert role_can_access_module("ngo", rule)
    assert role_can_access_module("admin", rule)
    assert not role_can_access_module("user", rule)
    disabled = _Rule(False, ["user"])
    assert not role_can_access_module("user", disabled)
