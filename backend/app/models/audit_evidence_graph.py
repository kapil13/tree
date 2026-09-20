"""Estate Watch Wave B — evidence graph nodes and edges (P10)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models._mixins import UUIDPKMixin


class AuditEvidenceNode(UUIDPKMixin, Base):
    """A claim, observation, estimation, or attestation artefact in the audit graph."""

    __tablename__ = "audit_evidence_nodes"

    cycle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_cycles.id", ondelete="RESTRICT"), nullable=False
    )
    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_engagements.id", ondelete="RESTRICT"), nullable=False
    )
    node_type: Mapped[str] = mapped_column(String(32), nullable=False)
    source_table: Mapped[str] = mapped_column(String(64), nullable=False)
    source_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    epistemic_label: Mapped[str] = mapped_column(String(16), nullable=False)
    label: Mapped[str | None] = mapped_column(String(255))
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "cycle_id",
            "source_table",
            "source_id",
            name="audit_evidence_nodes_source_uq",
        ),
        Index("audit_evidence_nodes_cycle_type_idx", "cycle_id", "node_type"),
    )


class AuditEvidenceEdge(UUIDPKMixin, Base):
    """Directed relationship between two evidence nodes."""

    __tablename__ = "audit_evidence_edges"

    cycle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_cycles.id", ondelete="RESTRICT"), nullable=False
    )
    from_node_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_evidence_nodes.id", ondelete="CASCADE"), nullable=False
    )
    to_node_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_evidence_nodes.id", ondelete="CASCADE"), nullable=False
    )
    edge_type: Mapped[str] = mapped_column(String(32), nullable=False)
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    __table_args__ = (
        UniqueConstraint(
            "from_node_id",
            "to_node_id",
            "edge_type",
            name="audit_evidence_edges_from_to_type_uq",
        ),
        Index("audit_evidence_edges_cycle_idx", "cycle_id"),
    )
