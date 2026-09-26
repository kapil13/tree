#!/usr/bin/env bash
# Verify Resend auth email wiring on VPS — config flags + optional live send test.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.prod.yml"
SEND_TEST="${1:-}"

if [[ -n "$SEND_TEST" ]]; then
  if [[ "$SEND_TEST" == *"@"* ]]; then
    :
  else
    echo "ERROR: Pass a real email address. Example:"
    echo "  ./verify-ses.sh you@example.com"
    exit 1
  fi
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy from .env.production.example and set RESEND_API_KEY."
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
echo "==> Resend env inside backend container"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend \
  python3 -c "
from app.core.config import settings
print('AUTH_OTP_EMAIL_ENABLED=', settings.auth_otp_email_enabled)
print('RESEND_FROM_EMAIL=', settings.resend_from_email or 'MISSING')
print('RESEND_API_KEY=', 'set' if (settings.resend_api_key or '').strip() else 'MISSING')
print('RESEND_FROM_NAME=', settings.resend_from_name)
"

echo ""
echo "==> Detailed verify_resend report"
VERIFY_ARGS=()
if [[ -n "$SEND_TEST" ]]; then
  VERIFY_ARGS=(--send-test "$SEND_TEST")
fi
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend \
  python3 -m app.scripts.verify_resend "${VERIFY_ARGS[@]}"

echo ""
echo "Done. Signup email OTP: POST /api/v1/auth/signup/send-email-otp"
echo "Login email OTP: POST /api/v1/auth/otp/request with {\"email\":\"...\"}"
echo "Forgot password: POST /api/v1/auth/password-reset/request"
echo "Optional live test: ./verify-ses.sh you@example.com"
