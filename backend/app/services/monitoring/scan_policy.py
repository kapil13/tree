"""Scan scheduling policy — tiered intervals by program and scheme.

Satellite watch on work areas remains **manual opt-in** via project metadata
(`satellite_watch_enabled`) or the `estate_monitoring` scheme. This module only
defines how often registered targets are due for scanning once enrolled.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

ScanTargetType = Literal["tree", "work_area"]

# Days between optical NDVI scans
TREE_INTERVAL_BY_PROGRAM: dict[str, int] = {
    "byot": 7,
    "government_nhai": 3,
    "corporate_esg": 5,
    "ngo_community": 5,
}

DEFAULT_TREE_SCAN_INTERVAL_DAYS = 7

# Work areas with manual satellite watch enabled
WATCH_WORK_AREA_INTERVAL_DAYS = 7
ESTATE_MONITORING_WORK_AREA_INTERVAL_DAYS = 5

# Monthly SAR sweep skip windows (existing jobs)
MONTHLY_OPTICAL_SKIP_DAYS = 25
MONTHLY_SAR_SKIP_DAYS = 20
DAILY_WATCH_OPTICAL_SKIP_DAYS = 7


@dataclass(frozen=True)
class ScanPolicy:
    target_type: ScanTargetType
    interval_days: int
    tier: str
    program_code: str | None = None
    scheme_code: str | None = None


def tree_scan_policy(program_code: str | None) -> ScanPolicy:
    code = (program_code or "byot").lower()
    interval = TREE_INTERVAL_BY_PROGRAM.get(code, DEFAULT_TREE_SCAN_INTERVAL_DAYS)
    return ScanPolicy(
        target_type="tree",
        interval_days=interval,
        tier=code,
        program_code=code,
    )


def work_area_scan_policy(scheme_code: str | None, *, watch_enabled: bool) -> ScanPolicy | None:
    if not watch_enabled:
        return None
    if scheme_code == "estate_monitoring":
        return ScanPolicy(
            target_type="work_area",
            interval_days=ESTATE_MONITORING_WORK_AREA_INTERVAL_DAYS,
            tier="estate_monitoring",
            scheme_code=scheme_code,
        )
    return ScanPolicy(
        target_type="work_area",
        interval_days=WATCH_WORK_AREA_INTERVAL_DAYS,
        tier="satellite_watch",
        scheme_code=scheme_code,
    )
