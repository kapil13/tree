"""TreeCreate validation."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas.tree import TreeCreate


def test_tree_create_requires_three_to_five_photos():
    base = {
        "species_text": "Neem",
        "latitude": 12.97,
        "longitude": 77.59,
    }
    TreeCreate(**base, photo_keys=["a", "b", "c"])
    TreeCreate(**base, photo_keys=["a", "b", "c", "d", "e"])

    with pytest.raises(ValidationError):
        TreeCreate(**base, photo_keys=["a", "b"])
    with pytest.raises(ValidationError):
        TreeCreate(**base, photo_keys=["a"] * 6)
