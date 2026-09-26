"""Append-only provenance records for deterministic Estate Watch computations."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class AuditRun(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "audit_runs"

    cycle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_cycles.id", ondelete="RESTRICT"), nullable=False
    )
    run_type: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="running")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    methodology_version: Mapped[str | None] = mapped_column(String(128))
    application_version: Mapped[str | None] = mapped_column(String(128))
    algorithm_version: Mapped[str | None] = mapped_column(String(128))
    parameters: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    input_manifest_hash: Mapped[str | None] = mapped_column(String(64))
    output_manifest_hash: Mapped[str | None] = mapped_column(String(64))
    error_message: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    cycle = relationship("AuditCycle", backref="runs")

    __table_args__ = (
        CheckConstraint(
            "run_type IN ('gis', 'satellite_baseline', 'satellite_temporal', 'confidence', "
            "'risk', 'sampling', 'field_reconciliation', 'integrity', 'export')",
            name="audit_runs_type_ck",
        ),
        CheckConstraint("status IN ('running', 'completed', 'failed')", name="audit_runs_status_ck"),
        Index("audit_runs_cycle_idx", "cycle_id", "created_at"),
        Index("audit_runs_cycle_type_idx", "cycle_id", "run_type"),
    )
