"""Tests for CMS custom planting templates."""

from __future__ import annotations

from app.services.planting_projects.rule_engine import (
    bootstrap_rules_from_clone,
    is_custom_template_code,
    sanitize_custom_rules,
    slugify_template_code,
)


def test_slugify_template_code_prefixes_custom() -> None:
    assert slugify_template_code("Acme CSR Greenbelt").startswith("custom_")
    assert "acme" in slugify_template_code("Acme CSR Greenbelt")


def test_is_custom_template_code() -> None:
    assert is_custom_template_code("custom_acme_v1")
    assert not is_custom_template_code("open_byot_v1")


def test_bootstrap_rules_from_clone_uses_open_byot_by_default() -> None:
    rules = bootstrap_rules_from_clone(None)
    assert "min_photos" in rules


def test_sanitize_custom_rules_keeps_known_keys_only() -> None:
    cleaned = sanitize_custom_rules({"min_photos": 2, "unknown_key": 99})
    assert cleaned["min_photos"] == 2
    assert "unknown_key" not in cleaned
