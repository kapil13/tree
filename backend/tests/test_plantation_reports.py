"""Tests for plantation operational reports."""

from __future__ import annotations

from app.services.reports.plantation_reports import (
    export_fy_wise,
    export_project_wise,
    export_regeotag,
    export_total_records,
    project_location_meta,
    render_table_pdf,
    render_table_xlsx,
)


def test_project_location_meta_empty():
    class P:
        metadata_ = {}

    loc = project_location_meta(P())  # type: ignore[arg-type]
    assert loc["financial_year"] == ""
    assert loc["state_name"] == ""


def test_project_location_meta_reads_nested():
    class P:
        metadata_ = {
            "location": {
                "financial_year": "2026-27",
                "state_code": "08",
                "state_name": "Rajasthan",
            }
        }

    loc = project_location_meta(P())  # type: ignore[arg-type]
    assert loc["financial_year"] == "2026-27"
    assert loc["state_name"] == "Rajasthan"


def test_render_table_xlsx_nonempty():
    data = render_table_xlsx(sheet_name="Test", headers=["A", "B"], rows=[["1", "2"]])
    assert len(data) > 100


def test_render_table_pdf_nonempty():
    data = render_table_pdf(title="Test", subtitle="Sub", headers=["A"], rows=[["1"]])
    assert data[:4] == b"%PDF"


def test_export_project_wise_pdf_and_xlsx():
    ctx = {
        "generated_at": "2026-08-31T00:00:00+00:00",
        "total": 1,
        "items": [
            {
                "project_code": "P1",
                "project_name": "Demo",
                "financial_year": "2026-27",
                "state_name": "Rajasthan",
                "district_name": "Barmer",
                "location": "Rajasthan · Barmer",
                "segment": "general",
                "scheme_code": "",
                "status": "active",
                "target_tree_count": 100,
                "registered_trees": 50,
                "progress_pct": 50,
                "survival_due": 2,
                "open_violations": 0,
            }
        ],
    }
    pdf, pdf_media, pdf_ext = export_project_wise(ctx, "pdf")
    xlsx, xlsx_media, xlsx_ext = export_project_wise(ctx, "xlsx")
    assert pdf_ext == "pdf" and pdf_media == "application/pdf"
    assert xlsx_ext == "xlsx" and "spreadsheet" in xlsx_media
    assert pdf[:4] == b"%PDF"
    assert len(xlsx) > 100


def test_export_fy_wise_and_regeotag_and_total():
    fy_ctx = {
        "generated_at": "t",
        "total": 1,
        "items": [
            {
                "financial_year": "2026-27",
                "project_count": 1,
                "target_trees": 10,
                "registered_trees": 5,
                "achievement_pct": 50,
                "survival_due": 0,
                "open_violations": 0,
            }
        ],
    }
    assert export_fy_wise(fy_ctx, "pdf")[2] == "pdf"
    re_ctx = {
        "generated_at": "t",
        "total": 1,
        "items": [
            {
                "public_code": "T1",
                "project_name": "P",
                "financial_year": "2026-27",
                "state_name": "Rajasthan",
                "district_name": "Barmer",
                "species": "Neem",
                "survival_status": "live",
                "last_geotag_at": "2026-01-01",
                "days_overdue": 3,
                "latitude": 25.1,
                "longitude": 71.2,
            }
        ],
    }
    assert export_regeotag(re_ctx, "xlsx")[2] == "xlsx"
    total_ctx = {
        "generated_at": "t",
        "total": 1,
        "items": [
            {
                "public_code": "T1",
                "species": "Neem",
                "health": "good",
                "survival_status": "live",
                "project_name": "P",
                "financial_year": "2026-27",
                "state_name": "Rajasthan",
                "district_name": "Barmer",
                "village_name": "V",
                "work_area_name": "WA",
                "latitude": 25.1,
                "longitude": 71.2,
                "carbon_kg": 1.2,
                "satellite_verified": True,
                "registered_at": "2026-01-01",
                "last_geotag_at": "2026-02-01",
            }
        ],
    }
    assert export_total_records(total_ctx, "pdf")[2] == "pdf"
