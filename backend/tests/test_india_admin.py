"""Tests for India admin geography service."""

from __future__ import annotations

from app.services.india_admin.financial_years import current_financial_year, list_financial_years


def test_financial_years_include_current():
    years = list_financial_years(today=__import__("datetime").date(2026, 8, 30))
    assert current_financial_year(today=__import__("datetime").date(2026, 8, 30)) == "2026-27"
    assert "2026-27" in years
    assert "2025-26" in years
