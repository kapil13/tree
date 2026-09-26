"""Verification sample list endpoint."""

from __future__ import annotations

import inspect

from app.api.v1 import verification_workflow as verification_api


def test_list_verification_samples_route_exists():
    params = inspect.signature(verification_api.list_verification_samples).parameters
    assert "pending_only" in params
