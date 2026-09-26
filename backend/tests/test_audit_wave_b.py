"""Estate Watch Wave B — versioned plans, visit integrity, reconciliation, evidence graph."""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.services.audit_sampling.integrity import check_gps_integrity, check_photo_integrity


def test_photo_integrity_rejects_duplicates():
    passed, meta = check_photo_integrity(["a.jpg", "a.jpg", "b.jpg"])
    assert passed is False
    assert meta["duplicate_photo_keys"] == 1


def test_photo_integrity_accepts_unique_keys():
    passed, _meta = check_photo_integrity(["a.jpg", "b.jpg"])
    assert passed is True


def test_gps_integrity_fails_outside_boundary():
    passed, _meta = check_gps_integrity(inside_boundary=False, location_warnings=["outside_block_boundary"])
    assert passed is False


def test_gps_integrity_passes_inside_boundary():
    passed, _meta = check_gps_integrity(inside_boundary=True, location_warnings=[])
    assert passed is True


def test_sampling_plan_model_has_version_fields():
    from app.models.audit_sampling import AuditSamplingPlan

    assert "plan_version" in AuditSamplingPlan.__table__.c
    assert "parent_plan_id" in AuditSamplingPlan.__table__.c
    assert "superseded_at" in AuditSamplingPlan.__table__.c


def test_field_visit_model_has_lifecycle_fields():
    from app.models.audit_sampling import AuditFieldVisit

    assert "status" in AuditFieldVisit.__table__.c
    assert "idempotency_key" in AuditFieldVisit.__table__.c
    assert "gps_integrity_passed" in AuditFieldVisit.__table__.c
    assert "photo_integrity_passed" in AuditFieldVisit.__table__.c


def test_reconciliation_models_exist():
    from app.models.audit_reconciliation import AuditReconciliationBlock, AuditReconciliationRun

    assert AuditReconciliationRun.__table__.c.cycle_id.foreign_keys
    assert AuditReconciliationBlock.__table__.c.reconciliation is not None


def test_evidence_graph_models_exist():
    from app.models.audit_evidence_graph import AuditEvidenceEdge, AuditEvidenceNode

    names = {c.name for c in AuditEvidenceNode.__table__.constraints}
    assert "audit_evidence_nodes_source_uq" in names
    assert AuditEvidenceEdge.__table__.c.edge_type is not None


@pytest.mark.asyncio
async def test_record_visit_idempotency_returns_existing(monkeypatch):
    from app.services.audit_sampling.visits import record_field_visit

    plot_id = uuid4()
    cycle_id = uuid4()
    existing_id = uuid4()
    existing = SimpleNamespace(
        id=existing_id,
        plot_id=plot_id,
        status="accepted",
        signals={},
    )

    async def fake_require_mutable_cycle(_db, _engagement):
        return SimpleNamespace(id=cycle_id)

    plan_id = uuid4()

    async def fake_get_active_plan(_db, _cycle_id):
        return SimpleNamespace(id=plan_id)

    async def fake_execute(stmt):
        mock = SimpleNamespace()
        sql = str(stmt)

        def scalar_one_or_none():
            if "audit_field_plots" in sql:
                return SimpleNamespace(
                    id=plot_id,
                    plan_id=plan_id,
                    boundary_version_id=uuid4(),
                    engagement_id=uuid4(),
                )
            if "idempotency_key" in sql:
                return existing
            return None

        mock.scalar_one_or_none = scalar_one_or_none
        return mock

    db = SimpleNamespace(execute=fake_execute, flush=lambda: None, add=lambda _x: None)

    monkeypatch.setattr(
        "app.services.audit_governance.engagement.require_mutable_cycle",
        fake_require_mutable_cycle,
    )
    monkeypatch.setattr(
        "app.services.audit_sampling.visits.get_active_sampling_plan",
        fake_get_active_plan,
    )

    engagement = SimpleNamespace(id=uuid4(), status="sampling_planned")
    result = await record_field_visit(
        db,
        engagement=engagement,
        plot_id=plot_id,
        visitor_id=uuid4(),
        tree_presence="present",
        photo_keys=["photo.jpg"],
        visitor_lat=28.0,
        visitor_lon=77.0,
        idempotency_key="mobile-visit-1",
    )
    assert result.id == existing_id
