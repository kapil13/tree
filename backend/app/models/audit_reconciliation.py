"""Estate Watch Wave B — persisted confidence vs field reconciliation (P6)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class AuditReconciliationRun(UUIDPKMixin, TimestampMixin, Base):
    """One persisted reconciliation snapshot for an audit cycle."""

    __tablename__ = "audit_reconciliation_runs"

    cycle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_cycles.id", ondelete="RESTRICT"), nullable=False
    )
    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_engagements.id", ondelete="RESTRICT"), nullable=False
    )
    audit_run_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_runs.id", ondelete="SET NULL")
    )
    aligned_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    mismatch_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    no_field_data_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    block_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    blocks = relationship(
        "AuditReconciliationBlock",
        back_populates="run",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("audit_reconciliation_runs_cycle_idx", "cycle_id", "computed_at"),
    )


class AuditReconciliationBlock(UUIDPKMixin, Base):
    """Per-block reconciliation outcome within a run."""

    __tablename__ = "audit_reconciliation_blocks"

    run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("audit_reconciliation_runs.id", ondelete="CASCADE"),
        nullable=False,
    )
    boundary_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("boundary_versions.id", ondelete="CASCADE"), nullable=False
    )
    confidence_grade: Mapped[str | None] = mapped_column(String(16))
    confidence_score: Mapped[int | None] = mapped_column(Integer)
    field_grade: Mapped[str | None] = mapped_column(String(16))
    field_signal: Mapped[str | None] = mapped_column(String(32))
    visit_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reconciliation: Mapped[str] = mapped_column(String(32), nullable=False)
    aligned: Mapped[bool | None] = mapped_column(Boolean)
    details: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    run = relationship("AuditReconciliationRun", back_populates="blocks")

    __table_args__ = (
        UniqueConstraint(
            "run_id",
            "boundary_version_id",
            name="audit_reconciliation_blocks_run_boundary_uq",
        ),
        Index("audit_reconciliation_blocks_run_idx", "run_id"),
    )
