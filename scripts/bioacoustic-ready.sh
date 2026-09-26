#!/usr/bin/env bash
# Exit 0 when BirdNET ML stack is importable and ffmpeg is on PATH.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$ROOT/backend/.venv"

if [ ! -x "$VENV/bin/python" ]; then
  exit 1
fi

"$VENV/bin/python" - <<'PY'
import shutil
import sys

try:
    import birdnetlib  # noqa: F401
except ImportError:
    sys.exit(1)

if not shutil.which("ffmpeg"):
    sys.exit(2)

sys.exit(0)
PY
