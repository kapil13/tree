#!/usr/bin/env bash
# Download Google Perch v2 ONNX model + labels for multi-taxa bioacoustic identification.
set -euo pipefail

MODEL_DIR="${1:-/opt/aranyix/models}"
export MODEL_DIR
export REPO_ID="tphakala/Perch-v2"
export MODEL_FILE="perch_v2_no_dft.onnx"
export LABELS_FILE="labels.txt"

mkdir -p "$MODEL_DIR"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 required" >&2
  exit 1
fi

python3 - <<'PY'
import os
from pathlib import Path

try:
    from huggingface_hub import hf_hub_download
except ImportError:
    raise SystemExit("Install huggingface_hub: pip install huggingface_hub")

model_dir = Path(os.environ["MODEL_DIR"])
repo = os.environ["REPO_ID"]
model_file = os.environ["MODEL_FILE"]
labels_file = os.environ["LABELS_FILE"]

model_path = hf_hub_download(repo_id=repo, filename=model_file, local_dir=str(model_dir))
labels_path = hf_hub_download(repo_id=repo, filename=labels_file, local_dir=str(model_dir))
print(f"Model: {model_path}")
print(f"Labels: {labels_path}")
PY

echo "Perch v2 ready in $MODEL_DIR"
echo "Set in worker .env:"
echo "  BIOACOUSTIC_ENABLE_PERCH=true"
echo "  BIOACOUSTIC_PIPELINE=composite"
echo "  BIOACOUSTIC_PERCH_MODEL_PATH=$MODEL_DIR/$MODEL_FILE"
echo "  BIOACOUSTIC_PERCH_LABELS_PATH=$MODEL_DIR/$LABELS_FILE"
