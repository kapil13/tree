"""P1 tests for Amrit Poshan Vatika scheme."""

from __future__ import annotations

from app.services.compliance.checklists import get_checklist
from app.services.planting_projects.mrv_export import _segment_report


def test_nutri_garden_segment_report():
    report = _segment_report(
        "nutri_garden",
        [
            {
                "name": "AWC plot",
                "segment_code": "anganwadi_plot",
                "area_ha": 0.22,
            }
        ],
        [{"species": "Guava"}, {"species": "Amla"}],
        80.0,
        {
            "site_type": "anganwadi",
            "apv_site_id": "APV-RJ-2026-001",
            "gram_panchayat": "Kishangarh Bas",
            "site_area_ha": 0.25,
            "target_fruit_trees": 60,
            "mgnrega_job_card_ref": "MGNREGA/2026/44",
        },
    )

    assert report["type"] == "nutri_garden_site"
    assert report["tree_count"] == 2
    assert report["fruit_tree_count"] == 2
    assert report["site_type"] == "anganwadi"
    assert report["declared_site_area_ha"] == 0.25
    assert report["mapped_total_area_ha"] == 0.22
    assert report["block_types"] == {"anganwadi_plot": 1}
    assert report["min_trees_target"] == 50


def test_mgnrega_checklist_auto_keys():
    checklist = get_checklist("mgnrega_convergence")
    assert checklist is not None
    by_id = {item.id: item.auto_key for item in checklist.items}
    assert by_id["work_estimate_id"] == "mgnrega_convergence_ref"
    assert by_id["gram_panchayat"] == "gram_panchayat_documented"
