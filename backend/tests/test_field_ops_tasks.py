"""Tests for unified field-ops priority task feed."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.planting_projects.field_ops import build_field_ops_priority_tasks


def _field_ops_db_mock() -> AsyncMock:
    db = AsyncMock()

    async def fake_execute(*_args, **_kwargs):
        result = MagicMock()
        result.all.return_value = []
        return result

    db.execute = fake_execute
    return db


@pytest.mark.asyncio
async def test_build_field_ops_priority_tasks_includes_audit_and_survival(monkeypatch):
    project_id = str(uuid.uuid4())
    projects = [
        SimpleNamespace(
            id=uuid.UUID(project_id),
            name="Mine belt",
            code="MINE-1",
            scheme_code="mining_reclamation",
        )
    ]
    project_rows = [
        {
            "id": project_id,
            "name": "Mine belt",
            "code": "MINE-1",
            "open_violations": 0,
            "survival_due": 2,
        }
    ]

    async def fake_closure(db, project):
        return {"applicable": False}

    async def fake_workflow(db, project):
        return {"steps": []}

    monkeypatch.setattr(
        "app.services.planting_projects.field_ops.compute_closure_milestones",
        fake_closure,
    )
    monkeypatch.setattr(
        "app.services.planting_projects.field_ops.build_compliance_workflow",
        fake_workflow,
    )

    tasks = await build_field_ops_priority_tasks(
        _field_ops_db_mock(),
        projects,
        violation_feed=[],
        audit_due_by_project={project_id: 3},
        project_rows=project_rows,
    )

    kinds = {task["kind"] for task in tasks}
    assert "audit" in kinds
    assert "survival" in kinds
    audit_task = next(task for task in tasks if task["kind"] == "audit")
    assert "3 audit plot" in audit_task["detail"]
    assert audit_task["href"] == "/field-ops?section=audit"


@pytest.mark.asyncio
async def test_build_field_ops_priority_tasks_includes_closure_alerts(monkeypatch):
    project_id = str(uuid.uuid4())
    projects = [
        SimpleNamespace(
            id=uuid.UUID(project_id),
            name="Overburden dump",
            code="MINE-2",
            scheme_code="mining_reclamation",
        )
    ]
    project_rows = [
        {
            "id": project_id,
            "name": "Overburden dump",
            "code": "MINE-2",
            "open_violations": 0,
            "survival_due": 0,
        }
    ]

    async def fake_closure(db, project):
        return {
            "applicable": True,
            "alerts": [
                {
                    "kind": "ec_green_belt_shortfall",
                    "phase_code": "phase_ii_greenbelt",
                    "message": "EC green belt covers 40.0% of the required 33%.",
                }
            ],
        }

    async def fake_workflow(db, project):
        return {"steps": []}

    monkeypatch.setattr(
        "app.services.planting_projects.field_ops.compute_closure_milestones",
        fake_closure,
    )
    monkeypatch.setattr(
        "app.services.planting_projects.field_ops.build_compliance_workflow",
        fake_workflow,
    )

    tasks = await build_field_ops_priority_tasks(
        _field_ops_db_mock(),
        projects,
        violation_feed=[],
        audit_due_by_project={},
        project_rows=project_rows,
    )

    assert any(task["kind"] == "closure" for task in tasks)
    closure_task = next(task for task in tasks if task["kind"] == "closure")
    assert "EC green belt" in closure_task["detail"]
