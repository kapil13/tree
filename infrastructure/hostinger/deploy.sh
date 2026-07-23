#!/usr/bin/env bash
# BYOT — deploy / update on Hostinger KVM 4
# Run on the VPS from: infrastructure/hostinger/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.prod.yml"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy from .env.production.example and edit secrets."
  echo "  cp .env.production.example .env.production"
  exit 1
fi

chmod +x worker-entrypoint.sh

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

for var in POSTGRES_PASSWORD JWT_SECRET MINIO_ROOT_PASSWORD APP_DOMAIN API_DOMAIN CORS_ORIGINS; do
  if [[ -z "${!var:-}" ]] || [[ "${!var}" == CHANGE_ME* ]]; then
    echo "ERROR: set $var in $ENV_FILE before deploying."
    exit 1
  fi
done
# NEXT_PUBLIC_API_URL is optional; empty = same-origin /api proxy (recommended)

REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
export GIT_SHA="$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "==> Deploying git revision: $GIT_SHA"

# COMPOSE_PROFILES=bioacoustic enables the heavy TensorFlow worker (see docker-compose.prod.yml).
COMPOSE_PROFILES="${COMPOSE_PROFILES:-}"
if [[ -n "$COMPOSE_PROFILES" ]]; then
  echo "==> Compose profiles: $COMPOSE_PROFILES"
fi

BUILD_FLAGS=()
if [[ "${FORCE_FRONTEND_REBUILD:-}" == "1" ]]; then
  echo "==> Rebuilding frontend (FORCE_FRONTEND_REBUILD=1 — no cache)..."
  BUILD_FLAGS+=(--no-cache)
else
  echo "==> Building frontend (layer cache enabled — set FORCE_FRONTEND_REBUILD=1 to bust cache)..."
fi
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build "${BUILD_FLAGS[@]}" frontend

echo "==> Building and starting BYOT stack..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

echo "==> Pruning dangling Docker images (frees disk from old deploys)..."
docker image prune -f

echo "==> Waiting for API health..."
TRIES=0
until docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend curl -fsS http://localhost:8000/health/live >/dev/null 2>&1; do
  TRIES=$((TRIES + 1))
  if [[ $TRIES -ge 40 ]]; then
    echo "API did not become healthy. Check: docker compose -f $COMPOSE_FILE logs backend"
    if [[ -x ./troubleshoot-deploy.sh ]]; then
      ./troubleshoot-deploy.sh
    fi
    exit 1
  fi
  sleep 3
done

echo "==> Running database migrations..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend alembic upgrade head

echo "==> Ensuring worker + beat are running..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d worker beat
if [[ "$COMPOSE_PROFILES" == *bioacoustic* ]]; then
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d bioacoustic-worker
fi

if [[ -x ./resource-check.sh ]]; then
  echo "==> Disk snapshot after deploy..."
  df -h / 2>/dev/null || true
  docker system df 2>/dev/null || true
  echo "(Full report: ./resource-check.sh — cleanup: ./cleanup-docker-disk.sh)"
fi

if [[ -x ./verify-phase3.sh ]]; then
  echo "==> Phase 3 verification..."
  ./verify-phase3.sh || true
fi

echo ""
echo "Deploy complete."
echo "  App:  https://${APP_DOMAIN}"
echo "  API:  https://${API_DOMAIN}"
echo "  Git:  ${GIT_SHA} (shown in app top bar after login)"
echo ""
echo "Optional — seed demo user:"
echo "  docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec backend python -m app.scripts.seed_demo"
echo ""
echo "View logs:"
echo "  docker compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f backend"
