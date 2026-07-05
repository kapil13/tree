#!/usr/bin/env bash
# Start BYOT backend on Mac (no Docker). Run from repo root: ./scripts/dev-backend.sh
set -e
cd "$(dirname "$0")/../backend"

if [ ! -d .venv ]; then
  echo "Creating Python venv..."
  python3 -m venv .venv
fi
source .venv/bin/activate

pip install -q -r requirements.txt

if [ ! -f .env ]; then
  echo "Create backend/.env first — see backend/.env.native.example"
  exit 1
fi

echo "Checking Postgres..."
python3 -c "
import socket
s = socket.socket()
s.settimeout(3)
s.connect(('127.0.0.1', 5432))
s.close()
print('  Postgres: OK')
" || { echo "  Postgres not running. Try: brew services start postgresql@16"; exit 1; }

echo "Checking Redis..."
python3 -c "
import socket
s = socket.socket()
s.settimeout(3)
s.connect(('127.0.0.1', 6379))
s.close()
print('  Redis: OK')
" || { echo "  Redis not running. Try: brew services start redis"; exit 1; }

echo "Running migrations..."
alembic upgrade head

echo "Starting API on http://localhost:8000"
echo "  Health: http://localhost:8000/health"
echo "  Docs:   http://localhost:8000/docs"
exec uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
