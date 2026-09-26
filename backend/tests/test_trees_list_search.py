"""Trees list search query parameter."""

from __future__ import annotations

import inspect

from app.api.v1 import trees as trees_api


def test_list_trees_accepts_search_parameter():
    params = inspect.signature(trees_api.list_trees).parameters
    assert "search" in params
