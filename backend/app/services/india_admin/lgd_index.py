"""Load bundled LGD GP/village indexes (built from official CSV dumps)."""

from __future__ import annotations

import gzip
import json
from functools import lru_cache
from pathlib import Path
from typing import Any

_DATA_DIR = Path(__file__).resolve().parent / "data"


@lru_cache(maxsize=1)
def _load_gz_index(name: str) -> dict[str, list[dict[str, str]]]:
    path = _DATA_DIR / name
    if not path.exists():
        return {}
    with gzip.open(path, "rt", encoding="utf-8") as f:
        return json.load(f)


def gps_for_block(*, block_lgd: int | str) -> list[dict[str, Any]]:
    key = str(block_lgd)
    rows = _load_gz_index("gp_by_block.json.gz").get(key, [])
    return [{"code": row["code"], "name": row["name"], "block_lgd": int(block_lgd)} for row in rows]


def villages_for_gp(*, gp_code: str) -> list[dict[str, Any]]:
    rows = _load_gz_index("villages_by_gp.json.gz").get(str(gp_code), [])
    return [{"code": row["code"], "name": row["name"], "gram_panchayat_code": gp_code} for row in rows]
