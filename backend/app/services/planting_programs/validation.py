"""Validate tree registration payloads against planting program schemas."""

from __future__ import annotations

from datetime import date
from typing import Any

from app.services.planting_programs.catalog import PROGRAM_CATALOG, ProgramDefinition


class ProgramValidationError(ValueError):
    def __init__(self, errors: list[str]) -> None:
        self.errors = errors
        super().__init__("; ".join(errors))


def _iter_fields(program: ProgramDefinition):
    for section in program["sections"]:
        for field in section["fields"]:
            yield field


def _is_empty(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str) and not value.strip():
        return True
    return False


def validate_program_payload(
    program_code: str,
    *,
    core_values: dict[str, Any],
    metadata: dict[str, Any],
    photo_count: int,
) -> dict[str, Any]:
    program = PROGRAM_CATALOG.get(program_code)
    if program is None:
        raise ProgramValidationError([f"unknown_program:{program_code}"])

    errors: list[str] = []
    cleaned_meta: dict[str, Any] = dict(metadata or {})
    cleaned_meta["registration_program"] = program_code

    for field in _iter_fields(program):
        key = field["key"]
        is_core = bool(field.get("core"))
        value = core_values.get(key) if is_core else cleaned_meta.get(key)
        required = bool(field.get("required"))

        if _is_empty(value):
            if required:
                errors.append(f"missing_required:{key}")
            continue

        field_type = field.get("type", "text")
        if field_type == "number":
            try:
                num = float(value)
            except (TypeError, ValueError):
                errors.append(f"invalid_number:{key}")
                continue
            min_v = field.get("min")
            max_v = field.get("max")
            if min_v is not None and num < min_v:
                errors.append(f"below_min:{key}")
            if max_v is not None and num > max_v:
                errors.append(f"above_max:{key}")
            if is_core:
                core_values[key] = num
            else:
                cleaned_meta[key] = num
        elif field_type == "boolean":
            if isinstance(value, bool):
                parsed = value
            elif isinstance(value, str):
                parsed = value.strip().lower() in {"1", "true", "yes", "on"}
            else:
                parsed = bool(value)
            if is_core:
                core_values[key] = parsed
            else:
                cleaned_meta[key] = parsed
        elif field_type == "date":
            if isinstance(value, date):
                parsed = value
            else:
                try:
                    parsed = date.fromisoformat(str(value))
                except ValueError:
                    errors.append(f"invalid_date:{key}")
                    continue
            if is_core:
                core_values[key] = parsed
            else:
                cleaned_meta[key] = parsed.isoformat()
        elif field_type == "select":
            options = field.get("options") or []
            allowed = {opt["value"] for opt in options}
            val = str(value)
            if allowed and val not in allowed:
                errors.append(f"invalid_option:{key}")
            elif is_core:
                core_values[key] = val
            else:
                cleaned_meta[key] = val
        else:
            val = str(value).strip()
            if is_core:
                core_values[key] = val
            else:
                cleaned_meta[key] = val

    min_photos = int(program.get("min_photos") or 0)
    if photo_count < min_photos:
        errors.append(f"min_photos:{min_photos}")

    if errors:
        raise ProgramValidationError(errors)

    return cleaned_meta
