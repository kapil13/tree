"""Tenure and safeguards evidence documents for planting projects (Phase A)."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin

SafeguardDocType = str  # gram_sabha_resolution | fpic_minutes | patta_cfr_reference | stakeholder_consultation_log


class ProjectSafeguardDocument(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "project_safeguard_documents"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("planting_projects.id", ondelete="CASCADE"), nullable=False
    )
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL")
    )
    doc_type: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    s3_key: Mapped[str] = mapped_column(String(512), nullable=False)
    doc_metadata: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )
    uploaded_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    project = relationship("PlantingProject", backref="safeguard_documents")

    __table_args__ = (
        Index("project_safeguard_doc_project_idx", "project_id"),
        Index("project_safeguard_doc_type_idx", "doc_type"),
    )
