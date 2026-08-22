#!/usr/bin/env bash
# Install BirdNET / TensorFlow ML stack for local bioacoustic analysis.
# Usage: ./scripts/setup-bioacoustic.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PY="$("$ROOT/scripts/python312.sh" 2>/dev/null || true)"
if [ -z "$PY" ]; then
  PY="$(command -v python3.12 || command -v python3 || true)"
fi
if [ -z "$PY" ]; then
  echo "ERROR: Python 3.12+ required."
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ERROR: ffmpeg not found."
  echo "  macOS:  brew install ffmpeg"
  echo "  Ubuntu: sudo apt-get install -y ffmpeg"
  exit 1
fi

if [ ! -d backend/.venv ]; then
  echo "Creating backend venv..."
  "$PY" -m venv backend/.venv
fi

echo "Installing bioacoustic ML dependencies (BirdNET + TensorFlow — may take several minutes)..."
backend/.venv/bin/pip install -q -r backend/requirements.txt
backend/.venv/bin/pip install -q -r backend/requirements-bioacoustic.txt

echo ""
echo "Verifying BirdNET stack..."
if ./scripts/bioacoustic-ready.sh; then
  (
    cd backend
    ../backend/.venv/bin/python - <<'PY'
from app.services.bioacoustic.birdnet_runner import birdnet_available
print("birdnet_available:", birdnet_available())
PY
  )
  echo ""
  echo "Bioacoustic setup complete."
  echo "  Start worker: ./scripts/dev-bioacoustic-worker.sh"
  echo "  Or restart dev stack: ./scripts/dev-start.sh  (auto-starts worker when ready)"
else
  echo "ERROR: BirdNET stack verification failed."
  exit 1
fi
