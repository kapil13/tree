"""Per-user wallet for purchased BYOT AI scan credits (Phase 4 payments)."""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin


class UserAiScanWallet(TimestampMixin, Base):
    __tablename__ = "user_ai_scan_wallets"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    purchased_scan_balance: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    user = relationship("User", back_populates="ai_scan_wallet")
