"""Tests for passport generator (QR + PDF)."""

from __future__ import annotations

from app.services.passport import generate_passport_pdf, generate_qr_png


def test_qr_png_is_png_bytes():
    png = generate_qr_png("https://byot.earth/p/BYOT-TEST-0001")
    assert png[:8] == b"\x89PNG\r\n\x1a\n"
    assert len(png) > 200


def test_passport_pdf_has_pdf_header():
    pdf = generate_passport_pdf(
        {
            "public_code": "BYOT-TEST-0001",
            "species": "Neem",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "planted_at": "2024-06-15",
            "health": "healthy",
            "carbon_kg": 42.5,
            "satellite_verified": True,
            "qr_url": "https://byot.earth/p/BYOT-TEST-0001",
        }
    )
    assert pdf[:4] == b"%PDF"
    assert len(pdf) > 1500
