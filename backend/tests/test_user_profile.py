"""Tests for user profile fields and age calculation."""

from datetime import date

import pytest
from pydantic import ValidationError

from app.schemas.auth import UpdateProfile
from app.services.auth.profile_helpers import age_from_date_of_birth


def test_age_from_date_of_birth():
    assert age_from_date_of_birth(date(2000, 1, 1), today=date(2026, 8, 22)) == 26
    assert age_from_date_of_birth(date(2000, 12, 31), today=date(2026, 1, 1)) == 25
    assert age_from_date_of_birth(None) is None


def test_update_profile_rejects_future_dob():
    with pytest.raises(ValidationError):
        UpdateProfile(date_of_birth=date(2099, 1, 1))


def test_update_profile_marriage_before_birth():
    with pytest.raises(ValidationError):
        UpdateProfile(
            date_of_birth=date(1990, 5, 1),
            date_of_marriage=date(1985, 1, 1),
        )
