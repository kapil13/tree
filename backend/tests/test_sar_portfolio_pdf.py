"""Tests for SAR portfolio PDF report (Phase 4.6)."""

from __future__ import annotations

from app.services.reports.sar_portfolio_report import render_sar_portfolio_pdf


def test_render_sar_portfolio_pdf():
    ctx = {
        "summary": {
            "work_areas_tracked": 2,
            "sar_avg_forest_integrity": 62.5,
            "sar_at_risk_work_areas": 1,
            "sar_divergent_work_areas": 0,
            "sar_aligned_work_areas": 1,
            "sar_gap_fill_work_areas": 0,
            "stale_sar_work_areas": 0,
            "sar_live_providers": 2,
            "sar_stub_providers": 0,
        },
        "work_areas": [
            {
                "fence_name": "Pilot Block A",
                "sar_forest_integrity": 72,
                "sar_monitoring_mode": "aligned",
                "sar_provider": "sar-gee-sentinel1",
                "sar_stale": False,
                "sar_recommended_action": "Continue routine SAR monitoring.",
            },
            {
                "fence_name": "Highway KM 42",
                "sar_forest_integrity": 41,
                "sar_monitoring_mode": "optical_sar_divergent",
                "sar_provider": "sar-sentinel-hub-s1",
                "sar_stale": False,
                "sar_recommended_action": "Verify drainage on site.",
            },
        ],
    }
    pdf = render_sar_portfolio_pdf(ctx)
    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 2000
