#!/usr/bin/env bash
# Merge and deploy full bioacoustic stack on Aranyix VPS.
# Run on VPS: bash infrastructure/hostinger/vps-merge-bioacoustic.sh
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/aranyix}"
BRANCH="${BRANCH:-cursor/vps-bioacoustic-deploy-f2ba}"
HOSTINGER="${REPO_DIR}/infrastructure/hostinger"
ENV_FILE="${HOSTINGER}/.env.production"

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

# Ensure bioacoustic env (append if missing)
grep -q '^BIOACOUSTIC_PIPELINE=' "$ENV_FILE" || cat >>"$ENV_FILE" <<'EOF'

# Bioacoustic (BirdNET + GBIF + IUCN)
BIOACOUSTIC_PIPELINE=birdnet
BIOACOUSTIC_MIN_CONFIDENCE=0.15
BIOACOUSTIC_RETURN_ALL_DETECTIONS=true
BIOACOUSTIC_NOISE_REDUCTION=false
BIOACOUSTIC_ENABLE_FROGS=false
BIOACOUSTIC_ENABLE_INSECTS=false
BIOACOUSTIC_ENABLE_PERCH=false
GBIF_OCCURRENCE_RADIUS_KM=25
EOF

echo "==> Optional: download Perch v2 for multi-taxa (amphibian/mammal/insect/reptile)"
echo "    bash infrastructure/hostinger/download-perch-model.sh /opt/aranyix/models"
echo "    Then set BIOACOUSTIC_ENABLE_PERCH=true and BIOACOUSTIC_PIPELINE=composite in .env.production"

echo "==> Running database migrations..."
cd "$HOSTINGER"
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T backend \
  alembic upgrade head || true

echo "==> Building and restarting stack (worker includes BirdNET)..."
./deploy.sh

echo "==> Restarting Celery worker for bioacoustic queue..."
docker compose -f docker-compose.prod.yml --env-file .env.production restart worker

echo ""
echo "SUCCESS — bioacoustic stack deployed from $BRANCH"
echo "  Web:  https://aranyix.tech/bioacoustic"
echo "  API:  https://api.aranyix.tech/v1/bioacoustic/regional-fauna"
echo ""
echo "Set IUCN_API_TOKEN in .env.production for live Red List data."
