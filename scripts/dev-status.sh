#!/usr/bin/env bash
# Check BYOT dev servers + show recent log lines.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$ROOT/.dev"

echo "=== Ports ==="
lsof -i :8000 2>/dev/null || echo "  :8000 nothing listening"
lsof -i :3000 2>/dev/null || echo "  :3000 nothing listening"

echo ""
echo "=== PIDs ==="
for f in backend frontend; do
  pf="$RUN_DIR/$f.pid"
  if [ -f "$pf" ]; then
    pid=$(cat "$pf")
    if kill -0 "$pid" 2>/dev/null; then
      echo "  $f: running (pid $pid)"
    else
      echo "  $f: pid file exists but process dead ($pid)"
    fi
  else
    echo "  $f: no pid file"
  fi
done

echo ""
echo "=== Health ==="
curl -sf http://localhost:8000/health && echo "" || echo "  backend: FAILED"
curl -sf -o /dev/null -w "  frontend: HTTP %{http_code}\n" http://localhost:3000 2>/dev/null || echo "  frontend: FAILED"

echo ""
echo "=== Postgres / Redis ==="
pg_isready -h localhost -p 5432 2>/dev/null || echo "  postgres: not ready — open Postgres.app"
redis-cli ping 2>/dev/null || echo "  redis: not ready (brew services start redis)"

echo ""
echo "=== backend.log (last 25 lines) ==="
tail -25 "$RUN_DIR/backend.log" 2>/dev/null || echo "  (no log)"

echo ""
echo "=== frontend.log (last 15 lines) ==="
tail -15 "$RUN_DIR/frontend.log" 2>/dev/null || echo "  (no log)"
