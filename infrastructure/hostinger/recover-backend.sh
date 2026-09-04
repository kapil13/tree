#!/usr/bin/env bash
# Diagnose and recover a failed BYOT backend on the VPS.
# Run from: infrastructure/hostinger/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.prod.yml"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: missing $ENV_FILE"
  exit 1
fi

echo "==> Backend container status"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps backend 2>/dev/null || true

echo ""
echo "==> Last 150 lines of backend logs"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs backend --tail 150 2>/dev/null || true

echo ""
echo "==> Checking .env.production syntax (no export/quotes required)"
if grep -qE '^(export |.*=.*".*".*)' "$ENV_FILE" 2>/dev/null; then
  echo "WARN: .env lines should be KEY=value with no 'export' and no surrounding quotes."
  echo "      Example: TURNSTILE_SECRET_KEY=0x4AAAA..."
fi

echo ""
echo "==> Required env vars present?"
# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a
for var in POSTGRES_PASSWORD JWT_SECRET MINIO_ROOT_PASSWORD APP_DOMAIN API_DOMAIN CORS_ORIGINS REDIS_PASSWORD; do
  if [[ -z "${!var:-}" ]] || [[ "${!var}" == CHANGE_ME* ]]; then
    echo "  MISSING: $var"
  else
    echo "  OK: $var"
  fi
done

if [[ -x ./check-production-env.sh ]]; then
  echo ""
  ./check-production-env.sh || true
fi

echo ""
echo "==> Boot-guard errors in backend logs (P0 — common cause of unhealthy)"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs backend --tail 200 2>/dev/null \
  | grep -E 'EVIDENCE_SIGNING_KEY|TURNSTILE|JWT_SECRET|AUTH_ALLOW_DEV_OTP|RAZORPAY_WEBHOOK|boot guard|alembic upgrade failed|RuntimeError' \
  || echo "  (no matching lines — see full logs above)"

echo ""
echo "==> Postgres reachable from backend network?"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  pg_isready -U "${POSTGRES_USER:-byot}" -d "${POSTGRES_DB:-byot}" 2>/dev/null \
  && echo "  postgres: ready" || echo "  postgres: NOT ready"

echo ""
echo "==> Current alembic revision (if backend container is running)"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend \
  alembic current 2>/dev/null || echo "  (backend not running — fix logs above first)"

echo ""
echo "==> Common alembic errors"
echo "  'Can't locate revision identified by 0010_platform_module_rules'"
echo "    => DB was migrated from superadmin branch; pull latest main (includes 0010 migration file)."
echo "  FK violation on trees.plantation_id during 0008"
echo "    => Run orphan cleanup SQL (see recover-backend.sh comments) then redeploy."

echo ""
echo "==> Attempting rebuild + restart (backend only first)"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build backend

echo ""
echo "==> Waiting for backend health (up to 90s)..."
TRIES=0
until docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend \
  curl -fsS http://localhost:8000/health >/dev/null 2>&1; do
  TRIES=$((TRIES + 1))
  if [[ $TRIES -ge 30 ]]; then
    echo "Backend still unhealthy. Full logs:"
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs backend --tail 80
    exit 1
  fi
  sleep 3
done

echo ""
echo "==> Backend healthy — starting frontend + worker"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d frontend worker beat
if grep -q '^COMPOSE_PROFILES=.*bioacoustic' "$ENV_FILE" 2>/dev/null || \
   [[ "${COMPOSE_PROFILES:-}" == *bioacoustic* ]]; then
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d bioacoustic-worker
fi

echo ""
echo "Recovery complete."
echo "  curl -s https://\${API_DOMAIN}/health"
echo "  curl -s https://\${APP_DOMAIN}/api/v1/auth/captcha-config"
