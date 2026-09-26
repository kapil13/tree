"""Build district-scoped urban local body JSON from LGD municipal directory.

Usage:
    python -m app.scripts.build_urban_local_bodies
"""

from __future__ import annotations

import csv
import json
import urllib.request
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "services" / "india_admin" / "data"
MUNICIPAL_CSV_URL = (
    "https://raw.githubusercontent.com/planemad/india-local-government-directory/"
    "master/municipal-directory.csv"
)


def _norm(value: str) -> str:
    return " ".join(value.upper().split())


def build_urban_local_bodies() -> list[dict[str, str]]:
    states = json.loads((DATA_DIR / "states.json").read_text(encoding="utf-8"))
    districts = json.loads((DATA_DIR / "districts.json").read_text(encoding="utf-8"))
    cities = json.loads((DATA_DIR / "cities.json").read_text(encoding="utf-8"))

    state_by_name = {s["name"].upper(): s["code"] for s in states}
    district_by_key = {(d["state_code"], d["name"].upper()): d["code"] for d in districts}
    entries: dict[tuple[str, str, str], dict[str, str]] = {}

    def add(state_code: str, district_code: str, name: str, source: str) -> None:
        clean = " ".join(name.split())
        if not clean:
            return
        key = (state_code, district_code, clean.upper())
        if key not in entries:
            entries[key] = {
                "state_code": state_code,
                "district_code": district_code,
                "name": clean,
                "source": source,
            }

    text = urllib.request.urlopen(MUNICIPAL_CSV_URL, timeout=60).read().decode("utf-8")
    for row in csv.DictReader(text.splitlines()):
        state_code = state_by_name.get(_norm(row.get("State Name") or ""))
        district_name = _norm(row.get("District Name") or "")
        ulb = (row.get("Localbody Name") or "").strip()
        if not state_code or not district_name or not ulb:
            continue
        district_code = district_by_key.get((state_code, district_name))
        if district_code:
            add(state_code, district_code, ulb, "ulb")

    for city in cities:
        state_code = city["state_code"]
        name = city["name"].strip()
        district_code = None
        lowered = name.lower()
        for district in districts:
            if district["state_code"] != state_code:
                continue
            dname = district["name"].lower()
            if lowered == dname:
                district_code = district["code"]
                break
            if "(" in name and ")" in name:
                parent = name[name.index("(") + 1 : name.index(")")].strip().lower()
                if parent == dname:
                    district_code = district["code"]
                    break
            if lowered.replace(" city", "").strip() == dname:
                district_code = district["code"]
                break
        if district_code:
            add(state_code, district_code, name, "census_town")

    for district in districts:
        if not any(
            key[0] == district["state_code"] and key[1] == district["code"] for key in entries
        ):
            add(district["state_code"], district["code"], district["name"], "district_hq")

    return sorted(
        entries.values(),
        key=lambda row: (row["state_code"], row["district_code"], row["name"]),
    )


def main() -> None:
    rows = build_urban_local_bodies()
    out = DATA_DIR / "urban_local_bodies.json"
    out.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(rows)} urban local bodies to {out}")


if __name__ == "__main__":
    main()
