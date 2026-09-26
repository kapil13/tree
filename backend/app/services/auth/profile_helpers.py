"""User profile helpers — age from date of birth."""

from __future__ import annotations

from datetime import date


def age_from_date_of_birth(dob: date | None, *, today: date | None = None) -> int | None:
    if dob is None:
        return None
    ref = today or date.today()
    years = ref.year - dob.year
    if (ref.month, ref.day) < (dob.month, dob.day):
        years -= 1
    return max(0, years)
