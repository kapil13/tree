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
echo "==> Common fixes"
echo "  1. Disk 100+ GB with no data: ./cleanup-docker-disk.sh (old Docker images from deploys)"
echo "  2. OOM / unhealthy: rebuild slim API image (no TensorFlow on backend):"
echo "     docker compose -f $COMPOSE_FILE --env-file $ENV_FILE build --no-cache backend worker"
echo "  2. alembic revision id too long (varchar 32): ensure head is 0018_webhooks_public_verification"
echo "  3. Credits tab 500/503: run alembic upgrade head (needs 0015 + 0016)"
echo "  4. Checklists 503: run alembic upgrade head (needs 0017_compliance_checklists)"
echo "  5. Webhooks/verify 503: run alembic upgrade head (needs 0018)"
echo "  6. CMS / platform admin 503: run alembic upgrade head (needs 0019_cms_site_content)"
echo "  7. alembic duplicate table: check logs before stamping head"
echo "  8. rebuild: docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d --build backend"
echo "  9. manual migrate: docker compose exec backend alembic upgrade head"
