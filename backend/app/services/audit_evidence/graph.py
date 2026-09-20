"""Evidence graph linking claims, observations, estimations, and attestations (Wave B / P10)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.audit_attestation import AuditReviewerAttestation
from app.models.audit_confidence import AuditConfidenceAssessment
from app.models.audit_engagement import AuditEngagement, ClaimSnapshot
from app.models.audit_evidence_graph import AuditEvidenceEdge, AuditEvidenceNode
from app.models.audit_sampling import AuditFieldVisit


async def _upsert_node(
    db: AsyncSession,
    *,
    cycle_id: uuid.UUID,
    engagement_id: uuid.UUID,
    node_type: str,
    source_table: str,
    source_id: uuid.UUID,
    epistemic_label: str,
    label: str | None,
    captured_at: datetime,
) -> AuditEvidenceNode:
    existing = (
        await db.execute(
            select(AuditEvidenceNode).where(
                AuditEvidenceNode.cycle_id == cycle_id,
                AuditEvidenceNode.source_table == source_table,
                AuditEvidenceNode.source_id == source_id,
            )
        )
    ).scalar_one_or_none()
    if existing:
        return existing

    node = AuditEvidenceNode(
        cycle_id=cycle_id,
        engagement_id=engagement_id,
        node_type=node_type,
        source_table=source_table,
        source_id=source_id,
        epistemic_label=epistemic_label,
        label=label,
        captured_at=captured_at,
    )
    db.add(node)
    await db.flush()
    return node


async def _upsert_edge(
    db: AsyncSession,
    *,
    cycle_id: uuid.UUID,
    from_node_id: uuid.UUID,
    to_node_id: uuid.UUID,
    edge_type: str,
    metadata: dict[str, Any] | None = None,
) -> AuditEvidenceEdge | None:
    if from_node_id == to_node_id:
        return None
    existing = (
        await db.execute(
            select(AuditEvidenceEdge).where(
                AuditEvidenceEdge.from_node_id == from_node_id,
                AuditEvidenceEdge.to_node_id == to_node_id,
                AuditEvidenceEdge.edge_type == edge_type,
            )
        )
    ).scalar_one_or_none()
    if existing:
        return existing

    edge = AuditEvidenceEdge(
        cycle_id=cycle_id,
        from_node_id=from_node_id,
        to_node_id=to_node_id,
        edge_type=edge_type,
        metadata_=metadata or {},
    )
    db.add(edge)
    await db.flush()
    return edge


async def sync_cycle_evidence_graph(
    db: AsyncSession,
    engagement: AuditEngagement,
    cycle_id: uuid.UUID,
) -> dict[str, int]:
    """Materialize claim → estimation → observation → attestation edges for a cycle."""
    now = datetime.now(UTC)
    nodes_created = 0
    edges_created = 0

    claim = (
        await db.execute(
            select(ClaimSnapshot)
            .where(ClaimSnapshot.engagement_id == engagement.id)
            .order_by(ClaimSnapshot.version.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    claim_node: AuditEvidenceNode | None = None
    if claim is not None:
        claim_node = await _upsert_node(
            db,
            cycle_id=cycle_id,
            engagement_id=engagement.id,
            node_type="claim",
            source_table="claim_snapshots",
            source_id=claim.id,
            epistemic_label="CLAIM",
            label=f"claim_v{claim.version}",
            captured_at=claim.created_at or now,
        )
        nodes_created += 1

    confidence_rows = (
        await db.execute(
            select(AuditConfidenceAssessment).where(
                AuditConfidenceAssessment.cycle_id == cycle_id
            )
        )
    ).scalars().all()
    confidence_nodes: dict[uuid.UUID, AuditEvidenceNode] = {}
    for row in confidence_rows:
        node = await _upsert_node(
            db,
            cycle_id=cycle_id,
            engagement_id=engagement.id,
            node_type="estimation",
            source_table="audit_confidence_assessments",
            source_id=row.id,
            epistemic_label=row.epistemic_label,
            label=f"confidence_{row.confidence_grade}",
            captured_at=row.computed_at,
        )
        confidence_nodes[row.boundary_version_id] = node
        nodes_created += 1
        if claim_node is not None:
            edge = await _upsert_edge(
                db,
                cycle_id=cycle_id,
                from_node_id=claim_node.id,
                to_node_id=node.id,
                edge_type="derived_from",
            )
            if edge:
                edges_created += 1

    visits = (
        await db.execute(
            select(AuditFieldVisit)
            .options(selectinload(AuditFieldVisit.plot))
            .where(
                AuditFieldVisit.cycle_id == cycle_id,
                AuditFieldVisit.status == "accepted",
            )
        )
    ).scalars().all()
    for visit in visits:
        visit_node = await _upsert_node(
            db,
            cycle_id=cycle_id,
            engagement_id=engagement.id,
            node_type="observation",
            source_table="audit_field_visits",
            source_id=visit.id,
            epistemic_label=visit.epistemic_label,
            label=f"visit_{visit.verification_outcome}",
            captured_at=visit.submitted_at or visit.visited_at,
        )
        nodes_created += 1
        plot = visit.plot
        if plot is not None:
            conf_node = confidence_nodes.get(plot.boundary_version_id)
            if conf_node is not None:
                edge_type = (
                    "supports"
                    if visit.verification_outcome == "claim_supported"
                    else "contradicts"
                    if visit.verification_outcome == "claim_unsupported"
                    else "observed"
                )
                edge = await _upsert_edge(
                    db,
                    cycle_id=cycle_id,
                    from_node_id=visit_node.id,
                    to_node_id=conf_node.id,
                    edge_type=edge_type,
                    metadata={"verification_outcome": visit.verification_outcome},
                )
                if edge:
                    edges_created += 1

    attestation = (
        await db.execute(
            select(AuditReviewerAttestation).where(
                AuditReviewerAttestation.cycle_id == cycle_id
            )
        )
    ).scalar_one_or_none()
    if attestation is not None:
        att_node = await _upsert_node(
            db,
            cycle_id=cycle_id,
            engagement_id=engagement.id,
            node_type="attestation",
            source_table="audit_reviewer_attestations",
            source_id=attestation.id,
            epistemic_label="ATTESTATION",
            label=attestation.verdict,
            captured_at=attestation.signed_at,
        )
        nodes_created += 1
        for conf_node in confidence_nodes.values():
            edge = await _upsert_edge(
                db,
                cycle_id=cycle_id,
                from_node_id=att_node.id,
                to_node_id=conf_node.id,
                edge_type="attests",
            )
            if edge:
                edges_created += 1

    return {"nodes": nodes_created, "edges": edges_created}


async def evidence_graph_summary(
    db: AsyncSession,
    cycle_id: uuid.UUID,
) -> dict[str, Any]:
    nodes = (
        await db.execute(
            select(AuditEvidenceNode)
            .where(AuditEvidenceNode.cycle_id == cycle_id)
            .order_by(AuditEvidenceNode.captured_at.asc())
        )
    ).scalars().all()
    edges = (
        await db.execute(
            select(AuditEvidenceEdge).where(AuditEvidenceEdge.cycle_id == cycle_id)
        )
    ).scalars().all()
    return {
        "cycle_id": str(cycle_id),
        "node_count": len(nodes),
        "edge_count": len(edges),
        "nodes": [
            {
                "id": str(n.id),
                "node_type": n.node_type,
                "source_table": n.source_table,
                "source_id": str(n.source_id),
                "epistemic_label": n.epistemic_label,
                "label": n.label,
                "captured_at": n.captured_at.isoformat(),
            }
            for n in nodes
        ],
        "edges": [
            {
                "id": str(e.id),
                "from_node_id": str(e.from_node_id),
                "to_node_id": str(e.to_node_id),
                "edge_type": e.edge_type,
                "metadata": e.metadata_ or {},
            }
            for e in edges
        ],
    }
