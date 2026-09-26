"""Demo account should map to citizen / BYOT navigation."""

from __future__ import annotations

import inspect

from app.scripts import seed_demo
from app.services.auth.user_profile import user_has_professional_program


def test_demo_citizen_program_profile():
    codes = ["byot"]
    assert user_has_professional_program(codes) is False


def test_professional_program_still_detected():
    codes = ["byot", "government_nhai"]
    assert user_has_professional_program(codes) is True


def test_seed_demo_defines_rbac_demo_accounts():
    assert seed_demo.DEMO_VIEWER_EMAIL == "viewer@byot.earth"
    assert seed_demo.DEMO_VERIFIER_EMAIL == "verifier@byot.earth"
    assert seed_demo.DEMO_MANAGER_EMAIL == "manager@byot.earth"
    assert seed_demo.DEMO_FIELD_WORKER_EMAIL == "fieldworker@byot.earth"
    assert seed_demo.DEMO_SUPERVISOR_EMAIL == "supervisor@byot.earth"
    source = inspect.getsource(seed_demo._ensure_demo_viewer)
    assert 'org_role="viewer"' in source
    verifier_source = inspect.getsource(seed_demo._ensure_demo_verifier)
    assert 'role="verifier"' in verifier_source
    worker_source = inspect.getsource(seed_demo._ensure_demo_field_worker)
    assert 'role="field_worker"' in worker_source
    citizen_source = inspect.getsource(seed_demo._ensure_demo_user)
    assert "org=org" not in citizen_source
