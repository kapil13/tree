#!/usr/bin/env bash
# Verify bioacoustic worker + ML dependencies on VPS.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.prod.yml"
MODEL_DIR="${PERCH_MODEL_HOST_DIR:-/opt/aranyix/models}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

echo "==> Container status (worker + bioacoustic-worker + beat)"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps worker bioacoustic-worker beat 2>/dev/null || \
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps worker beat

echo ""
echo "==> Worker health API (bioacoustic block)"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend \
  curl -fsS http://localhost:8000/health/workers 2>/dev/null | python3 -m json.tool 2>/dev/null || \
  echo "(backend curl failed — check container logs)"

echo ""
echo "==> Perch model files on host"
ls -lh "$MODEL_DIR" 2>/dev/null || echo "Model dir not found: $MODEL_DIR"

echo ""
echo "==> ffmpeg in bioacoustic-worker (if profile enabled)"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T bioacoustic-worker \
  sh -c 'command -v ffmpeg && ffmpeg -version | head -1' 2>/dev/null || \
  echo "(bioacoustic-worker not running — set COMPOSE_PROFILES=bioacoustic)"

echo ""
echo "Done. Enable multi-taxa:"
echo "  DOWNLOAD_PERCH=1 bash download-perch-model.sh $MODEL_DIR"
echo "  Set BIOACOUSTIC_ENABLE_PERCH=true BIOACOUSTIC_PIPELINE=composite in .env.production"
echo "  COMPOSE_PROFILES=bioacoustic ./deploy.sh"
