#!/usr/bin/env bash
# One-time native Mac setup (no Docker). Run from repo root.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PY="$("$ROOT/scripts/python312.sh")"
if [ -z "$PY" ]; then
  echo "Install Python 3.12: brew install python@3.12"
  exit 1
fi

echo "=== BYOT native Mac setup (no Docker) ==="
echo ""

if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  echo "ERROR: Postgres not on :5432"
  echo "  Install Postgres.app from https://postgresapp.com/"
  echo "  Open it, Initialize, then: createdb byot"
  exit 1
fi
echo "Postgres: OK"

if ! psql byot -c "SELECT PostGIS_Version();" >/dev/null 2>&1; then
  echo "Enabling PostGIS..."
  psql byot -c "CREATE EXTENSION IF NOT EXISTS postgis;"
fi
echo "PostGIS: OK"

if ! redis-cli ping >/dev/null 2>&1; then
  echo "Starting Redis..."
  brew services start redis
  sleep 1
fi
echo "Redis: OK"

if [ ! -f backend/.env ]; then
  cp backend/.env.native.example backend/.env
  echo ""
  echo "Created backend/.env — edit DATABASE_URL with your Mac username (whoami)"
  echo "  Then re-run: ./scripts/setup-mac-native.sh"
  exit 0
fi

echo ""
echo "Backend venv + deps..."
if [ ! -d backend/.venv ]; then
  "$PY" -m venv backend/.venv
fi
# shellcheck disable=SC1091
source backend/.venv/bin/activate
pip install -q -r backend/requirements.txt

echo "Migrations..."
cd backend
alembic upgrade head

echo "Seed demo user..."
python -m app.scripts.seed_demo

echo ""
echo "Frontend deps..."
cd "$ROOT/frontend"
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "Created frontend/.env.local — add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"
fi
npm install --legacy-peer-deps 2>/dev/null || npm install

echo ""
echo "=== Setup complete ==="
echo "  ./scripts/dev-start.sh"
echo "  http://localhost:3000/login  demo@byot.earth / byotdemo1234!"
echo "  Docs: docs/LOCAL_MAC_NATIVE.md"
