#!/usr/bin/env bash
# Deploy MRV sprint stack (0037–0043) on Hostinger VPS and print verification paths.
#
# Run ON THE VPS from repo root or infrastructure/hostinger/:
#   cd /opt/byot/infrastructure/hostinger
#   ./deploy-mrv-sprints.sh
#
# Options:
#   SKIP_PULL=1          Skip git pull
#   FORCE_FRONTEND_REBUILD=1  Bust frontend Docker cache (same as deploy.sh)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [[ "${SKIP_PULL:-}" != "1" ]]; then
  echo "==> Pulling latest from origin..."
  git -C "$REPO_ROOT" pull --ff-only origin "$(git -C "$REPO_ROOT" branch --show-current)" || {
    echo "WARN: git pull failed — continuing with current checkout"
  }
fi

echo "==> Running standard deploy..."
./deploy.sh

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.prod.yml"

echo "==> Verifying Alembic head (expect 0045_vm0047_icvcm or later)..."
HEAD="$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend alembic current 2>/dev/null | tail -1 || true)"
echo "    Current revision: ${HEAD:-unknown}"

for rev in 0037_tree_measurements 0038_carbon_uncertainty 0039_mortality_dynamic_buffer 0040_dpdp_privacy 0041_audit_evidence_chain 0042_registry_credit_ledger 0043_user_locale 0045_vm0047_icvcm; do
  if echo "$HEAD" | grep -q "$rev"; then
    echo "    ✓ At or past $rev"
  fi
done

echo ""
echo "==> API health..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend curl -fsS http://localhost:8000/health/live >/dev/null
echo "    ✓ Backend live"

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

APP_URL="https://${APP_DOMAIN:-localhost}"
API_URL="https://${API_DOMAIN:-localhost}"

cat <<EOF

╔══════════════════════════════════════════════════════════════════╗
║  MRV Sprint deploy complete — UI verification paths              ║
╚══════════════════════════════════════════════════════════════════╝

Login: demo@byot.earth / byotdemo1234!  (after: make seed / seed_demo)

Sprint 1–2  Measurement time-series
  ${APP_URL}/trees → open tree → "Measurement history"

Sprint 2–3  Uncertainty (90% CI)
  ${APP_URL}/settings/carbon → Calculate → CO₂e range

Sprint 3–4  Mortality + NPRT buffer
  ${APP_URL}/settings/carbon → Ex-ante / buffer / mortality metrics
  ${APP_URL}/projects → [project] → Credits tab → NPRT form + ledger

Sprint 4–5  DPDP privacy
  ${APP_URL}/settings/privacy → export / consent / grievance
  ${APP_URL}/settings/sprint-verify → full checklist

Sprint 5–6  Tamper-evident audit + signed evidence
  ${APP_URL}/projects → [project] → Compliance → evidence bundle (signed)
  ${API_URL}/api/v1/evidence/signing-key → Ed25519 public key
  ${API_URL}/docs → GET /audit/chain/verify (admin)

Sprint 7–8  Registry credit ledger + verifier workflow
  ${APP_URL}/projects → [project] → Credits → serials + verifier sample
  ${API_URL}/docs → POST /credits/claims, /verification/projects/{id}/samples

Sprint 8–9  BRSR Core (SEBI) export
  ${APP_URL}/reports → BRSR (SEBI) tab → Export assurance pack
  ${API_URL}/docs → POST /reports/brsr (viewers / auditors read-only)

Sprint 9–10  ISO 14064-2 + Hindi web + WCAG
  ${APP_URL}/reports → ISO 14064-2 tab → Export project report
  ${API_URL}/docs → POST /reports/iso14064
  ${APP_URL}/settings → Language preference (Hindi)
  ${APP_URL}/auth → Hindi auth strings + language switcher

Sprint 11–12  TNFD + GHG Land Sector + Darwin Core
  ${APP_URL}/reports → TNFD / GHG / Darwin Core tabs
  ${API_URL}/docs → POST /reports/tnfd, /reports/ghg-protocol, /reports/darwin-core
  ${API_URL}/docs → GET /ogc/stac/catalog, /ogc/projects/{id}/features

Sprint 12–13  Green Credit Rules (MoEFCC)
  ${APP_URL}/projects → [green credit project] → Credits → Green Credit estimate
  ${API_URL}/docs → GET /credits/projects/{id}/green-credit

Sprint 13–14  Full VM0047 + ICVCM
  ${APP_URL}/projects → [project] → Credits → VM0047 accounting
  ${APP_URL}/projects → [project] → Compliance → ICVCM CCPs checklist
  ${API_URL}/docs → GET /planting-projects/{id}/vm0047/summary

API docs: ${API_URL}/docs
Migrations: docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec backend alembic upgrade head

EOF
