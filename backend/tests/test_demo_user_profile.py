"""Demo account should map to citizen / BYOT navigation."""

from __future__ import annotations

from app.services.auth.user_profile import user_has_professional_program


def test_demo_citizen_program_profile():
    codes = ["byot"]
    assert user_has_professional_program(codes) is False


def test_professional_program_still_detected():
    codes = ["byot", "government_nhai"]
    assert user_has_professional_program(codes) is True
