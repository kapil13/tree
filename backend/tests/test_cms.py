"""CMS service tests."""

from __future__ import annotations

from app.services.cms.defaults import HEADER_DEFAULT, SECTION_TYPES
from app.services.cms.service import slugify


def test_slugify():
    assert slugify("About Us") == "about-us"
    assert slugify("  Hello World!  ") == "hello-world"


def test_section_types_include_hero():
    assert "hero" in SECTION_TYPES
    assert "features" in SECTION_TYPES


def test_header_default_has_nav():
    assert len(HEADER_DEFAULT["nav"]) >= 3
