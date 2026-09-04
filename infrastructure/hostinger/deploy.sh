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

for var in POSTGRES_PASSWORD JWT_SECRET MINIO_ROOT_PASSWORD APP_DOMAIN API_DOMAIN CORS_ORIGINS REDIS_PASSWORD; do
  if [[ -z "${!var:-}" ]] || [[ "${!var}" == CHANGE_ME* ]]; then
    echo "ERROR: set $var in $ENV_FILE before deploying."
    exit 1
  fi
done

if [[ -x ./check-production-env.sh ]]; then
  ./check-production-env.sh
fi
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

echo "==> Verifying focused project UI in frontend image..."
FOCUSED_MARKER="project-focused-layout-v3"
if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm --no-deps frontend \
  sh -c "grep -rq '${FOCUSED_MARKER}' .next 2>/dev/null"; then
  echo "OK: focused project layout found in frontend bundle (${FOCUSED_MARKER})"
else
  echo "ERROR: focused project layout NOT found in frontend bundle."
  echo "       Run: FORCE_FRONTEND_REBUILD=1 ./deploy.sh"
  exit 1
fi

echo "==> Building and starting BYOT stack..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

echo "==> Reloading Caddy (applies Caddyfile / CSP changes)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --force-recreate caddy
sleep 5

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

verify_internal_proxy() {
  # Prefer in-network checks — curling the public domain from the VPS often fails
  # (hairpin NAT / no loopback to public IP) even when Caddy and TLS are fine.
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend \
    curl -fsS -o /dev/null -w "%{http_code}" \
    -H "Host: ${APP_DOMAIN}" "http://caddy/api/v1/health/live" 2>/dev/null || echo "000"
}

verify_internal_api_subdomain() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend \
    curl -fsS -o /dev/null -w "%{http_code}" "http://caddy/health" \
    -H "Host: ${API_DOMAIN}" 2>/dev/null || echo "000"
}

echo "==> Verifying app /api proxy (same-origin)..."
APP_API_INTERNAL="$(verify_internal_proxy)"
if [[ "$APP_API_INTERNAL" == "200" ]]; then
  echo "OK: Caddy → backend /api/v1/health/live (internal) → 200"
else
  echo "WARN: internal app proxy check returned ${APP_API_INTERNAL} (expected 200)."
  echo "      Check: docker compose -f $COMPOSE_FILE logs caddy backend"
fi
APP_API_CODE="$(curl -sS -o /dev/null -w "%{http_code}" --connect-timeout 8 --max-time 15 "https://${APP_DOMAIN}/api/v1/health/live" 2>/dev/null || echo "000")"
if [[ "$APP_API_CODE" == "200" ]]; then
  echo "OK: https://${APP_DOMAIN}/api/v1/health/live → 200 (public)"
elif [[ "$APP_API_INTERNAL" == "200" ]]; then
  echo "NOTE: public curl returned ${APP_API_CODE} from this VPS (common hairpin NAT issue)."
  echo "      Internal proxy is OK — verify in a browser: https://${APP_DOMAIN}/api/v1/health/live"
else
  echo "WARN: https://${APP_DOMAIN}/api/v1/health/live returned ${APP_API_CODE} (expected 200)."
  echo "      Ensure Caddyfile routes /api/v1/* to backend and reload Caddy."
fi

echo "==> Verifying direct API subdomain + CSP..."
API_INTERNAL="$(verify_internal_api_subdomain)"
if [[ "$API_INTERNAL" == "200" ]]; then
  echo "OK: Caddy → backend /health (internal, Host: ${API_DOMAIN}) → 200"
else
  echo "WARN: internal API subdomain check returned ${API_INTERNAL} (expected 200)."
fi
API_HEALTH_CODE="$(curl -sS -o /dev/null -w "%{http_code}" --connect-timeout 8 --max-time 15 "https://${API_DOMAIN}/health" 2>/dev/null || echo "000")"
if [[ "$API_HEALTH_CODE" == "200" ]]; then
  echo "OK: https://${API_DOMAIN}/health → 200 (public)"
elif [[ "$API_INTERNAL" == "200" ]]; then
  echo "NOTE: public curl returned ${API_HEALTH_CODE} from this VPS — internal API route is OK."
else
  echo "WARN: https://${API_DOMAIN}/health returned ${API_HEALTH_CODE} (expected 200)."
fi
CSP_HEADER="$(curl -sSI "https://${APP_DOMAIN}/" 2>/dev/null | tr -d '\r' | awk 'tolower($1)=="content-security-policy:" {print substr($0,index($0,$2)); exit}')"
if [[ -n "$CSP_HEADER" ]] && echo "$CSP_HEADER" | grep -Fq "https://${API_DOMAIN}"; then
  echo "OK: CSP connect-src includes https://${API_DOMAIN}"
else
  echo "ERROR: CSP connect-src missing https://${API_DOMAIN} — browser API calls will fail."
  echo "       Re-run: docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d --force-recreate caddy"
  exit 1
fi

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

if [[ -x ./verify-sar-gee.sh ]] && grep -qE '^SAR_PROVIDER=(gee|sentinel_hub)' "$ENV_FILE" 2>/dev/null; then
  echo "==> SAR / GEE verification..."
  ./verify-sar-gee.sh || true
fi

if [[ -x ./verify-msg91.sh ]] && grep -qE '^AUTH_OTP_SMS_ENABLED=true' "$ENV_FILE" 2>/dev/null; then
  echo "==> MSG91 OTP verification..."
  ./verify-msg91.sh || true
fi

echo ""
echo "Deploy complete."
echo "  App:  https://${APP_DOMAIN}"
echo "  API:  https://${API_DOMAIN}"
echo "  Git:  ${GIT_SHA} (shown in app top bar after login)"
echo ""
echo "Optional — seed demo user:"
echo "  make seed-demo"
echo ""
echo "Optional — India admin geography (project location dropdowns, run once after pull):"
echo "  # Place LGD villages_by_blocks CSV at /opt/aranyix/data/lgd/villages_by_blocks.csv"
echo "  make import-india-admin"
echo ""
echo "View logs:"
echo "  docker compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f backend"
