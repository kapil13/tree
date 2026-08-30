"""India admin geography lookups for project location fields."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.services.india_admin.bharatlas_client import query_layer
from app.services.india_admin.financial_years import current_financial_year, list_financial_years
from app.services.india_admin.lgd_index import gps_for_block, villages_for_gp

_DATA_DIR = Path(__file__).resolve().parent / "data"


@lru_cache(maxsize=1)
def _load_json(name: str) -> list[dict[str, Any]]:
    return json.loads((_DATA_DIR / name).read_text(encoding="utf-8"))


class IndiaAdminService:
    """State → district → block → GP → village lookups."""

    def financial_years(self) -> dict[str, Any]:
        years = list_financial_years()
        return {"items": years, "current": current_financial_year()}

    def states(self) -> list[dict[str, Any]]:
        return _load_json("states.json")

    def districts(self, *, state_code: str) -> list[dict[str, Any]]:
        code = state_code.zfill(2)
        return [d for d in _load_json("districts.json") if d["state_code"] == code]

    def cities(self, *, state_code: str) -> list[dict[str, Any]]:
        code = state_code.zfill(2)
        return [c for c in _load_json("cities.json") if c["state_code"] == code]

    async def blocks(
        self,
        *,
        state_code: str,
        district_code: str,
    ) -> dict[str, Any]:
        st = state_code.zfill(2)
        dt = district_code.lstrip("0") or district_code
        rows, err = await query_layer(
            "lgd_blocks",
            params={"stcode11": st, "dtcode11": dt},
            limit=500,
        )
        items = [
            {
                "code": str(row.get("blkcode11") or row.get("block_lgd") or ""),
                "lgd": row.get("block_lgd"),
                "name": (row.get("block_name") or "").strip(),
                "district_code": str(row.get("dtcode11") or district_code),
                "state_code": st,
            }
            for row in rows
            if (row.get("block_name") or "").strip()
        ]
        items.sort(key=lambda x: x["name"].lower())
        return {"items": items, "manual_fallback": bool(err), "hint": err}

    async def gram_panchayats(
        self,
        *,
        block_code: str | None = None,
        block_lgd: int | None = None,
        district_code: str | None = None,
        state_code: str | None = None,
    ) -> dict[str, Any]:
        if block_lgd is not None:
            items = gps_for_block(block_lgd=block_lgd)
            if items:
                return {"items": items, "manual_fallback": False, "hint": None, "source": "lgd_bundle"}

        params: dict[str, str | int] = {}
        if block_code:
            params["blkcode11"] = block_code
        elif district_code and state_code:
            params["stcode11"] = state_code.zfill(2)
            params["dtcode11"] = district_code.lstrip("0") or district_code
        else:
            return {"items": [], "manual_fallback": True, "hint": "missing_parent", "source": "none"}

        rows, err = await query_layer("lgd_panchayats", params=params, limit=2000)
        seen: set[str] = set()
        items: list[dict[str, Any]] = []
        for row in rows:
            code = str(row.get("gp_code") or row.get("gpcode") or row.get("b_pan_code") or "")
            name = (row.get("gp_name") or row.get("gpname") or row.get("b_pan_name") or "").strip()
            if not name:
                continue
            dedupe = code or name.lower()
            if dedupe in seen:
                continue
            seen.add(dedupe)
            items.append({"code": code, "name": name, "block_code": block_code})
        items.sort(key=lambda x: x["name"].lower())
        manual = bool(err) or len(items) == 0
        return {
            "items": items,
            "manual_fallback": manual,
            "hint": err,
            "source": "bharatlas" if items else "none",
        }

    async def villages(
        self,
        *,
        block_code: str | None = None,
        block_lgd: int | None = None,
        gram_panchayat_code: str | None = None,
        district_code: str | None = None,
        state_code: str | None = None,
    ) -> dict[str, Any]:
        if gram_panchayat_code:
            items = villages_for_gp(gp_code=gram_panchayat_code)
            if items:
                return {
                    "items": items,
                    "manual_fallback": False,
                    "hint": None,
                    "source": "lgd_bundle",
                }

        params: dict[str, str | int] = {}
        if gram_panchayat_code:
            params["gp_code"] = gram_panchayat_code
        elif block_code:
            params["blkcode11"] = block_code
        elif block_lgd is not None:
            # Bharatlas villages layer may accept block_lgd; try bundled GP path first above.
            params["block_lgd"] = block_lgd
        elif district_code and state_code:
            params["stcode11"] = state_code.zfill(2)
            params["dtcode11"] = district_code.lstrip("0") or district_code
        else:
            return {"items": [], "manual_fallback": True, "hint": "missing_parent", "source": "none"}

        rows, err = await query_layer("lgd_villages", params=params, limit=3000)
        seen: set[str] = set()
        items: list[dict[str, Any]] = []
        for row in rows:
            code = str(row.get("vilcode11") or row.get("vil_lgd") or "")
            name = (row.get("vilname11") or row.get("vilnam_soi") or "").strip()
            if not name:
                continue
            dedupe = code or name.lower()
            if dedupe in seen:
                continue
            seen.add(dedupe)
            items.append(
                {
                    "code": code,
                    "name": name,
                    "gram_panchayat_code": gram_panchayat_code or row.get("gp_code"),
                    "block_code": block_code or row.get("block_lgd"),
                }
            )
        items.sort(key=lambda x: x["name"].lower())
        manual = bool(err) or len(items) == 0
        return {
            "items": items,
            "manual_fallback": manual,
            "hint": err,
            "source": "bharatlas" if items else "none",
        }
