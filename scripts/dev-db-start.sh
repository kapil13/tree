#!/usr/bin/env bash
# Start Postgres+PostGIS and Redis in Docker (native backend/frontend on Mac).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Stopping Homebrew Postgres (frees port conflicts)..."
brew services stop postgresql@16 2>/dev/null || true
brew services stop postgresql@14 2>/dev/null || true

echo "Starting PostGIS + Redis containers..."
docker compose -f infrastructure/docker-compose.db.yml up -d

echo "Waiting for Postgres..."
for i in $(seq 1 30); do
  if docker compose -f infrastructure/docker-compose.db.yml exec -T postgres pg_isready -U byot -d byot >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo ""
echo "Postgres+PostGIS: localhost:5433  (user byot / password byot / db byot)"
echo "Redis:            localhost:6379"
echo ""
echo "Set backend/.env:"
echo "  DATABASE_URL=postgresql+asyncpg://byot:byot@localhost:5433/byot"
echo "  DATABASE_URL_SYNC=postgresql+psycopg2://byot:byot@localhost:5433/byot"
echo "  REDIS_URL=redis://localhost:6379/0"
echo ""
echo "Then:"
echo "  cd backend && source .venv/bin/activate"
echo "  pip install -r requirements.txt"
echo "  alembic upgrade head"
echo "  python -m app.scripts.seed_demo"
