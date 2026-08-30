#!/usr/bin/env python3
"""Build bundled LGD GP/village indexes from ramSeraph opendata CSV dumps."""

from __future__ import annotations

import csv
import gzip
import json
import sys
import urllib.request
from collections import defaultdict
from pathlib import Path

RELEASE_TAG = "lgd-latest-extra1"
ASSET_NAME = "villages_by_blocks.28Aug2026.csv.7z"
OUT_DIR = Path(__file__).resolve().parents[1] / "app" / "services" / "india_admin" / "data"


def download_csv() -> Path:
    import subprocess
    import tempfile

    api = "https://api.github.com/repos/ramSeraph/opendata/releases/latest"
    with urllib.request.urlopen(api) as resp:
        release = json.load(resp)
    url = next(a["browser_download_url"] for a in release["assets"] if a["name"] == ASSET_NAME)
    tmp = Path(tempfile.mkdtemp())
    archive = tmp / ASSET_NAME
    csv_path = tmp / ASSET_NAME.replace(".7z", "")
    print(f"Downloading {url} …")
    urllib.request.urlretrieve(url, archive)
    subprocess.run(["7z", "x", "-y", f"-o{tmp}", str(archive)], check=True, capture_output=True)
    return csv_path


def build_indexes(csv_path: Path) -> tuple[dict, dict]:
    gps_by_block: dict[str, dict[str, str]] = defaultdict(dict)
    villages_by_gp: dict[str, dict[str, str]] = defaultdict(dict)

    with csv_path.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            block = (row.get("Development Block Code") or "").strip()
            gp_code = (row.get("Local Body Code") or "").strip()
            gp_name = (row.get("Local Body Name (In English)") or "").strip()
            vcode = (row.get("Village Code") or "").strip()
            vname = (row.get("Village Name (In English)") or "").strip()
            if block and gp_code and gp_name:
                gps_by_block[block][gp_code] = gp_name
            if gp_code and vcode and vname:
                villages_by_gp[gp_code][vcode] = vname

    gp_index = {
        block: [{"code": code, "name": name} for code, name in sorted(gps.items(), key=lambda x: x[1])]
        for block, gps in gps_by_block.items()
    }
    village_index = {
        gp: [{"code": code, "name": name} for code, name in sorted(villages.items(), key=lambda x: x[1])]
        for gp, villages in villages_by_gp.items()
    }
    return gp_index, village_index


def write_gz(path: Path, data: dict) -> None:
    raw = json.dumps(data, separators=(",", ":")).encode("utf-8")
    path.write_bytes(gzip.compress(raw))
    print(f"Wrote {path.name} ({len(raw)/1024/1024:.1f} MB raw, {path.stat().st_size/1024/1024:.1f} MB gz)")


def main() -> None:
    csv_path = Path(sys.argv[1]) if len(sys.argv) > 1 else download_csv()
    if not csv_path.exists():
        raise SystemExit(f"CSV not found: {csv_path}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    gp_index, village_index = build_indexes(csv_path)
    write_gz(OUT_DIR / "gp_by_block.json.gz", gp_index)
    write_gz(OUT_DIR / "villages_by_gp.json.gz", village_index)
    print(
        f"Indexed {len(gp_index)} blocks, {sum(len(v) for v in gp_index.values())} GPs, "
        f"{sum(len(v) for v in village_index.values())} villages"
    )


if __name__ == "__main__":
    main()
