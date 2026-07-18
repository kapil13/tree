#!/usr/bin/env bash
# Stop background BYOT dev servers.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$ROOT/.dev"

stop_pid() {
  local pidfile="$1"
  local name="$2"
  if [ ! -f "$pidfile" ]; then
    echo "$name: not running (no pid file)"
    return
  fi
  local pid
  pid=$(cat "$pidfile")
  if kill -0 "$pid" 2>/dev/null; then
    echo "Stopping $name (pid $pid)..."
    kill "$pid" 2>/dev/null || true
    sleep 1
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
    echo "$name stopped."
  else
    echo "$name: pid $pid not running"
  fi
  rm -f "$pidfile"
}

stop_pid "$RUN_DIR/backend.pid" "backend"
stop_pid "$RUN_DIR/frontend.pid" "frontend"

# Clean up child processes (uvicorn --reload, next dev)
pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "next dev --port 3000" 2>/dev/null || true

echo "Done."
