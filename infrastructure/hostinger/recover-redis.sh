#!/usr/bin/env bash
# Diagnose and recover unhealthy byot-prod-redis-1 on the VPS.
# Run from: infrastructure/hostinger/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.prod.yml"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: missing $ENV_FILE"
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

echo "==> Redis container status"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps redis 2>/dev/null || true

echo ""
echo "==> Disk space (Redis AOF fails when disk is full)"
df -h / /var/lib/docker 2>/dev/null || df -h /

DISK_PCT="$(df / | tail -1 | awk '{print $5}' | tr -d '%')"
if [[ "$DISK_PCT" -ge 95 ]]; then
  echo ""
  echo "WARN: Root disk is ${DISK_PCT}% full — Redis often stays unhealthy until you free space."
  echo "  Run: ./cleanup-docker-disk.sh"
fi

echo ""
echo "==> REDIS_PASSWORD configured?"
if [[ -z "${REDIS_PASSWORD:-}" ]] || [[ "${REDIS_PASSWORD}" == CHANGE_ME* ]]; then
  echo "  ERROR: Set REDIS_PASSWORD in $ENV_FILE (use: openssl rand -hex 32)"
  exit 1
fi
if [[ ! "${REDIS_PASSWORD}" =~ ^[a-fA-F0-9]+$ ]]; then
  echo "  WARN: Password contains non-hex chars — special chars can break healthchecks/URLs."
  echo "        Prefer: openssl rand -hex 32"
fi
echo "  OK (length ${#REDIS_PASSWORD})"

echo ""
echo "==> Redis logs (last 80 lines)"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs redis --tail 80 2>&1 || true

echo ""
echo "==> Manual ping from redis container"
if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T redis \
  sh -c 'redis-cli -a "$REDIS_PASSWORD" ping 2>/dev/null' 2>/dev/null | grep -q PONG; then
  echo "  redis-cli ping: PONG (Redis is up — healthcheck config may be stale; recreate container)"
else
  echo "  redis-cli ping: FAILED"
fi

echo ""
echo "==> Attempting redis recreate (keeps redis-data volume)"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --force-recreate redis

echo "Waiting for healthy (up to 60s)..."
TRIES=0
until docker inspect byot-prod-redis-1 --format '{{.State.Health.Status}}' 2>/dev/null | grep -q healthy; do
  TRIES=$((TRIES + 1))
  if [[ $TRIES -ge 12 ]]; then
    echo ""
    echo "Redis still unhealthy. Common causes:"
    echo "  1. Disk full — run ./cleanup-docker-disk.sh then retry"
    echo "  2. Corrupted AOF after crash — LAST RESORT (clears Redis cache/queue data):"
    echo "       docker compose -f $COMPOSE_FILE --env-file $ENV_FILE stop redis"
    echo "       docker volume rm byot-prod_redis-data   # name may vary: docker volume ls | grep redis"
    echo "       docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d redis"
    echo "  3. Wrong REDIS_PASSWORD — must match .env.production; use hex-only password"
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs redis --tail 40
    exit 1
  fi
  sleep 5
done

echo ""
echo "==> Redis healthy — starting dependent services"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d backend worker beat frontend caddy

echo "Recovery complete. Check: docker compose -f $COMPOSE_FILE --env-file $ENV_FILE ps"
