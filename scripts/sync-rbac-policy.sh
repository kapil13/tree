#!/usr/bin/env bash
# Copy shared/rbac-policy.json to backend, frontend, and mobile consumers.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/shared/rbac-policy.json"
cp "$SRC" "$ROOT/backend/app/core/rbac-policy.json"
cp "$SRC" "$ROOT/frontend/lib/rbac-policy.json"
mkdir -p "$ROOT/mobile/assets"
cp "$SRC" "$ROOT/mobile/assets/rbac-policy.json"
echo "Synced rbac-policy.json to backend, frontend, and mobile."
