#!/usr/bin/env bash
# Run Alembic migrations with environment detection and clear errors.
#
# Usage (from repo root):
#   ./scripts/migrate-db.sh
#
# Environments:
#   1) Production VPS — runs inside the backend container (deploy.sh does this too)
#   2) Full Docker stack — infrastructure/docker-compose.yml
#   3) Native Mac + Docker DB — scripts/dev-db-start.sh (Postgres on localhost:5433)
#   4) Native Mac + Postgres.app — localhost:5432 with backend/.env
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${GREEN}==>${NC} $*"; }
warn() { echo -e "${YELLOW}==>${NC} $*"; }
fail() { echo -e "${RED}ERROR:${NC} $*" >&2; exit 1; }

try_psql_url() {
  local url="$1"
  python3 - <<PY "$url" 2>/dev/null
import sys
import psycopg2
url = sys.argv[1].replace("postgresql+psycopg2://", "postgresql://").replace("postgresql+asyncpg://", "postgresql://")
conn = psycopg2.connect(url, connect_timeout=3)
conn.close()
print("ok")
PY
}

# --- Production Hostinger ---------------------------------------------------
HOSTINGER_DIR="$ROOT/infrastructure/hostinger"
if [[ -f "$HOSTINGER_DIR/.env.production" && -f "$HOSTINGER_DIR/docker-compose.prod.yml" ]]; then
  if docker compose -f "$HOSTINGER_DIR/docker-compose.prod.yml" --env-file "$HOSTINGER_DIR/.env.production" ps backend 2>/dev/null | grep -q "running"; then
    info "Production stack detected — migrating inside backend container..."
    docker compose -f "$HOSTINGER_DIR/docker-compose.prod.yml" \
      --env-file "$HOSTINGER_DIR/.env.production" \
      exec -T backend alembic upgrade head
    info "Migration complete."
    exit 0
  fi
fi

# --- Full local Docker stack ------------------------------------------------
COMPOSE_FILE="$ROOT/infrastructure/docker-compose.yml"
if docker compose -f "$COMPOSE_FILE" ps backend 2>/dev/null | grep -q "running"; then
  info "Docker backend running — migrating inside container..."
  docker compose -f "$COMPOSE_FILE" exec -T backend alembic upgrade head
  info "Migration complete."
  exit 0
fi

# --- Host-native migration (needs Postgres reachable + backend/.env) --------
ENV_FILE="$ROOT/backend/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  warn "Missing backend/.env"
  echo ""
  echo "Pick one setup:"
  echo ""
  echo "  A) Docker DB only (recommended on Mac):"
  echo "       ./scripts/dev-db-start.sh"
  echo "       cp backend/.env.example backend/.env"
  echo "       # Edit DATABASE_URL* to use localhost:5433 (not postgres:5432)"
  echo ""
  echo "  B) Postgres.app on Mac:"
  echo "       cp backend/.env.native.example backend/.env"
  echo "       # Edit YOUR_USER in DATABASE_URL*"
  echo ""
  echo "  C) Full Docker stack:"
  echo "       docker compose -f infrastructure/docker-compose.yml up -d"
  echo "       docker compose -f infrastructure/docker-compose.yml exec backend alembic upgrade head"
  echo ""
  fail "Create backend/.env first, then re-run ./scripts/migrate-db.sh"
fi

# shellcheck disable=SC1091
set -a
source "$ENV_FILE"
set +a

SYNC_URL="${DATABASE_URL_SYNC:-postgresql+psycopg2://byot:byot@localhost:5432/byot}"

if [[ "$SYNC_URL" == *"@postgres:"* ]]; then
  warn "DATABASE_URL_SYNC uses host 'postgres' — that only resolves inside Docker."
  echo ""
  echo "If Postgres runs on your Mac host, change backend/.env to:"
  echo "  DATABASE_URL_SYNC=postgresql+psycopg2://byot:byot@localhost:5432/byot"
  echo ""
  echo "If you use ./scripts/dev-db-start.sh (port 5433):"
  echo "  DATABASE_URL_SYNC=postgresql+psycopg2://byot:byot@localhost:5433/byot"
  echo ""
  echo "Or run migration inside Docker instead:"
  echo "  docker compose -f infrastructure/docker-compose.yml exec backend alembic upgrade head"
  fail "Fix DATABASE_URL_SYNC in backend/.env"
fi

if ! try_psql_url "$SYNC_URL" >/dev/null; then
  warn "Cannot connect to Postgres using DATABASE_URL_SYNC from backend/.env"
  echo ""
  echo "  URL: $SYNC_URL"
  echo ""
  echo "Start Postgres first:"
  echo "  ./scripts/dev-db-start.sh          # Docker PostGIS on localhost:5433"
  echo "  # or open Postgres.app on Mac       # localhost:5432"
  echo "  # or: docker compose -f infrastructure/docker-compose.yml up -d postgres"
  echo ""
  fail "Postgres is not running or credentials/host are wrong."
fi

if [[ ! -d "$ROOT/backend/.venv" ]]; then
  warn "Creating backend virtualenv..."
  python3 -m venv "$ROOT/backend/.venv"
  "$ROOT/backend/.venv/bin/pip" install -q -r "$ROOT/backend/requirements-dev.txt"
fi

info "Running alembic on host (DATABASE_URL_SYNC from backend/.env)..."
(
  cd "$ROOT/backend"
  # shellcheck disable=SC1091
  source .venv/bin/activate
  export DATABASE_URL_SYNC="$SYNC_URL"
  alembic upgrade head
  alembic current
)

info "Migration complete."
