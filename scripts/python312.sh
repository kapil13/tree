#!/usr/bin/env bash
# Pick Python 3.12 for BYOT backend (3.14 breaks numpy wheels).
if command -v python3.12 >/dev/null 2>&1; then
  echo python3.12
elif [ -x "/opt/homebrew/opt/python@3.12/bin/python3.12" ]; then
  echo "/opt/homebrew/opt/python@3.12/bin/python3.12"
else
  echo ""
fi
