"""Platform module access tests."""

from __future__ import annotations

from app.core.security import Permission, has_permission, permissions_for_role
from app.services.platform.modules import WEBSITE_CMS_MODULE


def test_admin_has_cms_and_users_permissions():
    perms = permissions_for_role("admin")
    assert Permission.CMS_MANAGE.value in perms
    assert Permission.PLATFORM_USERS_MANAGE.value in perms
    assert has_permission("admin", Permission.CMS_MANAGE)


def test_farmer_lacks_platform_permissions():
    assert not has_permission("farmer", Permission.CMS_MANAGE)
    assert not has_permission("farmer", Permission.PLATFORM_USERS_MANAGE)


def test_website_cms_module_key():
    assert WEBSITE_CMS_MODULE == "website_cms"
