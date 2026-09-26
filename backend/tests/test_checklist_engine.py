"""Tests for CMS checklist override engine."""

from __future__ import annotations

from app.services.compliance.checklist_engine import (
    merge_checklist_items,
    validate_checklist_override,
)
from app.services.compliance.checklists import get_checklist


def test_merge_checklist_items_applies_question_override() -> None:
    base = get_checklist("esg_general")
    assert base is not None
    item = base.items[0]
    merged = merge_checklist_items(
        base.items,
        {item.id: {"question": "Custom audit question?", "guidance": "Updated guidance."}},
    )
    assert merged[0]["question"] == "Custom audit question?"
    assert merged[0]["guidance"] == "Updated guidance."
    assert merged[0]["id"] == item.id


def test_validate_checklist_override_rejects_empty_question() -> None:
    errors = validate_checklist_override({"item_1": {"question": "   "}})
    assert any("cannot be empty" in e for e in errors)


def test_validate_checklist_override_requires_object_values() -> None:
    errors = validate_checklist_override({"item_1": "bad"})
    assert any("must be an object" in e for e in errors)
