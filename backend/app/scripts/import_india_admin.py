"""Import India admin geography into PostgreSQL from bundled LGD source files.

Usage:
    python -m app.scripts.import_india_admin
    python -m app.scripts.import_india_admin --csv /path/to/villages_by_blocks.csv
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import json
from pathlib import Path

from sqlalchemy import delete, func, select

from app.core.database import AsyncSessionLocal
from app.models.india_admin import (
    IndiaBlock,
    IndiaCity,
    IndiaDistrict,
    IndiaGramPanchayat,
    IndiaState,
    IndiaVillage,
)

DATA_DIR = Path(__file__).resolve().parents[1] / "services" / "india_admin" / "data"
BATCH = 5000


def _norm_state(code: str) -> str:
    return str(code).strip().zfill(2)


def _norm_district(code: str) -> str:
    return str(code).strip()


async def _clear_all(db) -> None:
    await db.execute(delete(IndiaVillage))
    await db.execute(delete(IndiaGramPanchayat))
    await db.execute(delete(IndiaBlock))
    await db.execute(delete(IndiaCity))
    await db.execute(delete(IndiaDistrict))
    await db.execute(delete(IndiaState))
    await db.commit()


async def _import_json_basics(db) -> None:
    states = json.loads((DATA_DIR / "states.json").read_text(encoding="utf-8"))
    districts = json.loads((DATA_DIR / "districts.json").read_text(encoding="utf-8"))
    cities = json.loads((DATA_DIR / "urban_local_bodies.json").read_text(encoding="utf-8"))
    state_codes = {s["code"] for s in states}

    db.add_all([IndiaState(code=s["code"], lgd=s.get("lgd"), name=s["name"]) for s in states])
    await db.commit()

    db.add_all(
        [
            IndiaDistrict(
                code=d["code"],
                state_code=d["state_code"],
                lgd=d.get("lgd"),
                name=d["name"],
            )
            for d in districts
        ]
    )
    await db.commit()

    city_rows = [c for c in cities if c["state_code"] in state_codes and c.get("district_code")]
    for i in range(0, len(city_rows), BATCH):
        db.add_all(
            [
                IndiaCity(
                    state_code=c["state_code"],
                    district_code=c["district_code"],
                    name=c["name"],
                )
                for c in city_rows[i : i + BATCH]
            ]
        )
        await db.commit()

    print(
        f"Imported {len(states)} states, {len(districts)} districts, {len(city_rows)} urban local bodies"
    )


async def _import_lgd_csv(db, csv_path: Path) -> None:
    districts = json.loads((DATA_DIR / "districts.json").read_text(encoding="utf-8"))
    states = json.loads((DATA_DIR / "states.json").read_text(encoding="utf-8"))
    valid_districts = {d["code"] for d in districts}
    valid_states = {s["code"] for s in states}

    blocks: dict[int, dict] = {}
    gps: dict[str, dict] = {}
    villages: dict[str, dict] = {}

    with csv_path.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            state_code = _norm_state(row.get("State Census 2011 Code") or row.get("State Code") or "")
            district_code = _norm_district(
                row.get("District Census 2011 Code") or row.get("District Code") or ""
            )
            if state_code not in valid_states or district_code not in valid_districts:
                continue
            block_lgd_raw = (row.get("Development Block Code") or "").strip()
            if not block_lgd_raw:
                continue
            block_lgd = int(block_lgd_raw)
            block_name = (row.get("Development Block Name (In English)") or "").strip()
            if block_name:
                blocks[block_lgd] = {
                    "lgd": block_lgd,
                    "code": None,
                    "name": block_name,
                    "district_code": district_code,
                    "state_code": state_code,
                }

            gp_code = (row.get("Local Body Code") or "").strip()
            gp_name = (row.get("Local Body Name (In English)") or "").strip()
            if gp_code and gp_name and block_lgd in blocks:
                gps[gp_code] = {"code": gp_code, "name": gp_name, "block_lgd": block_lgd}

            vcode = (row.get("Village Code") or "").strip()
            vname = (row.get("Village Name (In English)") or "").strip()
            if gp_code in gps and vcode and vname:
                villages[vcode] = {
                    "code": vcode,
                    "name": vname,
                    "gram_panchayat_code": gp_code,
                }

    block_rows = list(blocks.values())
    for i in range(0, len(block_rows), BATCH):
        db.add_all([IndiaBlock(**row) for row in block_rows[i : i + BATCH]])
        await db.commit()
    print(f"Imported {len(block_rows)} blocks")

    gp_rows = list(gps.values())
    for i in range(0, len(gp_rows), BATCH):
        db.add_all([IndiaGramPanchayat(**row) for row in gp_rows[i : i + BATCH]])
        await db.commit()
    print(f"Imported {len(gp_rows)} gram panchayats")

    village_rows = list(villages.values())
    for i in range(0, len(village_rows), BATCH):
        db.add_all([IndiaVillage(**row) for row in village_rows[i : i + BATCH]])
        await db.commit()
    print(f"Imported {len(village_rows)} villages")


async def import_all(*, csv_path: Path | None = None, reset: bool = True) -> None:
    csv_file = csv_path or Path("/tmp/lgd/villages_by_blocks.28Aug2026.csv")
    if not csv_file.exists():
        raise SystemExit(
            f"LGD CSV not found at {csv_file}. Pass --csv or download villages_by_blocks CSV."
        )

    async with AsyncSessionLocal() as db:
        if reset:
            print("Clearing existing india admin tables…")
            await _clear_all(db)
        await _import_json_basics(db)
        await _import_lgd_csv(db, csv_file)

        counts = {}
        for model, label in [
            (IndiaState, "states"),
            (IndiaDistrict, "districts"),
            (IndiaBlock, "blocks"),
            (IndiaGramPanchayat, "gps"),
            (IndiaVillage, "villages"),
            (IndiaCity, "cities"),
        ]:
            res = await db.execute(select(func.count()).select_from(model))
            counts[label] = res.scalar_one()
        print("Final counts:", counts)


def main() -> None:
    parser = argparse.ArgumentParser(description="Import India admin geography into PostgreSQL")
    parser.add_argument("--csv", type=Path, help="Path to LGD villages_by_blocks CSV")
    parser.add_argument("--no-reset", action="store_true", help="Skip clearing tables first")
    args = parser.parse_args()
    asyncio.run(import_all(csv_path=args.csv, reset=not args.no_reset))


if __name__ == "__main__":
    main()
