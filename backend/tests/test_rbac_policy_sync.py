"""RBAC policy pack stays identical across shared/, backend, frontend, and mobile."""

from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CANONICAL = REPO_ROOT / "shared" / "rbac-policy.json"
COPIES = [
    REPO_ROOT / "backend" / "app" / "core" / "rbac-policy.json",
    REPO_ROOT / "frontend" / "lib" / "rbac-policy.json",
    REPO_ROOT / "mobile" / "assets" / "rbac-policy.json",
]


def _load(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def test_rbac_policy_copies_match_canonical() -> None:
    canonical = _load(CANONICAL)
    for path in COPIES:
        assert path.is_file(), f"missing RBAC policy copy: {path}"
        assert _load(path) == canonical, f"RBAC policy drift: {path}"


def test_backend_rbac_policy_loader() -> None:
    from app.core.rbac_policy import field_worker_roles, professional_roles

    policy = _load(CANONICAL)
    assert professional_roles() == frozenset(policy["professional_roles"])
    assert field_worker_roles() == frozenset(policy["field_worker_roles"])
