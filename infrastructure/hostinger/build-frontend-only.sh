#!/usr/bin/env bash
# Build frontend only — use when full deploy fails mid-build (SSH drop, OOM, disk).
# Frees RAM by stopping the ML worker; run inside tmux so SSH disconnect is safe.
#
# Usage (on VPS):
#   cd /opt/aranyix/infrastructure/hostinger
#   tmux new -s deploy
#   ./build-frontend-only.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.prod.yml"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
export GIT_SHA="$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"

echo "==> Disk before build"
df -h /

echo "==> Stopping bioacoustic worker (frees ~2.5 GB RAM limit) if running..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" stop bioacoustic-worker 2>/dev/null || true

echo "==> Building frontend only (git $GIT_SHA)..."
echo "    Tip: run inside tmux so SSH disconnect does not kill the build."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build frontend

echo "==> Recreating frontend container..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --no-deps frontend

echo "==> Done."
df -h /
