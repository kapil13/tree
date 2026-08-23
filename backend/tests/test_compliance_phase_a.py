"""Compliance Phase A — India regulatory depth."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.compliance.checklists import get_checklist
from app.services.compliance.safeguards import ALLOWED_DOC_TYPES, create_safeguard_document
from app.services.reports.brsr_kpi_map import build_core_kpi_sheet_rows, build_value_chain_annex
from app.services.reports.india_exports import (
    build_campa_state_export_context,
    build_green_credit_portal_context,
    render_campa_state_export_xlsx,
    render_green_credit_portal_xlsx,
)


def test_fra_tenure_checklist_exists():
    checklist = get_checklist("fra_tenure")
    assert checklist is not None
    assert len(checklist.items) == 4
    auto_keys = {item.auto_key for item in checklist.items}
    assert "safeguards_gram_sabha" in auto_keys


def test_brsr_core_kpi_mapping():
    rows = build_core_kpi_sheet_rows(
        ghg_inventory=[{"amount_tco2e": 1.5}],
        project_summaries=[{"tree_count": 10}],
        open_violations_total=0,
        value_chain_projects=[{"project_code": "P1"}],
    )
    assert any(r["kpi_id"] == "P6.E4" and r["data_available"] for r in rows)
    assert any(r["kpi_id"] == "P6.E8" and r["data_available"] for r in rows)


def test_value_chain_annex_from_projects():
    project = SimpleNamespace(
        code="SV-01",
        name="Coop site",
        scheme_code="sahakar_van",
        segment="sahakar_van_coop",
        metadata_={"scheme_refs": {"state_name": "Rajasthan", "nccf_project_ref": "NCCF-1"}},
    )
    annex = build_value_chain_annex([project])
    assert annex[0]["supplier_ref"] == "NCCF-1"
    assert annex[0]["state"] == "Rajasthan"


@pytest.mark.asyncio
async def test_create_safeguard_document():
    project = SimpleNamespace(
        id=uuid.uuid4(),
        organization_id=uuid.uuid4(),
    )
    db = AsyncMock()
    db.add = MagicMock()
    db.flush = AsyncMock()

    doc = await create_safeguard_document(
        db,
        project=project,
        doc_type="fpic_minutes",
        title="FPIC Jan 2025",
        s3_key=f"images/{uuid.uuid4()}/fpic.pdf",
        uploaded_by_user_id=uuid.uuid4(),
    )
    assert doc["doc_type"] == "fpic_minutes"
    assert doc["title"] == "FPIC Jan 2025"


def test_allowed_safeguard_doc_types():
    assert "gram_sabha_resolution" in ALLOWED_DOC_TYPES


@pytest.mark.asyncio
async def test_campa_state_export_context(monkeypatch):
    project = SimpleNamespace(
        id=uuid.uuid4(),
        code="CAMPA-01",
        name="CA Site",
        scheme_code="campa_ca",
        segment="general",
        status="active",
        metadata_={
            "scheme_refs": {
                "state_name": "Rajasthan",
                "pca_number": "PCA-1",
                "ngt_order_ref": "NGT-2024-1",
            }
        },
    )
    db = AsyncMock()

    async def fake_mrv(db_, proj):
        return {
            "summary": {
                "tree_count": 100,
                "geo_tagged_count": 90,
                "open_violations": 0,
                "blocking_violations": 0,
                "work_area_count": 1,
            }
        }

    async def fake_kpis(db_, proj):
        return {"metrics": {"survival_pct": 72.0}, "targets": {}, "status": "on_track"}

    monkeypatch.setattr(
        "app.services.reports.india_exports.build_project_mrv_context",
        fake_mrv,
    )
    monkeypatch.setattr(
        "app.services.reports.india_exports.compute_scheme_kpis",
        fake_kpis,
    )

    ctx = await build_campa_state_export_context(db, project)
    assert ctx["portal_row"]["geo_tagged_pct"] == 90.0
    assert ctx["portal_row"]["ngt_order_ref"] == "NGT-2024-1"
    xlsx = render_campa_state_export_xlsx(ctx)
    assert len(xlsx) > 100


@pytest.mark.asyncio
async def test_green_credit_portal_export(monkeypatch):
    project = SimpleNamespace(
        id=uuid.uuid4(),
        code="GCP-01",
        scheme_code="green_credit_india",
        metadata_={"scheme_refs": {"green_credit_land_bank_id": "LB-1"}},
        created_at=None,
    )
    db = AsyncMock()

    async def fake_summary(db_, proj):
        return {
            "land_bank_id": "LB-1",
            "activity_type": "tree_plantation",
            "project_code": "GCP-01",
            "density_eligible": True,
            "disclaimer": "Test",
            "gaps": [],
        }

    monkeypatch.setattr(
        "app.services.reports.india_exports.build_project_green_credit_summary",
        fake_summary,
    )

    ctx = await build_green_credit_portal_context(db, project)
    assert ctx["registrar_columns"]["land_bank_id"] == "LB-1"
    xlsx = render_green_credit_portal_xlsx(ctx)
    assert len(xlsx) > 100
