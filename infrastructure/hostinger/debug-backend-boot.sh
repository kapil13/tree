#!/usr/bin/env bash
# Run backend startup steps once (no restart loop) and print the exact failure.
# Use when: dependency failed to start / backend is unhealthy / container is restarting.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.prod.yml"
COMPOSE=(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: missing $ENV_FILE"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

echo "==> 1) Env preflight"
if [[ -x ./check-production-env.sh ]]; then
  ./check-production-env.sh || true
else
  echo "WARN: check-production-env.sh not found — git pull main"
fi

echo ""
echo "==> 2) Recent backend logs (works while container is restarting)"
"${COMPOSE[@]}" logs backend --tail 120 2>&1 || docker logs byot-prod-backend-1 --tail 120 2>&1 || true

echo ""
echo "==> 3) Secret file mounts (empty host paths become directories and break reads)"
for path in \
  "${GMAIL_SA_JSON_HOST:-/opt/aranyix/secrets/gmail-service-account.json}" \
  "${GEE_SA_JSON_HOST:-/opt/aranyix/secrets/gee-service-account.json}"; do
  if [[ -f "$path" ]]; then
    echo "  OK file: $path"
  elif [[ -d "$path" ]]; then
    echo "  BAD directory (remove it, add real JSON file): $path"
  else
    echo "  MISSING (optional unless Gmail/GEE enabled): $path"
  fi
done

echo ""
echo "==> 4) Boot guard check (one-shot container, no restart loop)"
if ! "${COMPOSE[@]}" run --rm --no-deps --entrypoint python backend -c "
from app.core.production_guards import validate_runtime_settings
validate_runtime_settings()
print('boot guards: OK')
"; then
  echo ""
  echo "FAILED at boot guards — fix .env.production (see messages above), then re-run this script."
  exit 1
fi

echo ""
echo "==> 5) Postgres connectivity from backend network"
if ! "${COMPOSE[@]}" run --rm --no-deps --entrypoint python backend -c "
import os, psycopg2
url = os.environ['DATABASE_URL_SYNC'].replace('+psycopg2', '')
conn = psycopg2.connect(url)
cur = conn.cursor()
cur.execute('SELECT 1')
conn.close()
print('postgres: OK')
"; then
  echo ""
  echo "FAILED postgres connect — if POSTGRES_PASSWORD has @ : / # characters, URL-encode it or use a hex-only password."
  exit 1
fi

echo ""
echo "==> 6) Alembic migrate (one-shot)"
if ! "${COMPOSE[@]}" run --rm --no-deps --entrypoint alembic backend upgrade head; then
  echo ""
  echo "FAILED alembic — run: ${COMPOSE[*]} run --rm --no-deps --entrypoint alembic backend current"
  exit 1
fi

echo ""
echo "==> 7) Start backend service"
"${COMPOSE[@]}" up -d backend
sleep 5
if "${COMPOSE[@]}" exec -T backend curl -fsS http://localhost:8000/health/live >/dev/null 2>&1; then
  echo "Backend healthy."
else
  echo "Backend still not healthy — full logs:"
  "${COMPOSE[@]}" logs backend --tail 80
  exit 1
fi

echo ""
echo "Done. Start dependents: ${COMPOSE[*]} up -d frontend worker beat"
