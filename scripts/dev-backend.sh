#!/usr/bin/env bash
# Start BYOT backend on Mac (no Docker). Run from repo root: ./scripts/dev-backend.sh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

PY="$("$ROOT/scripts/python312.sh")"
if [ -z "$PY" ]; then
  echo "ERROR: Python 3.12 required (default python3 is too new for numpy)."
  echo "  brew install python@3.12"
  exit 1
fi

if [ ! -d .venv ]; then
  echo "Creating Python 3.12 venv..."
  "$PY" -m venv .venv
fi
source .venv/bin/activate

python -c "import sys; assert sys.version_info[:2]==(3,12), f'Need Python 3.12, got {sys.version}'"

pip install -q -r requirements.txt

if [ ! -f .env ]; then
  echo "Create backend/.env first — see backend/.env.native.example"
  exit 1
fi

echo "Checking Postgres..."
if pg_isready -h localhost -p 5433 >/dev/null 2>&1; then
  echo "  Postgres: OK (Docker :5433)"
elif pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  echo "  Postgres: OK (:5432)"
else
  echo "  Postgres not running. Try: ./scripts/dev-db-start.sh"
  exit 1
fi

echo "Checking Redis..."
python -c "
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
exec uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
