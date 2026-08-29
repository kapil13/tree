#!/usr/bin/env bash
# Provision kapil@axentis.tech on production (run ON the VPS as root/deploy user).
set -euo pipefail
cd /opt/aranyix/infrastructure/hostinger
export PROVISION_USER_PASSWORD="${PROVISION_USER_PASSWORD:?Set PROVISION_USER_PASSWORD (min 12 chars)}"
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T backend \
  python -m app.scripts.provision_professional_user \
  --email kapil@axentis.tech \
  --phone 7014376403 \
  --full-name "Kapil Axentis" \
  --org-name "Axentis NHAI Pilot"
