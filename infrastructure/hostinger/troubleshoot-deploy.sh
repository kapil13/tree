#!/usr/bin/env bash
# Quick diagnostics when byot-prod-backend-1 fails to start.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.prod.yml"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

echo "==> Container status"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -a

echo ""
echo "==> Backend logs (last 120 lines)"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs backend --tail 120 2>&1 || true

echo ""
echo "==> Postgres logs (last 40 lines)"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs postgres --tail 40 2>&1 || true

echo ""
echo "==> Alembic state (if backend container is running)"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend alembic current 2>&1 || \
  echo "(backend not running — check logs above for alembic/import errors)"

echo ""
echo "==> Common fixes"
echo "  1. alembic duplicate table: docker compose exec backend alembic stamp head  # only if table exists"
echo "  2. rebuild: docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d --build backend"
echo "  3. manual migrate: docker compose exec backend alembic upgrade head"
