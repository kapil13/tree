"""Estate Watch Wave E — explain-only AI narratives (P14)."""

from __future__ import annotations

import pytest

from app.api.v1 import audit_engagements as audit_api


def test_wave_e_model_exists():
    from app.models.audit_explain import AuditExplainRun

    assert AuditExplainRun.__table__.c.target_type is not None
    assert AuditExplainRun.__table__.c.mode is not None
    assert AuditExplainRun.__table__.c.answer is not None


def test_wave_e_routes_exist():
    names = {
        "explain_audit_anomaly",
        "explain_audit_reconciliation",
        "explain_audit_evidence_graph",
        "explain_cross_estate_pattern",
        "list_engagement_explain_runs",
    }
    for name in names:
        assert name in dir(audit_api)


def test_rules_explain_anomaly():
    from app.services.audit_explain.rules import explain_anomaly

    answer, citations = explain_anomaly(
        {
            "anomaly": {
                "id": "a1",
                "anomaly_type": "ndvi_acute_drop",
                "severity": "high",
                "title": "NDVI drop",
                "summary": "NDVI fell sharply vs T0.",
                "signals": {"change_vs_t0": -0.2},
            },
            "boundary_name": "Block A",
        }
    )
    assert "NDVI drop" in answer
    assert citations


def test_rules_explain_reconciliation_mismatch():
    from app.services.audit_explain.rules import explain_reconciliation_block

    answer, _citations = explain_reconciliation_block(
        {
            "block": {
                "boundary_name": "Block B",
                "confidence_grade": "green",
                "field_grade": "red",
                "visit_count": 2,
                "reconciliation": "mismatch",
            }
        }
    )
    assert "mismatch" in answer.lower() or "does not align" in answer.lower()


def test_input_manifest_hash_stable():
    from app.services.audit_explain.service import input_manifest_hash

    ctx = {"a": 1, "b": "test"}
    assert input_manifest_hash(ctx) == input_manifest_hash(ctx)
    assert len(input_manifest_hash(ctx)) == 64


@pytest.mark.asyncio
async def test_llm_returns_none_without_keys(monkeypatch):
    import app.services.audit_explain.llm as llm_mod

    monkeypatch.setattr(llm_mod.settings, "openai_api_key", None)
    monkeypatch.setattr(llm_mod.settings, "gemini_api_key", None)

    answer, provider, _error = await llm_mod.enrich_explain_narrative(
        {"x": 1}, target_type="anomaly"
    )
    assert answer is None
    assert provider is None
