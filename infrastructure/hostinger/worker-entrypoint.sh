#!/bin/sh
# Wait for Postgres (worker/beat skip alembic — backend runs migrations).
set -e

echo "[byot-worker] waiting for postgres at postgres:5432..."
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
    echo "[byot-worker] ERROR: postgres not reachable after 60s"
    exit 1
  fi
  sleep 2
done
echo "[byot-worker] postgres is up"

exec "$@"
