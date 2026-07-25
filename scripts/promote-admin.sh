#!/usr/bin/env bash
# Promote a user to platform admin by email.
#
# Local (from repo root):
#   ./scripts/promote-admin.sh you@example.com
#
# Production (Hostinger VPS):
#   docker compose -f infrastructure/hostinger/docker-compose.prod.yml \
#     --env-file infrastructure/hostinger/.env.production \
#     exec -T backend python -m app.scripts.promote_admin you@example.com
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/backend"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <email>" >&2
  exit 1
fi

exec python3 -m app.scripts.promote_admin "$@"
