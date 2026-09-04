"""Tests for district-scoped urban local body data."""

from __future__ import annotations

import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "app" / "services" / "india_admin" / "data"


def test_urban_local_bodies_cover_all_districts():
    bodies = json.loads((DATA_DIR / "urban_local_bodies.json").read_text(encoding="utf-8"))
    districts = json.loads((DATA_DIR / "districts.json").read_text(encoding="utf-8"))
    covered = {(b["state_code"], b["district_code"]) for b in bodies}
    expected = {(d["state_code"], d["code"]) for d in districts}
    assert covered == expected


def test_alwar_district_has_alwar_city_not_entire_state():
    bodies = json.loads((DATA_DIR / "urban_local_bodies.json").read_text(encoding="utf-8"))
    alwar = [b["name"] for b in bodies if b["state_code"] == "08" and b["district_code"] == "104"]
    assert "Alwar" in alwar
    assert "Jaipur" not in alwar
    assert "Jodhpur" not in alwar
    assert len(alwar) >= 5
