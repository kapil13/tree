"""Links bioacoustic recordings to compliance checklist evidence items."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class BioacousticComplianceEvidence(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "bioacoustic_compliance_evidence"

    recording_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bioacoustic_recordings.id", ondelete="CASCADE"),
        nullable=False,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("planting_projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    checklist_code: Mapped[str] = mapped_column(String(64), nullable=False)
    checklist_item_id: Mapped[str] = mapped_column(String(64), nullable=False)
    linked_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    linked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)

    recording = relationship("BioacousticRecording")
    project = relationship("PlantingProject")
    linked_by = relationship("User", foreign_keys=[linked_by_user_id])

    __table_args__ = (
        UniqueConstraint(
            "recording_id",
            "checklist_code",
            "checklist_item_id",
            name="bioacoustic_compliance_evidence_uq",
        ),
    )
