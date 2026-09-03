"""Phase 4 integrity registry integration tests."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import app.models.tree_measurement  # noqa: F401 — register TreeMeasurement mapper
from app.services.credits.claims import register_tree_claim
from app.services.credits.serials import mint_serial_for_issue, register_project_tree_claims
from app.services.integrity.registry_integration import (
    assert_tree_registry_eligible,
    build_issue_integrity_snapshot,
    tree_registry_eligibility,
)


@pytest.mark.asyncio
async def test_tree_registry_eligibility_not_computed():
    tree = SimpleNamespace(id=uuid.uuid4(), verification_status="registered", public_code="T-1")
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(first=MagicMock(return_value=(tree, None))))
    result = await tree_registry_eligibility(db, tree.id)
    assert result.eligible is False
    assert "integrity_not_computed" in result.reasons


@pytest.mark.asyncio
async def test_tree_registry_eligibility_credit_eligible():
    tree = SimpleNamespace(id=uuid.uuid4(), verification_status="audit_ready", public_code="T-2")
    risk = SimpleNamespace(
        credit_eligible=True,
        fusion_score=78.0,
        fusion_details={"audit_ready_blockers": []},
    )
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(first=MagicMock(return_value=(tree, risk))))
    result = await tree_registry_eligibility(db, tree.id)
    assert result.eligible is True
    assert result.fusion_score == 78.0


@pytest.mark.asyncio
async def test_tree_registry_eligibility_requires_audit_ready():
    tree = SimpleNamespace(id=uuid.uuid4(), verification_status="field_verified", public_code="T-2b")
    risk = SimpleNamespace(
        credit_eligible=True,
        fusion_score=78.0,
        fusion_details={},
    )
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(first=MagicMock(return_value=(tree, risk))))
    result = await tree_registry_eligibility(db, tree.id)
    assert result.eligible is False
    assert "not_audit_ready" in result.reasons


@pytest.mark.asyncio
async def test_assert_tree_registry_eligible_raises():
    tree = SimpleNamespace(id=uuid.uuid4(), verification_status="registered", public_code="T-3")
    risk = SimpleNamespace(credit_eligible=False, fusion_score=40.0, fusion_details={})
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(first=MagicMock(return_value=(tree, risk))))
    with pytest.raises(ValueError, match="registry_gate_failed"):
        await assert_tree_registry_eligible(db, tree.id)


@pytest.mark.asyncio
async def test_register_project_tree_claims_skips_ineligible():
    project = SimpleNamespace(id=uuid.uuid4(), scheme_code="verra_vm0047")
    event = SimpleNamespace(id=uuid.uuid4())
    eligible_tree = SimpleNamespace(
        id=uuid.uuid4(),
        public_code="ELIG-1",
        risk_score=SimpleNamespace(credit_eligible=True, fusion_score=80.0),
    )
    ineligible_tree = SimpleNamespace(
        id=uuid.uuid4(),
        public_code="INEL-1",
        risk_score=SimpleNamespace(credit_eligible=False, fusion_score=30.0),
    )
    db = AsyncMock()
    db.execute = AsyncMock(
        return_value=MagicMock(
            scalars=MagicMock(
                return_value=MagicMock(all=MagicMock(return_value=[eligible_tree, ineligible_tree]))
            )
        )
    )
    with (
        patch(
            "app.services.integrity.registry_integration.tree_registry_eligibility",
            new_callable=AsyncMock,
            side_effect=[
                SimpleNamespace(eligible=True, fusion_score=80.0, reasons=[]),
                SimpleNamespace(eligible=False, fusion_score=30.0, reasons=["not_audit_ready"]),
            ],
        ),
        patch(
            "app.services.credits.serials.register_tree_claim",
            new_callable=AsyncMock,
        ) as mock_claim,
    ):
        result = await register_project_tree_claims(db, project=project, ledger_event=event)
    assert result["registered"] == ["ELIG-1"]
    assert result["skipped"] == ["INEL-1"]
    assert mock_claim.await_count == 1


@pytest.mark.asyncio
async def test_mint_serial_stores_integrity_snapshot():
    ledger = SimpleNamespace(
        id=uuid.uuid4(),
        organization_id=uuid.uuid4(),
        issued_credits_tco2e=2.5,
        net_credits_tco2e=2.5,
        last_computed_at=MagicMock(year=2026),
    )
    event = SimpleNamespace(id=uuid.uuid4())
    project = SimpleNamespace(id=uuid.uuid4(), organization_id=uuid.uuid4(), metadata_={"state_code": "MH"})
    snapshot = {"avg_fusion_score": 82.0, "credit_eligible_count": 10}
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(scalar_one=MagicMock(return_value=0)))
    serial = await mint_serial_for_issue(
        db,
        ledger=ledger,
        ledger_event=event,
        project=project,
        integrity_snapshot=snapshot,
    )
    assert serial.integrity_snapshot == snapshot
    db.add.assert_called_once()


@pytest.mark.asyncio
async def test_build_issue_integrity_snapshot():
    db = AsyncMock()
    with patch(
        "app.services.integrity.registry_integration.integrity_gate_detail",
        new_callable=AsyncMock,
        return_value={
            "tree_count": 5,
            "credit_eligible_count": 4,
            "audit_ready_count": 5,
            "eligible_pct": 80.0,
            "audit_ready_pct": 100.0,
            "avg_fusion_score": 76.0,
            "verified_ready": True,
            "issued_ready": True,
        },
    ):
        snap = await build_issue_integrity_snapshot(db, uuid.uuid4())
    assert snap["avg_fusion_score"] == 76.0
    assert snap["issued_ready"] is True


@pytest.mark.asyncio
async def test_register_tree_claim_requires_eligibility():
    tree_id = uuid.uuid4()
    db = AsyncMock()
    with (
        patch(
            "app.services.integrity.registry_integration.assert_tree_registry_eligible",
            new_callable=AsyncMock,
            side_effect=ValueError("registry_gate_failed:not_credit_eligible"),
        ),
        pytest.raises(ValueError, match="registry_gate_failed"),
    ):
        await register_tree_claim(
            db,
            tree_id=tree_id,
            scheme_code="verra_vm0047",
            require_credit_eligible=True,
        )
