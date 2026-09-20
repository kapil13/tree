"""Estate Watch Wave D — export depth, methodology, verification, RBAC."""

from __future__ import annotations

import inspect

from app.api.v1 import audit_engagements as audit_api


def test_wave_d_models_exist():
    from app.models.audit_export_artifact import AuditExportArtifact, AuditExportVerification
    from app.models.audit_export_entity import AuditExport
    from app.models.audit_finality import AuditVerificationSnapshot
    from app.models.audit_methodology_governance import (
        AuditEngagementMethodologyOverride,
        AuditMethodologyChangeLog,
    )

    assert AuditExportArtifact.__table__.c.zip_bytes is not None
    assert AuditExportVerification.__table__.c.valid is not None
    assert "signature_json" in AuditExport.__table__.c
    assert "export_id" in AuditVerificationSnapshot.__table__.c
    assert "frozen_at" in AuditExport.__table__.c
    assert AuditEngagementMethodologyOverride.__table__.c.methodology_version is not None
    assert AuditMethodologyChangeLog.__table__.c.to_version is not None


def test_wave_d_export_routes_exist():
    names = {
        "list_audit_exports",
        "get_audit_export_detail",
        "download_frozen_audit_export",
        "verify_audit_export",
        "list_audit_methodologies",
        "get_audit_methodology_bundle",
        "get_engagement_methodology_binding",
        "update_engagement_methodology_binding",
        "get_engagement_methodology_change_log",
    }
    for name in names:
        assert name in dir(audit_api)


def test_detect_block_anomalies_accepts_methodology_threshold():
    from app.services.audit_risk.detect import detect_block_anomalies

    params = inspect.signature(detect_block_anomalies).parameters
    assert "ndvi_acute_drop_threshold" in params

    anomalies = detect_block_anomalies(
        block_name="Block A",
        temporal_observations=[
            {"phase": "t0", "ndvi_mean": 0.5},
            {"phase": "current", "ndvi_mean": 0.2},
        ],
        confidence_grade="amber",
        confidence_score=50,
        plausibility_verdict="plausible",
        gis_block_issues=[],
        trees_claimed=100,
        ndvi_acute_drop_threshold=-0.15,
    )
    types = {a["anomaly_type"] for a in anomalies}
    assert "ndvi_acute_drop" in types


def test_access_helpers_exported():
    from app.services.audit_governance.access import (
        can_read_audit_engagement,
        can_verify_audit_export,
        can_write_audit_engagement,
    )

    assert callable(can_read_audit_engagement)
    assert callable(can_write_audit_engagement)
    assert callable(can_verify_audit_export)


def test_methodology_resolver_exports():
    from app.services.audit_governance.methodology_resolver import (
        bind_engagement_methodology,
        get_methodology_bundle,
        resolve_thresholds,
    )

    assert callable(get_methodology_bundle)
    assert callable(resolve_thresholds)
    assert callable(bind_engagement_methodology)
