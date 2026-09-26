#!/usr/bin/env bash
# Merge and deploy full bioacoustic stack on Aranyix VPS (BirdNET + optional Perch multi-taxa).
# Run on VPS: bash infrastructure/hostinger/vps-merge-bioacoustic.sh
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/aranyix}"
BRANCH="${BRANCH:-main}"
HOSTINGER="${REPO_DIR}/infrastructure/hostinger"
ENV_FILE="${HOSTINGER}/.env.production"
MODEL_DIR="${PERCH_MODEL_HOST_DIR:-/opt/aranyix/models}"

echo "==> Aranyix bioacoustic VPS deploy"
echo "    Repo:   $REPO_DIR"
echo "    Branch: $BRANCH"

cd "$REPO_DIR"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: missing $ENV_FILE"
  echo "  cp infrastructure/hostinger/.env.production.example .env.production"
  exit 1
fi

grep -q '^BIOACOUSTIC_PIPELINE=' "$ENV_FILE" || cat >>"$ENV_FILE" <<'EOF'

# Bioacoustic (BirdNET + optional Perch multi-taxa)
BIOACOUSTIC_PIPELINE=birdnet
BIOACOUSTIC_MIN_CONFIDENCE=0.15
BIOACOUSTIC_RETURN_ALL_DETECTIONS=true
BIOACOUSTIC_NOISE_REDUCTION=false
BIOACOUSTIC_ENABLE_FROGS=false
BIOACOUSTIC_ENABLE_INSECTS=false
BIOACOUSTIC_ENABLE_PERCH=false
GBIF_OCCURRENCE_RADIUS_KM=25
EOF

echo "==> Optional: download Perch v2 for multi-taxa"
if [[ "${DOWNLOAD_PERCH:-0}" == "1" ]]; then
  bash "$HOSTINGER/download-perch-model.sh" "$MODEL_DIR"
fi

export COMPOSE_PROFILES=bioacoustic
echo "==> Deploying with COMPOSE_PROFILES=bioacoustic (dedicated ML worker)"
cd "$HOSTINGER"
./deploy.sh

echo "==> Verifying bioacoustic stack..."
if [[ -x ./verify-bioacoustic.sh ]]; then
  ./verify-bioacoustic.sh || true
fi

echo ""
echo "SUCCESS — bioacoustic stack deployed from $BRANCH"
echo "  Web:  https://aranyix.tech/bioacoustic"
echo "  API:  https://api.aranyix.tech/health/workers"
echo ""
echo "Multi-taxa: DOWNLOAD_PERCH=1 ./vps-merge-bioacoustic.sh"
echo "Then set BIOACOUSTIC_ENABLE_PERCH=true and BIOACOUSTIC_PIPELINE=composite in .env.production"
