"""India administrative geography reference tables (LGD-aligned)."""

from __future__ import annotations

from sqlalchemy import ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class IndiaState(Base):
    __tablename__ = "india_states"

    code: Mapped[str] = mapped_column(String(8), primary_key=True)
    lgd: Mapped[int | None] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String(128), nullable=False)


class IndiaDistrict(Base):
    __tablename__ = "india_districts"

    code: Mapped[str] = mapped_column(String(16), primary_key=True)
    state_code: Mapped[str] = mapped_column(
        String(8), ForeignKey("india_states.code", ondelete="CASCADE"), nullable=False
    )
    lgd: Mapped[int | None] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String(128), nullable=False)

    __table_args__ = (Index("india_districts_state_idx", "state_code"),)


class IndiaCity(Base):
    __tablename__ = "india_cities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    state_code: Mapped[str] = mapped_column(
        String(8), ForeignKey("india_states.code", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)

    __table_args__ = (
        UniqueConstraint("state_code", "name", name="india_cities_state_name_uq"),
        Index("india_cities_state_idx", "state_code"),
    )


class IndiaBlock(Base):
    __tablename__ = "india_blocks"

    lgd: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str | None] = mapped_column(String(16))
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    district_code: Mapped[str] = mapped_column(
        String(16), ForeignKey("india_districts.code", ondelete="CASCADE"), nullable=False
    )
    state_code: Mapped[str] = mapped_column(
        String(8), ForeignKey("india_states.code", ondelete="CASCADE"), nullable=False
    )

    __table_args__ = (
        Index("india_blocks_district_idx", "district_code"),
        Index("india_blocks_state_district_idx", "state_code", "district_code"),
    )


class IndiaGramPanchayat(Base):
    __tablename__ = "india_gram_panchayats"

    code: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    block_lgd: Mapped[int] = mapped_column(
        Integer, ForeignKey("india_blocks.lgd", ondelete="CASCADE"), nullable=False
    )

    __table_args__ = (Index("india_gram_panchayats_block_idx", "block_lgd"),)


class IndiaVillage(Base):
    __tablename__ = "india_villages"

    code: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    gram_panchayat_code: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("india_gram_panchayats.code", ondelete="CASCADE"),
        nullable=False,
    )

    __table_args__ = (Index("india_villages_gp_idx", "gram_panchayat_code"),)
