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
echo "==> Caddy logs (last 40 lines)"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs caddy --tail 40 2>&1 || true

echo ""
echo "==> Internal proxy checks (preferred on VPS — public curl may return 000)"
# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend \
  curl -fsS -H "Host: ${APP_DOMAIN:-aranyix.tech}" "http://caddy/api/v1/health/live" 2>&1 || \
  echo "(internal app proxy failed)"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend \
  curl -fsS -H "Host: ${API_DOMAIN:-api.aranyix.tech}" "http://caddy/health" 2>&1 || \
  echo "(internal API subdomain failed)"

echo ""
echo "==> Liveness probe (inside container)"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend curl -fsS http://localhost:8000/health/live 2>&1 || \
  echo "(backend not running or curl failed)"

echo ""
echo "==> Memory limits (0 = unlimited)"
for name in byot-prod-postgres-1 byot-prod-redis-1 byot-prod-backend-1 byot-prod-worker-1 \
            byot-prod-bioacoustic-worker-1 byot-prod-beat-1 byot-prod-frontend-1 byot-prod-caddy-1; do
  docker inspect "$name" --format '{{.Name}} memory limit: {{.HostConfig.Memory}} bytes' 2>/dev/null || true
done

echo ""
echo "==> Disk + RAM (run ./resource-check.sh for full report)"
df -h / 2>/dev/null || true
docker system df 2>/dev/null || true

echo ""
echo "==> Production env preflight"
if [[ -x ./check-production-env.sh ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  ./check-production-env.sh || true
else
  echo "(check-production-env.sh not found)"
fi

echo ""
echo "==> Boot-guard / migration errors in backend logs"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs backend --tail 200 2>&1 \
  | grep -E 'EVIDENCE_SIGNING_KEY|TURNSTILE|JWT_SECRET|AUTH_ALLOW_DEV_OTP|RAZORPAY_WEBHOOK|boot guard|alembic upgrade failed|RuntimeError|ERROR:' \
  || echo "(no matching lines)"

echo ""
echo "==> Common fixes"
echo "  1. Backend unhealthy after P0 deploy — set in .env.production:"
echo "     EVIDENCE_SIGNING_KEY=\$(python3 -c \"import os,base64; print(base64.b64encode(os.urandom(32)).decode())\")"
echo "     TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY (Cloudflare Turnstile)"
echo "     REDIS_PASSWORD=\$(openssl rand -hex 32)  # literal value, not \$(openssl ...) in the file"
echo "     Then: ./check-production-env.sh && ./recover-backend.sh"
echo "  2. Disk 100+ GB with no data: ./cleanup-docker-disk.sh (old Docker images from deploys)"
echo "  2. OOM / unhealthy: rebuild slim API image (no TensorFlow on backend):"
echo "     docker compose -f $COMPOSE_FILE --env-file $ENV_FILE build --no-cache backend worker"
echo "  2. alembic head should be 0024_org_team_management — run: alembic upgrade head"
echo "  3. Credits tab 500/503: run alembic upgrade head (needs 0015 + 0016)"
echo "  4. Checklists 503: run alembic upgrade head (needs 0017_compliance_checklists)"
echo "  5. Webhooks/verify 503: run alembic upgrade head (needs 0018)"
echo "  6. CMS / platform admin 503: run alembic upgrade head (needs 0019_cms_site_content)"
echo "  7. Payments 503: run alembic upgrade head (needs 0022_user_ai_scan_wallet + 0023_payment_orders)"
echo "  8. alembic duplicate table: check logs before stamping head"
echo "  9. rebuild: docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d --build backend"
echo " 10. manual migrate: docker compose exec backend alembic upgrade head"
echo " 11. Razorpay: set RAZORPAY_KEY_ID/SECRET in .env.production; webhook POST https://api.<domain>/api/v1/payments/webhook"
