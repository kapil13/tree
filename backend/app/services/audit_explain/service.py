"""Orchestrate explain-only audit narratives (Wave E / P14)."""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_engagement import AuditEngagement, BoundaryVersion
from app.models.audit_explain import AuditExplainRun
from app.models.audit_portfolio_ops import AuditCrossEstatePattern
from app.models.audit_risk import AuditAnomalyEvent
from app.services.audit_cycles.scope import resolve_read_cycle_id
from app.services.audit_evidence.graph import evidence_graph_summary
from app.services.audit_explain.llm import enrich_explain_narrative
from app.services.audit_explain.rules import (
    explain_anomaly,
    explain_cross_estate_pattern,
    explain_evidence_graph,
    explain_reconciliation_block,
    explain_reconciliation_summary,
)
from app.services.audit_export.reconciliation import build_confidence_field_reconciliation
from app.services.audit_governance.methodology_resolver import resolve_thresholds


def input_manifest_hash(context: dict[str, Any]) -> str:
    raw = json.dumps(context, sort_keys=True, default=str).encode()
    return hashlib.sha256(raw).hexdigest()


async def _persist_run(
    db: AsyncSession,
    *,
    target_type: str,
    target_id: str,
    context: dict[str, Any],
    answer: str,
    citations: list[dict[str, str]],
    mode: str,
    provider: str | None,
    llm_error: str | None,
    cycle_id: uuid.UUID | None,
    engagement_id: uuid.UUID | None,
    organization_id: uuid.UUID | None,
    created_by_user_id: uuid.UUID | None,
    audit_run_id: uuid.UUID | None = None,
) -> AuditExplainRun:
    row = AuditExplainRun(
        cycle_id=cycle_id,
        engagement_id=engagement_id,
        organization_id=organization_id,
        target_type=target_type,
        target_id=target_id,
        mode=mode,
        provider=provider,
        input_manifest_hash=input_manifest_hash(context),
        answer=answer,
        citations=citations,
        llm_error=llm_error,
        audit_run_id=audit_run_id,
        created_by_user_id=created_by_user_id,
        created_at=datetime.now(UTC),
    )
    db.add(row)
    await db.flush()
    return row


def explain_run_to_dict(row: AuditExplainRun) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "target_type": row.target_type,
        "target_id": row.target_id,
        "cycle_id": str(row.cycle_id) if row.cycle_id else None,
        "engagement_id": str(row.engagement_id) if row.engagement_id else None,
        "organization_id": str(row.organization_id) if row.organization_id else None,
        "mode": row.mode,
        "provider": row.provider,
        "answer": row.answer,
        "citations": row.citations,
        "llm_error": row.llm_error,
        "input_manifest_hash": row.input_manifest_hash,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


async def explain_anomaly_for_engagement(
    db: AsyncSession,
    *,
    engagement: AuditEngagement,
    anomaly_id: uuid.UUID,
    created_by_user_id: uuid.UUID | None = None,
) -> AuditExplainRun:
    anomaly = await db.get(AuditAnomalyEvent, anomaly_id)
    if anomaly is None or anomaly.engagement_id != engagement.id:
        raise ValueError("anomaly_not_found")

    boundary = await db.get(BoundaryVersion, anomaly.boundary_version_id)
    thresholds = await resolve_thresholds(db, engagement=engagement)

    context = {
        "anomaly": {
            "id": str(anomaly.id),
            "anomaly_type": anomaly.anomaly_type,
            "severity": anomaly.severity,
            "title": anomaly.title,
            "summary": anomaly.summary,
            "signals": anomaly.signals,
            "status": anomaly.status,
        },
        "boundary_name": boundary.name if boundary else None,
        "methodology_thresholds": thresholds,
        "disclaimer": "Explain-only — does not modify audit outcomes.",
    }

    rules_answer, citations = explain_anomaly(context)
    llm_answer, provider, llm_error = await enrich_explain_narrative(context, target_type="anomaly")

    if llm_answer:
        return await _persist_run(
            db,
            target_type="anomaly",
            target_id=str(anomaly_id),
            context=context,
            answer=llm_answer,
            citations=citations,
            mode="llm",
            provider=provider,
            llm_error=llm_error,
            cycle_id=anomaly.cycle_id,
            engagement_id=engagement.id,
            organization_id=engagement.organization_id,
            created_by_user_id=created_by_user_id,
        )

    return await _persist_run(
        db,
        target_type="anomaly",
        target_id=str(anomaly_id),
        context=context,
        answer=rules_answer,
        citations=citations,
        mode="rules",
        provider=None,
        llm_error=llm_error,
        cycle_id=anomaly.cycle_id,
        engagement_id=engagement.id,
        organization_id=engagement.organization_id,
        created_by_user_id=created_by_user_id,
    )


async def explain_reconciliation_for_engagement(
    db: AsyncSession,
    *,
    engagement: AuditEngagement,
    boundary_version_id: uuid.UUID | None = None,
    created_by_user_id: uuid.UUID | None = None,
) -> AuditExplainRun:
    cycle_id = await resolve_read_cycle_id(db, engagement.id)
    reconciliation = await build_confidence_field_reconciliation(
        db, engagement.id, cycle_id=cycle_id
    )

    if boundary_version_id is not None:
        block = next(
            (
                b
                for b in reconciliation.get("blocks") or []
                if b.get("boundary_version_id") == str(boundary_version_id)
            ),
            None,
        )
        if block is None:
            raise ValueError("reconciliation_block_not_found")
        context = {"block": block, "reconciliation": reconciliation}
        rules_answer, citations = explain_reconciliation_block(context)
        target_type = "reconciliation_block"
        target_id = str(boundary_version_id)
    else:
        context = {"reconciliation": reconciliation}
        rules_answer, citations = explain_reconciliation_summary(context)
        target_type = "reconciliation_summary"
        target_id = str(engagement.id)

    llm_answer, provider, llm_error = await enrich_explain_narrative(
        context, target_type=target_type
    )

    if llm_answer:
        return await _persist_run(
            db,
            target_type=target_type,
            target_id=target_id,
            context=context,
            answer=llm_answer,
            citations=citations,
            mode="llm",
            provider=provider,
            llm_error=llm_error,
            cycle_id=cycle_id,
            engagement_id=engagement.id,
            organization_id=engagement.organization_id,
            created_by_user_id=created_by_user_id,
        )

    return await _persist_run(
        db,
        target_type=target_type,
        target_id=target_id,
        context=context,
        answer=rules_answer,
        citations=citations,
        mode="rules",
        provider=None,
        llm_error=llm_error,
        cycle_id=cycle_id,
        engagement_id=engagement.id,
        organization_id=engagement.organization_id,
        created_by_user_id=created_by_user_id,
    )


async def explain_cross_estate_pattern_for_org(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
    pattern_id: uuid.UUID,
    created_by_user_id: uuid.UUID | None = None,
) -> AuditExplainRun:
    pattern = await db.get(AuditCrossEstatePattern, pattern_id)
    if pattern is None or pattern.organization_id != organization_id:
        raise ValueError("pattern_not_found")

    context = {
        "pattern": {
            "id": str(pattern.id),
            "pattern_type": pattern.pattern_type,
            "anomaly_type": pattern.anomaly_type,
            "engagement_count": pattern.engagement_count,
            "severity_peak": pattern.severity_peak,
            "summary": pattern.summary,
            "signals": pattern.signals,
            "affected_engagement_ids": pattern.affected_engagement_ids,
        },
        "disclaimer": "Explain-only — does not modify audit outcomes.",
    }

    rules_answer, citations = explain_cross_estate_pattern(context)
    llm_answer, provider, llm_error = await enrich_explain_narrative(
        context, target_type="cross_estate_pattern"
    )

    if llm_answer:
        return await _persist_run(
            db,
            target_type="cross_estate_pattern",
            target_id=str(pattern_id),
            context=context,
            answer=llm_answer,
            citations=citations,
            mode="llm",
            provider=provider,
            llm_error=llm_error,
            cycle_id=None,
            engagement_id=None,
            organization_id=organization_id,
            created_by_user_id=created_by_user_id,
        )

    return await _persist_run(
        db,
        target_type="cross_estate_pattern",
        target_id=str(pattern_id),
        context=context,
        answer=rules_answer,
        citations=citations,
        mode="rules",
        provider=None,
        llm_error=llm_error,
        cycle_id=None,
        engagement_id=None,
        organization_id=organization_id,
        created_by_user_id=created_by_user_id,
    )


async def explain_evidence_graph_for_engagement(
    db: AsyncSession,
    *,
    engagement: AuditEngagement,
    created_by_user_id: uuid.UUID | None = None,
) -> AuditExplainRun:
    cycle_id = await resolve_read_cycle_id(db, engagement.id)
    if cycle_id is None:
        raise ValueError("audit_cycle_not_found")

    graph = await evidence_graph_summary(db, cycle_id)
    context = {"graph": graph, "disclaimer": "Explain-only — does not modify audit outcomes."}
    rules_answer, citations = explain_evidence_graph(context)
    llm_answer, provider, llm_error = await enrich_explain_narrative(
        context, target_type="evidence_graph"
    )

    if llm_answer:
        return await _persist_run(
            db,
            target_type="evidence_graph",
            target_id=str(cycle_id),
            context=context,
            answer=llm_answer,
            citations=citations,
            mode="llm",
            provider=provider,
            llm_error=llm_error,
            cycle_id=cycle_id,
            engagement_id=engagement.id,
            organization_id=engagement.organization_id,
            created_by_user_id=created_by_user_id,
        )

    return await _persist_run(
        db,
        target_type="evidence_graph",
        target_id=str(cycle_id),
        context=context,
        answer=rules_answer,
        citations=citations,
        mode="rules",
        provider=None,
        llm_error=llm_error,
        cycle_id=cycle_id,
        engagement_id=engagement.id,
        organization_id=engagement.organization_id,
        created_by_user_id=created_by_user_id,
    )


async def list_explain_runs_for_engagement(
    db: AsyncSession,
    *,
    engagement_id: uuid.UUID,
    limit: int = 20,
) -> list[AuditExplainRun]:
    return list(
        (
            await db.execute(
                select(AuditExplainRun)
                .where(AuditExplainRun.engagement_id == engagement_id)
                .order_by(AuditExplainRun.created_at.desc())
                .limit(limit)
            )
        ).scalars().all()
    )
