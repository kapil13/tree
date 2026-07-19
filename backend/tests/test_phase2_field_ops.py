"""Tests for Phase 2 field ops templates and contractor work-area scoping."""

from __future__ import annotations

import uuid

from app.services.planting_projects.access import can_access_work_area
from app.services.planting_projects.templates import get_template


def test_industrial_template_has_allowed_species():
    tpl = get_template("industrial_greenbelt_v1")
    assert tpl is not None
    allowed = tpl["rules"].get("allowed_species")
    assert isinstance(allowed, list)
    assert "Neem" in allowed


def test_nhai_template_requires_pit_photo():
    tpl = get_template("nhai_highway_v1")
    assert tpl is not None
    assert tpl["rules"].get("require_pit_photo") is True


class _User:
    def __init__(self, role="field_worker", org_id=None, user_id=None):
        self.role = role
        self.organization_id = org_id
        self.id = user_id or uuid.uuid4()


class _Fence:
    def __init__(self, owner_id, org_id=None, fence_id=None):
        self.id = fence_id or uuid.uuid4()
        self.owner_user_id = owner_id
        self.organization_id = org_id


class _Member:
    def __init__(self, work_area_ids=None):
        self.work_area_ids = work_area_ids


def test_contractor_scoped_to_assigned_work_area():
    user = _User()
    fence_a = _Fence(owner_id=uuid.uuid4())
    fence_b = _Fence(owner_id=uuid.uuid4())
    membership = _Member(work_area_ids=[str(fence_a.id)])
    assert can_access_work_area(user, fence_a, membership)
    assert not can_access_work_area(user, fence_b, membership)
