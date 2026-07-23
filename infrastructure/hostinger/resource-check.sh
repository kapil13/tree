#!/usr/bin/env bash
# Diagnose VPS disk + RAM usage for the BYOT stack.
# Run on the VPS from: infrastructure/hostinger/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.prod.yml"

echo "═══════════════════════════════════════════════════════════════"
echo " BYOT resource check — $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "═══════════════════════════════════════════════════════════════"

echo ""
echo "==> Host RAM (your KVM 4 plan has 16 GB — usage above ~14 GB is risky)"
free -h

echo ""
echo "==> Host disk (your plan has 200 GB NVMe — 124 GB here is DISK, not RAM)"
df -h / /var/lib/docker 2>/dev/null || df -h /

echo ""
echo "==> Docker disk breakdown (images/build cache are the usual 100 GB+ culprits)"
docker system df -v 2>/dev/null || docker system df

echo ""
echo "==> Largest Docker images"
docker images --format 'table {{.Repository}}\t{{.Tag}}\t{{.Size}}' 2>/dev/null | head -20 || true

echo ""
echo "==> Per-container live RAM/CPU (docker stats)"
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.CPUPerc}}' 2>/dev/null || true

echo ""
echo "==> Compose memory limits (0 = unlimited — deploy.resources is NOT enforced by docker compose)"
for name in byot-prod-postgres-1 byot-prod-redis-1 byot-prod-backend-1 byot-prod-worker-1 \
            byot-prod-beat-1 byot-prod-frontend-1 byot-prod-caddy-1 byot-prod-minio-1; do
  docker inspect "$name" --format '{{.Name}} memory limit: {{.HostConfig.Memory}} bytes' 2>/dev/null || true
done

if [[ -f "$ENV_FILE" ]]; then
  echo ""
  echo "==> Stack status"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -a 2>/dev/null || true
fi

echo ""
echo "==> Perch model on disk (optional ML assets)"
MODEL_DIR="${PERCH_MODEL_HOST_DIR:-/opt/aranyix/models}"
if [[ -d "$MODEL_DIR" ]]; then
  du -sh "$MODEL_DIR" 2>/dev/null || true
  ls -lh "$MODEL_DIR" 2>/dev/null || true
else
  echo "(no $MODEL_DIR)"
fi

echo ""
echo "==> What usually causes 100+ GB with no user data"
cat <<'EOF'
  1. DISK: repeated deploy.sh runs build --no-cache + up --build → old images pile up
  2. DISK: worker image with TensorFlow is ~3–5 GB per retained build
  3. RAM:  deploy.resources.limits in compose is IGNORED unless you use Docker Swarm
  4. RAM:  TensorFlow worker can use 2–4 GB even when idle
  5. DATA: postgres/minio volumes stay small until you upload trees/media

Safe cleanup (run ./cleanup-docker-disk.sh) frees dangling images + build cache.
EOF
