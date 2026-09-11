"""Tests for Sprint 2 field verification export pack."""

from __future__ import annotations

from app.services.audit_export.field_map_pdf import render_field_verification_map_pdf
from app.services.audit_sampling.stratify import area_coverage_plot_count


def test_area_coverage_plot_count():
    assert area_coverage_plot_count(100.0, ha_per_plot=50.0, min_plots_per_block=1) == 2
    assert area_coverage_plot_count(None, ha_per_plot=50.0, min_plots_per_block=1) == 1
    assert area_coverage_plot_count(1000.0, ha_per_plot=50.0, min_plots_per_block=1) == 20


def test_field_verification_map_pdf():
    pdf = render_field_verification_map_pdf(
        [
            {
                "plot_code": "BLOCK-P01",
                "block_name": "North",
                "status": "visited",
                "plot_lat": 28.61,
                "plot_lon": 77.22,
                "tree_presence": "present",
                "verification_outcome": "claim_supported",
                "inside_boundary": True,
                "photo_count": 2,
            }
        ]
    )
    assert pdf.startswith(b"%PDF")
