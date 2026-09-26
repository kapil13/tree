"""Indian financial year (April–March) options."""

from __future__ import annotations

from datetime import date


def current_financial_year(*, today: date | None = None) -> str:
    ref = today or date.today()
    start_year = ref.year if ref.month >= 4 else ref.year - 1
    end_short = (start_year + 1) % 100
    return f"{start_year}-{end_short:02d}"


def list_financial_years(*, today: date | None = None, past: int = 3, future: int = 2) -> list[str]:
    ref = today or date.today()
    current_start = ref.year if ref.month >= 4 else ref.year - 1
    years: list[str] = []
    for offset in range(-past, future + 1):
        start = current_start + offset
        years.append(f"{start}-{(start + 1) % 100:02d}")
    return years
