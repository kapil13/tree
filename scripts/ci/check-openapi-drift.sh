#!/usr/bin/env bash
# Platform Foundation E4 — fail if committed OpenAPI snapshot drifts from the app.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SNAPSHOT="${ROOT}/backend/openapi.snapshot.json"
TMP="$(mktemp)"

cd "${ROOT}/backend"
export APP_ENV=test
export JWT_SECRET=ci-openapi-snapshot-secret-min-32-chars
python - <<'PY' > "$TMP"
import json
from app.main import app

print(json.dumps(app.openapi(), sort_keys=True, indent=2))
PY

if [[ ! -f "$SNAPSHOT" ]]; then
  cp "$TMP" "$SNAPSHOT"
  echo "Created initial OpenAPI snapshot at backend/openapi.snapshot.json"
  rm -f "$TMP"
  exit 0
fi

if ! diff -q "$SNAPSHOT" "$TMP" >/dev/null; then
  echo "ERROR: OpenAPI drift detected. Update backend/openapi.snapshot.json:"
  diff -u "$SNAPSHOT" "$TMP" | head -80 || true
  rm -f "$TMP"
  exit 1
fi

rm -f "$TMP"
echo "OK: OpenAPI snapshot matches app"
