"""Estate Watch Wave A — cycle scope, methodology, export entities, audit runs."""

from __future__ import annotations

import hashlib
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.services.audit_cycles.run_wrapper import output_manifest_hash
from app.services.audit_export.persist import content_manifest_hash
from app.services.audit_governance.methodology import (
    ESTATE_WATCH_METHODOLOGY_VERSION,
    METHODOLOGY_SEED,
)


def test_methodology_version_constant():
    assert ESTATE_WATCH_METHODOLOGY_VERSION == "estate-watch-1.0.0"
    assert METHODOLOGY_SEED["version"] == ESTATE_WATCH_METHODOLOGY_VERSION


def test_content_manifest_hash_is_stable():
    files = [
        {"path": "a.json", "sha256": "abc", "size_bytes": 10},
        {"path": "b.json", "sha256": "def", "size_bytes": 20},
    ]
    assert content_manifest_hash(files) == content_manifest_hash(files)
    assert len(content_manifest_hash(files)) == 64


def test_output_manifest_hash_for_dict():
    payload = {"blocks_assessed": 3, "anomalies_detected": 1}
    assert output_manifest_hash(payload) == output_manifest_hash(payload)


def test_evidence_models_declare_cycle_id():
    from app.models.audit_confidence import AuditConfidenceAssessment
    from app.models.audit_risk import AuditAnomalyEvent, AuditRiskAssessment
    from app.models.audit_sampling import AuditFieldPlot, AuditSamplingPlan
    from app.models.audit_satellite import AuditSatelliteBaseline

    for model in (
        AuditSatelliteBaseline,
        AuditConfidenceAssessment,
        AuditAnomalyEvent,
        AuditRiskAssessment,
        AuditSamplingPlan,
        AuditFieldPlot,
    ):
        assert "cycle_id" in model.__table__.c


def test_export_entity_models_exist():
    from app.models.audit_export_entity import AuditExport, AuditExportFile

    assert "content_manifest_hash" in AuditExport.__table__.c
    assert "unsigned_bundle_hash" in AuditExport.__table__.c
    assert "package_sha256" in AuditExport.__table__.c
    assert AuditExportFile.__table__.c.export_id.foreign_keys


@pytest.mark.asyncio
async def test_resolve_read_cycle_id_prefers_open_cycle():
    from app.services.audit_cycles.scope import resolve_read_cycle_id

    engagement_id = uuid4()
    open_cycle_id = uuid4()
    db = SimpleNamespace()

    async def fake_get_current(_db, _engagement_id):
        return SimpleNamespace(id=open_cycle_id)

    import app.services.audit_cycles.scope as scope_mod

    scope_mod.get_current_cycle = fake_get_current
    resolved = await resolve_read_cycle_id(db, engagement_id)
    assert resolved == open_cycle_id


def test_cycle_scoped_unique_constraints():
    from app.models.audit_confidence import AuditConfidenceAssessment

    names = {c.name for c in AuditConfidenceAssessment.__table__.constraints}
    assert "audit_confidence_assessments_boundary_uq" in names


def test_distinct_export_hashes():
    files = [{"path": "manifest.json", "sha256": "aaa", "size_bytes": 100}]
    manifest = content_manifest_hash(files)
    unsigned = hashlib.sha256(b"unsigned-zip").hexdigest()
    package = hashlib.sha256(b"signed-zip").hexdigest()
    assert manifest != unsigned
    assert unsigned != package
