#!/bin/sh
set -e

echo "[byot] waiting for postgres at postgres:5432..."
TRIES=0
until python -c "
import socket
s = socket.socket()
s.settimeout(2)
s.connect(('postgres', 5432))
s.close()
" 2>/dev/null; do
  TRIES=$((TRIES + 1))
  if [ "$TRIES" -ge 30 ]; then
    echo "[byot] ERROR: postgres not reachable after 60s"
    exit 1
  fi
  sleep 2
done
echo "[byot] postgres port is open — waiting for query readiness..."
TRIES=0
until python -c "
import os
import psycopg2
url = os.environ.get('DATABASE_URL_SYNC', '')
if not url:
    raise SystemExit(1)
conn = psycopg2.connect(url.replace('+psycopg2', ''))
cur = conn.cursor()
cur.execute('SELECT 1')
conn.close()
" 2>/dev/null; do
  TRIES=$((TRIES + 1))
  if [ "$TRIES" -ge 20 ]; then
    echo "[byot] ERROR: postgres not accepting queries after 40s"
    exit 1
  fi
  sleep 2
done
echo "[byot] postgres is ready"

echo "[byot] running alembic migrations..."
if ! alembic upgrade head; then
  echo "[byot] ERROR: alembic upgrade failed"
  echo "[byot] Current revision:"
  alembic current 2>&1 || true
  echo "[byot] On VPS run: infrastructure/hostinger/troubleshoot-deploy.sh"
  exit 1
fi

echo "[byot] verifying app import..."
if ! python -c "from app.main import app"; then
  echo "[byot] ERROR: failed to import app.main — see traceback above."
  exit 1
fi

echo "[byot] starting uvicorn on :8000 (no --reload in Docker)"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers
