#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
docker compose -f "$ROOT/infrastructure/docker-compose.db.yml" down
echo "DB containers stopped."
