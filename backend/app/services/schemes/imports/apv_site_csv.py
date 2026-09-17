"""Parse Rajasthan Amrit Poshan Vatika bulk site CSV rows."""

from __future__ import annotations

import csv
import io
from typing import Any

REQUIRED_COLUMNS = frozenset(
    {
        "apv_site_id",
        "project_code",
        "project_name",
        "site_type",
        "gram_panchayat",
        "site_area_ha",
    }
)

COLUMN_ALIASES: dict[str, str] = {
    "apv_site_id": "apv_site_id",
    "site_id": "apv_site_id",
    "project_code": "project_code",
    "code": "project_code",
    "project_name": "project_name",
    "name": "project_name",
    "site_type": "site_type",
    "type": "site_type",
    "gram_panchayat": "gram_panchayat",
    "panchayat": "gram_panchayat",
    "site_area_ha": "site_area_ha",
    "area_ha": "site_area_ha",
    "anganwadi_name": "anganwadi_name",
    "awc_name": "anganwadi_name",
    "awc_code": "awc_code",
    "icds_awc_code": "awc_code",
    "shg_name": "shg_name",
    "mgnrega_job_card_ref": "mgnrega_job_card_ref",
    "mgnrega_ref": "mgnrega_job_card_ref",
    "block_nutrition_officer": "block_nutrition_officer",
    "nutrition_officer": "block_nutrition_officer",
    "target_fruit_trees": "target_fruit_trees",
    "beneficiary_households": "beneficiary_households",
}

VALID_SITE_TYPES = frozenset({"anganwadi", "shg", "panchayat", "school"})


def _normalize_header(name: str) -> str:
    key = name.strip().lower().replace(" ", "_").replace("-", "_")
    return COLUMN_ALIASES.get(key, key)


def parse_apv_site_csv(content: str) -> tuple[list[dict[str, Any]], list[str]]:
    """Return (rows, errors). Each row maps to scheme_refs for raj_amrit_poshan_vatika."""
    reader = csv.DictReader(io.StringIO(content))
    if reader.fieldnames is None:
        return [], ["empty_csv"]

    normalized_fields = {_normalize_header(f): f for f in reader.fieldnames}
    missing = REQUIRED_COLUMNS - set(normalized_fields.keys())
    if missing:
        return [], [f"missing_columns:{','.join(sorted(missing))}"]

    rows: list[dict[str, Any]] = []
    errors: list[str] = []
    for line_no, raw in enumerate(reader, start=2):
        if not any(str(v or "").strip() for v in raw.values()):
            continue
        row: dict[str, Any] = {}
        for norm_key, original_key in normalized_fields.items():
            value = raw.get(original_key)
            if value is not None and str(value).strip():
                row[norm_key] = str(value).strip()

        if not row.get("apv_site_id"):
            errors.append(f"line_{line_no}:missing_apv_site_id")
            continue
        if not row.get("project_code"):
            errors.append(f"line_{line_no}:missing_project_code")
            continue
        site_type = row.get("site_type", "")
        if site_type not in VALID_SITE_TYPES:
            errors.append(f"line_{line_no}:invalid_site_type")
            continue
        try:
            area = float(row.get("site_area_ha", ""))
        except (TypeError, ValueError):
            errors.append(f"line_{line_no}:invalid_site_area_ha")
            continue
        if area < 0.1 or area > 0.5:
            errors.append(f"line_{line_no}:site_area_out_of_range")
            continue

        scheme_refs: dict[str, Any] = {
            "apv_site_id": row["apv_site_id"],
            "site_type": site_type,
            "gram_panchayat": row.get("gram_panchayat", ""),
            "site_area_ha": area,
        }
        for optional in (
            "anganwadi_name",
            "shg_name",
            "awc_code",
            "mgnrega_job_card_ref",
            "block_nutrition_officer",
            "target_fruit_trees",
            "beneficiary_households",
        ):
            if row.get(optional):
                scheme_refs[optional] = row[optional]

        rows.append(
            {
                "project_code": row["project_code"],
                "project_name": row.get("project_name") or row["project_code"],
                "scheme_code": "raj_amrit_poshan_vatika",
                "scheme_refs": scheme_refs,
            }
        )

    return rows, errors


def apply_apv_rows_to_projects(
    projects: list[Any],
    rows: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[str]]:
    """Match APV rows to planting projects by code. Returns (applied, unmatched_codes)."""
    by_code = {p.code: p for p in projects}
    applied: list[dict[str, Any]] = []
    unmatched: list[str] = []

    for row in rows:
        project = by_code.get(row["project_code"])
        if project is None:
            unmatched.append(row["project_code"])
            continue
        meta = dict(project.metadata_ or {})
        refs = dict(meta.get("scheme_refs") or {}) if isinstance(meta.get("scheme_refs"), dict) else {}
        refs.update({k: v for k, v in row["scheme_refs"].items() if v is not None and v != ""})
        meta["scheme_refs"] = refs
        project.scheme_code = project.scheme_code or row["scheme_code"]
        if project.segment == "general":
            project.segment = "nutri_garden"
        project.metadata_ = meta
        applied.append(
            {
                "project_id": str(project.id),
                "project_code": project.code,
                "apv_site_id": refs.get("apv_site_id"),
            }
        )

    return applied, unmatched
