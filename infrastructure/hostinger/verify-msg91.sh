#!/usr/bin/env bash
# Verify MSG91 OTP wiring on VPS — config flags + optional live send test.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.prod.yml"
SEND_TEST="${1:-}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy from .env.production.example and set MSG91 keys."
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

echo "==> OTP config via public API (no secrets)"
OTP_JSON="$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend \
  curl -fsS http://localhost:8000/api/v1/auth/otp-config 2>/dev/null || echo '{}')"
echo "$OTP_JSON" | python3 -m json.tool 2>/dev/null || echo "$OTP_JSON"

echo ""
echo "==> MSG91 env inside backend container"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend \
  python3 -c "
from app.core.config import settings
print('AUTH_OTP_SMS_ENABLED=', settings.auth_otp_sms_enabled)
print('MSG91_AUTH_KEY=', 'set' if settings.msg91_auth_key else 'MISSING')
print('MSG91_OTP_TEMPLATE_ID=', settings.msg91_otp_template_id or 'MISSING')
print('MSG91_SENDER_ID=', settings.msg91_sender_id or 'MISSING')
"

echo ""
echo "==> Detailed verify_msg91 report"
VERIFY_ARGS=()
if [[ -n "$SEND_TEST" ]]; then
  VERIFY_ARGS=(--send-test "$SEND_TEST")
fi
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend \
  python3 -m app.scripts.verify_msg91 "${VERIFY_ARGS[@]}"

echo ""
echo "Done. Signup phone OTP: POST /api/v1/auth/signup/start"
echo "Login phone OTP: POST /api/v1/auth/otp/request with {\"phone\":\"...\"}"
echo "Optional live test: ./verify-msg91.sh 9876543210"
