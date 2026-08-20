"""Tests for HTTP error formatting."""

from __future__ import annotations

from app.core.http_errors import format_http_exception_detail


def test_compliance_errors_become_readable_message():
    detail = {
        "compliance_errors": [
            {
                "violation_type": "species_not_allowed",
                "severity": "block",
                "message": "Species 'Test' is not in the approved list for this work area.",
            }
        ],
        "mode": "strict",
    }
    code, message, extras = format_http_exception_detail(detail)
    assert code == "compliance_failed"
    assert "Species 'Test'" in message
    assert extras == detail


def test_validation_errors_become_readable_message():
    detail = {"validation_errors": ["missing_required:species_text", "invalid_date:planted_at"]}
    code, message, extras = format_http_exception_detail(detail)
    assert code == "validation_failed"
    assert "missing_required:species_text" in message
    assert extras == detail


def test_string_detail_unchanged():
    code, message, extras = format_http_exception_detail("unknown_program")
    assert code == "unknown_program"
    assert message == "Unknown program"
    assert extras is None
