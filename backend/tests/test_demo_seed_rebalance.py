"""Demo seed portfolio rebalance."""

from __future__ import annotations

import inspect

from app.scripts import seed_demo


def test_seed_always_rebalances_portfolios():
    source = inspect.getsource(seed_demo.seed)
    assert "_rebalance_demo_portfolios" in source
    assert "Trees already exist, skipping" not in source


def test_rebalance_targets_distinct_portfolios():
    assert seed_demo.CITIZEN_TREE_TARGET == 12
    assert seed_demo.ORG_TREE_TARGET == 18
