#!/usr/bin/env bash
# Start Celery worker for the bioacoustic queue (BirdNET / Perch ML tasks).
# Usage: ./scripts/dev-bioacoustic-worker.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$ROOT/.dev"
mkdir -p "$RUN_DIR"

WORKER_LOG="$RUN_DIR/bioacoustic-worker.log"
WORKER_PID="$RUN_DIR/bioacoustic-worker.pid"

if ! ./scripts/bioacoustic-ready.sh; then
  echo "BirdNET stack not ready. Run: ./scripts/setup-bioacoustic.sh"
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
      echo "Stopping existing bioacoustic worker (pid $pid)..."
      kill "$pid" 2>/dev/null || true
      sleep 1
      kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$WORKER_PID"
  fi
}

stop_if_running

echo "Starting bioacoustic Celery worker (queue: bioacoustic)..."
(
  set -e
  cd "$ROOT/backend"
  # shellcheck disable=SC1091
  source .venv/bin/activate
  exec celery -A app.workers.celery_app worker -l info -Q bioacoustic --concurrency 1
) >>"$WORKER_LOG" 2>&1 &
echo $! >"$WORKER_PID"

echo "Bioacoustic worker pid $(cat "$WORKER_PID")"
echo "  Log: tail -f $WORKER_LOG"
