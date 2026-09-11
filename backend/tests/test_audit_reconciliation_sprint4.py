"""Tests for Sprint 4 reconciliation API and export readiness."""

from __future__ import annotations

from app.services.audit_export.pdf import render_audit_engagement_pdf
from app.services.audit_export.reconciliation import _grades_aligned


def test_grades_aligned_exact_and_adjacent():
    assert _grades_aligned("green", "green") is True
    assert _grades_aligned("green", "amber") is True
    assert _grades_aligned("green", "red") is False


def test_render_pdf_includes_reconciliation_section():
    pdf = render_audit_engagement_pdf(
        {
            "epistemic_disclaimer": "Test",
            "project": {"name": "Demo", "code": "D1"},
            "engagement": {"status": "field_verified"},
            "confidence": {"grade_counts": {"green": 1}},
            "reconciliation": {
                "aligned_count": 1,
                "mismatch_count": 0,
                "no_field_data_count": 0,
                "block_count": 1,
                "blocks": [
                    {
                        "boundary_name": "North",
                        "confidence_grade": "green",
                        "field_grade": "green",
                        "visit_count": 2,
                        "reconciliation": "aligned",
                    }
                ],
            },
            "risk": {"queue": {"queue": []}},
            "sampling": {"visit_stats": {"visited": 1, "total": 1}, "plots": []},
            "satellite": {"block_count": 1, "t0_baselines_found": 1},
        }
    )
    assert pdf.startswith(b"%PDF")
