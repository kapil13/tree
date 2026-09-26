#!/usr/bin/env bash
# Verify Phase 3 monitoring is deployed on this VPS.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.prod.yml"

echo "==> Git commit (repo root)"
git -C ../.. log -1 --oneline

echo ""
echo "==> Source contains Phase 3 routes?"
if grep -q 'health/workers' ../../backend/app/main.py; then
  echo "  main.py: /health/workers present in source"
else
  echo "  ERROR: main.py missing /health/workers — run: git pull origin main"
  exit 1
fi

echo ""
echo "==> Running backend routes (inside container)"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend python -c "
from app.main import app
paths = sorted({getattr(r, 'path', '') for r in app.routes})
for p in ('/health/workers', '/api/v1/health/workers', '/api/v1/planting-projects/monitoring-summary'):
    print(f'  {p}:', 'OK' if p in paths else 'MISSING')
"

echo ""
echo "==> Alembic head"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend alembic current

echo ""
echo "==> Local curl (inside backend container)"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend curl -fsS http://localhost:8000/health/workers | head -c 200
echo ""

echo ""
echo "If any route shows MISSING, rebuild:"
echo "  docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d --build --force-recreate backend worker beat"
echo "  docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec backend alembic upgrade head"
