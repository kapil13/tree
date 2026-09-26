#!/usr/bin/env bash
# Verify GHG / methane emissions module (migrations 0055 + 0056).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.prod.yml"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

echo "==> Alembic head (expect 0057_emission_fusion_assessments or newer)"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend alembic current

echo ""
echo "==> Emissions tables present?"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  psql -U "${POSTGRES_USER:-byot}" -d "${POSTGRES_DB:-byot}" -c \
  "SELECT tablename FROM pg_tables WHERE tablename IN ('emission_sources','dispersion_simulations','emission_satellite_scans','emission_fusion_assessments') ORDER BY 1;"

echo ""
echo "==> Sentinel Hub credentials"
# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a
if [[ -n "${SENTINEL_HUB_CLIENT_ID:-}" && -n "${SENTINEL_HUB_CLIENT_SECRET:-}" ]]; then
  echo "  OK: SENTINEL_HUB_CLIENT_ID and SECRET set"
else
  echo "  WARN: Sentinel Hub not configured — TROPOMI scans will return 503"
fi

echo ""
echo "If tables are missing, run:"
echo "  docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec backend alembic upgrade head"
