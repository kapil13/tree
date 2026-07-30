#!/usr/bin/env bash
# Reclaim disk from Docker images, build cache, and container logs.
# Safe default: does NOT remove named volumes (postgres/minio data).
# Run on the VPS from: infrastructure/hostinger/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.prod.yml"

TRUNCATE_LOGS=0
FULL_RECLAIM=0
for arg in "$@"; do
  case "$arg" in
    --truncate-logs) TRUNCATE_LOGS=1 ;;
    --full-reclaim) FULL_RECLAIM=1 ;;
  esac
done

echo "==> Disk before cleanup"
df -h / /var/lib/docker 2>/dev/null || df -h /
docker system df

echo ""
if [[ "${SKIP_CONFIRM:-}" == "1" ]] || [[ "${1:-}" == "-y" ]] || [[ "${2:-}" == "-y" ]]; then
  confirm=y
else
  read -r -p "Proceed with Docker disk cleanup? [y/N] " confirm
fi
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

if [[ "$TRUNCATE_LOGS" == "1" ]] || [[ "$FULL_RECLAIM" == "1" ]]; then
  echo "==> Truncating container log files..."
  if [[ -d /var/lib/docker/containers ]]; then
  sudo find /var/lib/docker/containers -name '*-json.log' -print -exec truncate -s 0 {} \;
  else
    echo "(no container logs found)"
  fi
fi

if [[ "$FULL_RECLAIM" == "1" ]]; then
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "ERROR: $ENV_FILE required for --full-reclaim" >&2
    exit 1
  fi
  echo "==> Stopping stack (volumes kept — DB and MinIO data safe)..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down --remove-orphans
  echo "==> Removing ALL unused images and build cache..."
  docker system prune -a -f
  docker builder prune -af
  echo "==> Restarting stack..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build
else
  echo "==> Pruning dangling images..."
  docker image prune -f

  echo "==> Pruning unused images not referenced by any container..."
  docker image prune -a -f

  echo "==> Pruning build cache..."
  docker builder prune -af

  echo "==> Pruning stopped containers..."
  docker container prune -f
fi

echo ""
echo "==> Disk after cleanup"
df -h / /var/lib/docker 2>/dev/null || df -h /
docker system df

echo ""
echo "Done."
if [[ "$TRUNCATE_LOGS" == "0" ]] && [[ "$FULL_RECLAIM" == "0" ]]; then
  echo "If disk is still high, run: ./deep-disk-audit.sh"
  echo "Then: ./cleanup-docker-disk.sh -y --truncate-logs"
  echo "Last resort: ./cleanup-docker-disk.sh -y --full-reclaim"
fi
