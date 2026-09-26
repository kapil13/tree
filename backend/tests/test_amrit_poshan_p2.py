"""P2 tests for Amrit Poshan Vatika scheme."""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.services.bioacoustic.bio_monitoring_protocols import protocol_for_scheme
from app.services.schemes.imports.apv_site_csv import parse_apv_site_csv
from app.services.schemes.metadata_fields import (
    SCHEME_METADATA_FIELDS,
    metadata_sections_for_scheme,
)
from app.services.schemes.nutri_outcomes import merge_nutri_outcomes, nutri_outcome_summary


def test_parse_apv_site_csv_valid_row():
    csv_text = (
        "apv_site_id,project_code,project_name,site_type,gram_panchayat,site_area_ha,"
        "awc_code,block_nutrition_officer,beneficiary_households\n"
        "APV-RJ-001,APV-KB-01,Kishangarh Bas AWC,anganwadi,Kishangarh Bas,0.25,"
        "RJ-08-1234,Meena Devi,18\n"
    )
    rows, errors = parse_apv_site_csv(csv_text)
    assert not errors
    assert len(rows) == 1
    assert rows[0]["scheme_refs"]["awc_code"] == "RJ-08-1234"
    assert rows[0]["scheme_refs"]["beneficiary_households"] == "18"


def test_parse_apv_site_csv_invalid_area():
    csv_text = (
        "apv_site_id,project_code,project_name,site_type,gram_panchayat,site_area_ha\n"
        "APV-RJ-001,APV-KB-01,Site,anganwadi,GP,0.8\n"
    )
    rows, errors = parse_apv_site_csv(csv_text)
    assert not rows
    assert any("site_area_out_of_range" in err for err in errors)


def test_apv_metadata_includes_icds_fields():
    keys = {f["key"] for f in SCHEME_METADATA_FIELDS["raj_amrit_poshan_vatika"]}
    assert "awc_code" in keys
    assert "block_nutrition_officer" in keys
    assert "beneficiary_households" in keys


def test_apv_metadata_sections_split():
    sections = metadata_sections_for_scheme("raj_amrit_poshan_vatika")
    assert len(sections) == 2
    assert sections[1]["id"] == "nutri_outcomes"


def test_merge_nutri_outcomes_harvest_log():
    metadata = merge_nutri_outcomes(
        {},
        beneficiary_households=20,
        harvest_log={"season": "kharif", "fruit_kg": 42.5, "notes": "Guava"},
    )
    outcomes = metadata["nutri_garden_outcomes"]
    assert outcomes["beneficiary_households"] == 20
    assert len(outcomes["harvest_logs"]) == 1
    assert outcomes["harvest_logs"][0]["fruit_kg"] == 42.5


def test_merge_nutri_outcomes_invalid_season():
    with pytest.raises(HTTPException) as exc:
        merge_nutri_outcomes({}, harvest_log={"season": "winter", "fruit_kg": 10})
    assert exc.value.status_code == 422


def test_nutri_outcome_summary():
    metadata = {
        "scheme_refs": {"beneficiary_households": 12},
        "nutri_garden_outcomes": {
            "harvest_logs": [{"season": "rabi", "fruit_kg": 10}, {"season": "kharif", "fruit_kg": 5}],
        },
    }
    summary = nutri_outcome_summary(metadata)
    assert summary["beneficiary_households"] == 12
    assert summary["harvest_log_count"] == 2
    assert summary["total_harvest_kg"] == 15.0


def test_bioacoustic_protocol_for_apv():
    protocol = protocol_for_scheme("raj_amrit_poshan_vatika")
    assert protocol["protocol_key"] == "raj_amrit_poshan_vatika"
    assert protocol["cadence_days"] == 60
