#!/usr/bin/env bash
# Verify SAR / GEE production readiness on Hostinger VPS.
# Usage: ./verify-sar-gee.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

echo "==> SAR / GEE verification (backend + worker)"
echo ""

run_check() {
  local service="$1"
  echo "--- $service ---"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$service" \
    python -m app.scripts.sar_ops_check
  echo ""
}

run_check backend
run_check worker

echo "==> Key file mounts"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend \
  ls -la /run/secrets/gee-sa.json

echo ""
echo "==> Celery beat SAR schedule"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T beat \
  celery -A app.workers.celery_app inspect scheduled 2>/dev/null | head -20 || true

echo ""
echo "Done. For a live sample near your plantation:"
echo "  docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec backend \\"
echo "    python -m app.scripts.sar_ops_check --sample LAT LON"
