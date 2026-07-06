#!/usr/bin/env bash
# Start BYOT backend + frontend in the background (native Mac, no Docker).
# Usage: ./scripts/dev-start.sh
# Stop:  ./scripts/dev-stop.sh
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$ROOT/.dev"
mkdir -p "$RUN_DIR"

BACKEND_LOG="$RUN_DIR/backend.log"
FRONTEND_LOG="$RUN_DIR/frontend.log"
BACKEND_PID="$RUN_DIR/backend.pid"
FRONTEND_PID="$RUN_DIR/frontend.pid"

stop_if_running() {
  local pidfile="$1"
  local name="$2"
  if [ -f "$pidfile" ]; then
    local pid
    pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      echo "Stopping existing $name (pid $pid)..."
      kill "$pid" 2>/dev/null || true
      sleep 1
      kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$pidfile"
  fi
}

stop_if_running "$BACKEND_PID" "backend"
stop_if_running "$FRONTEND_PID" "frontend"

# Kill anything else on our ports (stale Docker / crashed processes)
for port in 8000 3000; do
  if lsof -ti :"$port" >/dev/null 2>&1; then
    echo "Freeing port $port..."
    lsof -ti :"$port" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
done

echo "=== Preflight ==="
if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  echo "ERROR: Postgres not running on :5432"
  echo "  Open Postgres.app (https://postgresapp.com/) and click Initialize"
  echo "  Then: createdb byot && psql byot -c 'CREATE EXTENSION postgis;'"
  exit 1
fi
echo "  Postgres: OK (:5432)"

if ! redis-cli ping >/dev/null 2>&1; then
  echo "ERROR: Redis not running."
  echo "  brew services start redis"
  exit 1
fi
echo "  Redis: OK"

# --- Backend ---
if [ ! -f "$ROOT/backend/.env" ]; then
  echo "Missing backend/.env — copy backend/.env.native.example to backend/.env and edit it."
  exit 1
fi

if [ ! -d "$ROOT/backend/.venv" ]; then
  echo "Creating backend venv..."
  PY=$("$ROOT/scripts/python312.sh")
  if [ -z "$PY" ]; then
    echo "ERROR: Python 3.12 required. Run: brew install python@3.12"
    exit 1
  fi
  "$PY" -m venv "$ROOT/backend/.venv"
fi

echo "Starting backend on http://localhost:8000 ..."
(
  set -e
  cd "$ROOT/backend"
  source .venv/bin/activate
  pip install -q -r requirements.txt
  alembic upgrade head
  exec uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
) >>"$BACKEND_LOG" 2>&1 &
echo $! >"$BACKEND_PID"

# --- Frontend ---
if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo "Installing frontend dependencies..."
  (cd "$ROOT/frontend" && npm install)
fi

if [ ! -f "$ROOT/frontend/.env.local" ]; then
  echo "Tip: copy frontend/.env.example to frontend/.env.local and set API + Maps keys."
fi

echo "Starting frontend on http://localhost:3000 ..."
(
  cd "$ROOT/frontend"
  exec npm run dev
) >>"$FRONTEND_LOG" 2>&1 &
echo $! >"$FRONTEND_PID"

echo ""
echo "Waiting for services..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo ""
if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
  echo "Backend:  http://localhost:8000/health  OK"
else
  echo "Backend:  not ready yet — tail -f $BACKEND_LOG"
fi

if curl -sf -o /dev/null http://localhost:3000 2>/dev/null; then
  echo "Frontend: http://localhost:3000  OK"
else
  echo "Frontend: starting — tail -f $FRONTEND_LOG"
fi

echo ""
echo "Logs:"
echo "  tail -f $BACKEND_LOG"
echo "  tail -f $FRONTEND_LOG"
echo ""
echo "Status: ./scripts/dev-status.sh"
echo "Stop:   ./scripts/dev-stop.sh"
echo "Login: demo@byot.earth / byotdemo1234!  (run: cd backend && source .venv/bin/activate && python -m app.scripts.seed_demo)"
