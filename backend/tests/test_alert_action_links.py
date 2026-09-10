"""Alert action link derivation."""

from __future__ import annotations

import uuid

from app.services.alerts.action_links import alert_action_fields


def test_tree_alert_links_to_tree_detail():
    tree_id = uuid.uuid4()
    out = alert_action_fields(
        kind="survival_survey_due",
        tree_id=tree_id,
        payload={"project_id": str(uuid.uuid4())},
    )
    assert out["entity_type"] == "tree"
    assert out["entity_id"] == str(tree_id)
    assert out["deep_link"] == f"/trees/{tree_id}"
    assert "survey" in (out["recommended_action"] or "").lower()


def test_fence_alert_links_to_satellite():
    fence_id = str(uuid.uuid4())
    out = alert_action_fields(
        kind="sar_integrity_drop",
        tree_id=None,
        payload={"fence_id": fence_id},
    )
    assert out["entity_type"] == "work_area"
    assert out["entity_id"] == fence_id
    assert out["deep_link"] == f"/satellite?fence={fence_id}"


def test_compliance_project_alert():
    project_id = str(uuid.uuid4())
    out = alert_action_fields(
        kind="compliance_open",
        tree_id=None,
        payload={"project_id": project_id},
    )
    assert out["entity_type"] == "project"
    assert out["deep_link"] == f"/projects/{project_id}?tab=compliance"
