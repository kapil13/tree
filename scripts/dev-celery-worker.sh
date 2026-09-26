#!/usr/bin/env bash
# Start slim Celery worker for default/ai/notification queues (no TensorFlow).
# Usage: ./scripts/dev-celery-worker.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$ROOT/.dev"
mkdir -p "$RUN_DIR"

WORKER_LOG="$RUN_DIR/celery-worker.log"
WORKER_PID="$RUN_DIR/celery-worker.pid"

if [ ! -f "$ROOT/backend/.venv/bin/python" ]; then
  echo "Backend venv missing. Run ./scripts/setup-mac-native.sh first."
  exit 1
fi

if [ ! -f "$ROOT/backend/.env" ]; then
  echo "Missing backend/.env — copy backend/.env.native.example"
  exit 1
fi

stop_if_running() {
  if [ -f "$WORKER_PID" ]; then
    local pid
    pid=$(cat "$WORKER_PID")
    if kill -0 "$pid" 2>/dev/null; then
      echo "Stopping existing Celery worker (pid $pid)..."
      kill "$pid" 2>/dev/null || true
      sleep 1
      kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$WORKER_PID"
  fi
}

stop_if_running

echo "Starting Celery worker (queues: default,ai,notifications)..."
(
  set -e
  cd "$ROOT/backend"
  # shellcheck disable=SC1091
  source .venv/bin/activate
  pip install -q -r requirements.txt
  exec celery -A app.workers.celery_app worker -l info -Q default,ai,notifications --concurrency 2
) >>"$WORKER_LOG" 2>&1 &
echo $! >"$WORKER_PID"

echo "Celery worker pid $(cat "$WORKER_PID")"
echo "  Log: tail -f $WORKER_LOG"
