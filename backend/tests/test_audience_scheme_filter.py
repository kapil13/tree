"""Tests for planting audience routing and scheme filtering."""

from __future__ import annotations

import pytest

from app.services.onboarding.audience import (
    AudienceError,
    normalize_audience,
    scheme_matches_audience,
)
from app.services.onboarding.audience_presets import get_audience_preset, list_audience_presets
from app.services.schemes.registry import get_scheme, list_schemes


def test_normalize_audience_accepts_known_codes():
    assert normalize_audience("mining") == "mining"
    assert normalize_audience("GENERAL") == "general"


def test_normalize_audience_rejects_unknown():
    with pytest.raises(AudienceError):
        normalize_audience("retail")


def test_list_schemes_filters_mining_audience():
    items = list_schemes(audience="mining")
    codes = {item["code"] for item in items}
    assert "mining_reclamation" in codes
    assert "green_credit_india" in codes
    assert "estate_monitoring" in codes
    assert "campa_ca" not in codes


def test_list_schemes_filters_government_audience():
    items = list_schemes(audience="government")
    codes = {item["code"] for item in items}
    assert "campa_ca" in codes
    assert "nhai_highway" in codes
    assert "nagar_van" in codes


def test_list_schemes_general_returns_full_catalog():
    all_items = list_schemes()
    general_items = list_schemes(audience="general")
    assert len(general_items) == len(all_items)


def test_scheme_matches_audience_uses_tags():
    mining_scheme = get_scheme("green_credit_india")
    govt_scheme = get_scheme("campa_ca")
    assert mining_scheme is not None
    assert govt_scheme is not None
    assert scheme_matches_audience(mining_scheme, "mining") is True
    assert scheme_matches_audience(govt_scheme, "government") is True
    assert scheme_matches_audience(govt_scheme, "mining") is False


def test_audience_presets_include_all_codes():
    presets = list_audience_presets()
    codes = {preset["code"] for preset in presets}
    assert codes == {"mining", "corporate_esg", "government", "international", "general"}
    mining = get_audience_preset("mining")
    assert mining is not None
    assert mining["recommended_template_code"] == "mining_reclamation_v1"
