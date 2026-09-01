"""Legacy SES verify script — auth email now uses Resend (see verify_resend.py)."""

from __future__ import annotations

import sys

from app.scripts import verify_resend

if __name__ == "__main__":
    print(
        "NOTE: Auth email delivery now uses Resend. Running verify_resend instead.\n",
        file=sys.stderr,
    )
    raise SystemExit(verify_resend.main())
