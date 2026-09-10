"""Trees list registry category filter."""

from __future__ import annotations

import inspect

from app.api.v1 import trees as trees_api


def test_list_trees_accepts_category_parameter():
    params = inspect.signature(trees_api.list_trees).parameters
    assert "category" in params
