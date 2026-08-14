#!/usr/bin/env python3
"""Verify a BYOT evidence bundle zip and detached signature JSON.

Usage:
  python -m app.scripts.verify_evidence_bundle bundle.zip signature.json
  python -m app.scripts.verify_evidence_bundle bundle.zip  # uses server public key via env
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from app.services.evidence.signing import public_key_material, verify_evidence_zip


def main(argv: list[str] | None = None) -> int:
    args = argv if argv is not None else sys.argv[1:]
    if len(args) < 1:
        print("Usage: verify_evidence_bundle.py <bundle.zip> [signature.json]", file=sys.stderr)
        return 2

    zip_path = Path(args[0])
    zip_bytes = zip_path.read_bytes()

    signature_b64: str | None = None
    public_key_b64: str | None = None
    expected_sha256: str | None = None

    if len(args) >= 2:
        meta = json.loads(Path(args[1]).read_text())
        signature_b64 = meta.get("signature_b64")
        public_key_b64 = meta.get("public_key_b64")
        expected_sha256 = meta.get("zip_sha256")
    else:
        _, public_key_b64 = public_key_material()

    if not signature_b64:
        print("ERROR: signature_b64 required (pass signature.json)", file=sys.stderr)
        return 2

    result = verify_evidence_zip(
        zip_bytes,
        signature_b64=signature_b64,
        public_key_b64=public_key_b64,
        expected_sha256=expected_sha256,
    )
    print(json.dumps(result, indent=2))
    return 0 if result.get("valid") else 1


if __name__ == "__main__":
    raise SystemExit(main())
