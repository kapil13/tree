"""Validate scheme metadata stored on planting projects."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status

from app.services.schemes.metadata_fields import SCHEME_METADATA_FIELDS
from app.services.schemes.registry import get_scheme


def _scheme_refs(metadata: dict[str, Any]) -> dict[str, Any]:
    refs = metadata.get("scheme_refs")
    return dict(refs) if isinstance(refs, dict) else {}


def validate_scheme_metadata(
    scheme_code: str | None,
    metadata: dict[str, Any],
    *,
    strict: bool = True,
) -> dict[str, Any]:
    """Validate and normalize scheme_refs. Raises HTTP 422 when strict and invalid."""
    if not scheme_code:
        return metadata

    scheme = get_scheme(scheme_code)
    if scheme is None:
        if strict:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="unknown_scheme")
        return metadata

    fields = SCHEME_METADATA_FIELDS.get(scheme_code, [])
    refs = _scheme_refs(metadata)
    errors: list[str] = []

    for field in fields:
        key = field["key"]
        value = refs.get(key)
        required = field.get("required", False)
        if required and (value is None or str(value).strip() == ""):
            errors.append(key)
            continue
        if value is None or value == "":
            continue
        ftype = field.get("type", "text")
        if ftype == "number":
            try:
                num = float(value)
            except (TypeError, ValueError):
                errors.append(key)
                continue
            min_v = field.get("min")
            max_v = field.get("max")
            if min_v is not None and num < float(min_v):
                errors.append(key)
            if max_v is not None and num > float(max_v):
                errors.append(key)
        elif ftype == "select":
            allowed = {opt["value"] for opt in field.get("options", [])}
            if allowed and str(value) not in allowed:
                errors.append(key)

    if errors and strict:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "scheme_metadata_invalid", "fields": errors},
        )

    normalized = dict(metadata)
    normalized["scheme_refs"] = refs
    return normalized


def merge_scheme_metadata(
    existing: dict[str, Any],
    scheme_refs: dict[str, Any],
    *,
    funding_sources: list[dict[str, Any]] | None = None,
    convergence: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    merged = dict(existing)
    current_refs = _scheme_refs(merged)
    current_refs.update({k: v for k, v in scheme_refs.items() if v is not None})
    merged["scheme_refs"] = current_refs
    if funding_sources is not None:
        merged["funding_sources"] = funding_sources
    if convergence is not None:
        merged["convergence"] = convergence
    return merged
