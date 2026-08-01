"""Parse State CAMPA Annual Plan of Operation (APO) CSV rows."""

from __future__ import annotations

import csv
import io
from typing import Any

REQUIRED_COLUMNS = frozenset(
    {"pca_number", "state_name", "apo_financial_year", "project_code", "project_name"}
)

COLUMN_ALIASES: dict[str, str] = {
    "pca": "pca_number",
    "pca_no": "pca_number",
    "pca_number": "pca_number",
    "state": "state_name",
    "state_name": "state_name",
    "state_ut": "state_name",
    "financial_year": "apo_financial_year",
    "apo_financial_year": "apo_financial_year",
    "fy": "apo_financial_year",
    "project_code": "project_code",
    "code": "project_code",
    "project_name": "project_name",
    "name": "project_name",
    "forest_diversion_id": "forest_diversion_id",
    "fc_reference": "forest_diversion_id",
}


def _normalize_header(name: str) -> str:
    key = name.strip().lower().replace(" ", "_").replace("-", "_")
    return COLUMN_ALIASES.get(key, key)


def parse_campa_apo_csv(content: str) -> tuple[list[dict[str, Any]], list[str]]:
    """Return (rows, errors). Each row maps to scheme_refs for campa_ca projects."""
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

        if not row.get("pca_number"):
            errors.append(f"line_{line_no}:missing_pca_number")
            continue
        if not row.get("project_code"):
            errors.append(f"line_{line_no}:missing_project_code")
            continue

        rows.append(
            {
                "project_code": row["project_code"],
                "project_name": row.get("project_name") or row["project_code"],
                "scheme_code": "campa_ca",
                "scheme_refs": {
                    "pca_number": row["pca_number"],
                    "state_name": row.get("state_name", ""),
                    "apo_financial_year": row.get("apo_financial_year", ""),
                    "forest_diversion_id": row.get("forest_diversion_id", ""),
                },
            }
        )

    return rows, errors


def apply_apo_rows_to_projects(
    projects: list[Any],
    rows: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[str]]:
    """Match APO rows to planting projects by code. Returns (applied, unmatched_codes)."""
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
        refs.update({k: v for k, v in row["scheme_refs"].items() if v})
        meta["scheme_refs"] = refs
        project.scheme_code = project.scheme_code or row["scheme_code"]
        project.metadata_ = meta
        applied.append(
            {
                "project_id": str(project.id),
                "project_code": project.code,
                "pca_number": refs.get("pca_number"),
            }
        )

    return applied, unmatched
