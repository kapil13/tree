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
echo "[byot] postgres is up"

echo "[byot] running alembic migrations..."
alembic upgrade head

echo "[byot] starting uvicorn on :8000"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
