"""Tests for extended plantation operational reports."""

from __future__ import annotations

from app.services.reports.plantation_extended_reports import (
    _health_score,
    _survival_bucket,
    export_carbon_stock,
    export_species_wise,
)


def test_health_score_mapping():
    assert _health_score("good") == 3.0
    assert _health_score("unknown") == 0.0


def test_survival_bucket_mapping():
    assert _survival_bucket("live") == "live"
    assert _survival_bucket("dead") == "dead"
    assert _survival_bucket("healthy") == "live"


def test_export_species_wise_pdf():
    ctx = {
        "generated_at": "2026-08-31T00:00:00+00:00",
        "total": 1,
        "items": [
            {
                "species": "Neem",
                "count": 10,
                "pct_of_total": 100.0,
                "avg_health_score": 2.5,
                "total_carbon_kg": 120.0,
                "total_co2e_t": 0.44,
            }
        ],
    }
    pdf, media, ext = export_species_wise(ctx, "pdf")
    assert ext == "pdf" and pdf[:4] == b"%PDF"
    assert media == "application/pdf"


def test_export_carbon_stock_xlsx():
    ctx = {
        "generated_at": "2026-08-31T00:00:00+00:00",
        "total": 1,
        "items": [
            {
                "label": "Demo project",
                "project_code": "P1",
                "financial_year": "2026-27",
                "state_name": "Rajasthan",
                "tree_count": 5,
                "total_tco2e": 1.2,
                "uncertainty_pct": 15,
                "tco2e_low": 1.0,
                "tco2e_high": 1.4,
            }
        ],
    }
    data, media, ext = export_carbon_stock(ctx, "xlsx")
    assert ext == "xlsx"
    assert len(data) > 100
    assert "spreadsheet" in media
