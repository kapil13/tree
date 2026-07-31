"""Load shared RBAC policy (role sets) from bundled JSON."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

_POLICY_PATH = Path(__file__).with_name("rbac-policy.json")


@lru_cache(maxsize=1)
def load_rbac_policy() -> dict:
    with _POLICY_PATH.open(encoding="utf-8") as f:
        return json.load(f)


def professional_roles() -> frozenset[str]:
    return frozenset(load_rbac_policy()["professional_roles"])


def field_worker_roles() -> frozenset[str]:
    return frozenset(load_rbac_policy()["field_worker_roles"])
