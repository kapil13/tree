#!/usr/bin/env bash
# Reclaim disk from accumulated Docker images and build cache.
# Safe: does NOT remove running containers or named volumes (postgres/minio data).
# Run on the VPS from: infrastructure/hostinger/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> Disk before cleanup"
df -h / /var/lib/docker 2>/dev/null || df -h /
docker system df

echo ""
if [[ "${SKIP_CONFIRM:-}" == "1" ]] || [[ "${1:-}" == "-y" ]]; then
  confirm=y
else
  read -r -p "Remove unused Docker images and build cache? [y/N] " confirm
fi
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo "==> Pruning dangling images..."
docker image prune -f

echo "==> Pruning unused images not referenced by any container..."
docker image prune -a -f

echo "==> Pruning build cache..."
docker builder prune -af

echo ""
echo "==> Disk after cleanup"
df -h / /var/lib/docker 2>/dev/null || df -h /
docker system df

echo ""
echo "Done. Running stack was not stopped; named volumes (DB, MinIO) were kept."
