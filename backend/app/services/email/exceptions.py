"""Transactional email errors."""

from __future__ import annotations


class EmailSendError(Exception):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)
