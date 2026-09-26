#!/usr/bin/env bash
# Ensures app_en.arb and app_hi.arb have identical key sets (excluding @metadata).
set -euo pipefail
cd "$(dirname "$0")/.."
python3 - <<'PY'
import json, sys
from pathlib import Path

def keys(path):
    data = json.loads(Path(path).read_text())
    return {k for k in data if not k.startswith("@")}

en = keys("lib/l10n/app_en.arb")
hi = keys("lib/l10n/app_hi.arb")
missing_hi = sorted(en - hi)
missing_en = sorted(hi - en)
if missing_hi or missing_en:
    print(f"mobile i18n parity failed: en={len(en)} hi={len(hi)}", file=sys.stderr)
    for k in missing_hi[:20]:
        print(f"  missing in hi: {k}", file=sys.stderr)
    for k in missing_en[:20]:
        print(f"  missing in en: {k}", file=sys.stderr)
    sys.exit(1)
print(f"mobile i18n parity OK ({len(en)} keys)")
PY
