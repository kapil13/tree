"""India admin geography reference tables."""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0060_india_admin_geography"
down_revision = "0059_homepage_intelligence_sections"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "india_states",
        sa.Column("code", sa.String(length=8), nullable=False),
        sa.Column("lgd", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.PrimaryKeyConstraint("code"),
    )
    op.create_table(
        "india_districts",
        sa.Column("code", sa.String(length=16), nullable=False),
        sa.Column("state_code", sa.String(length=8), nullable=False),
        sa.Column("lgd", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.ForeignKeyConstraint(["state_code"], ["india_states.code"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("code"),
    )
    op.create_index("india_districts_state_idx", "india_districts", ["state_code"])

    op.create_table(
        "india_cities",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("state_code", sa.String(length=8), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.ForeignKeyConstraint(["state_code"], ["india_states.code"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("state_code", "name", name="india_cities_state_name_uq"),
    )
    op.create_index("india_cities_state_idx", "india_cities", ["state_code"])

    op.create_table(
        "india_blocks",
        sa.Column("lgd", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=16), nullable=True),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("district_code", sa.String(length=16), nullable=False),
        sa.Column("state_code", sa.String(length=8), nullable=False),
        sa.ForeignKeyConstraint(["district_code"], ["india_districts.code"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["state_code"], ["india_states.code"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("lgd"),
    )
    op.create_index("india_blocks_district_idx", "india_blocks", ["district_code"])
    op.create_index(
        "india_blocks_state_district_idx",
        "india_blocks",
        ["state_code", "district_code"],
    )

    op.create_table(
        "india_gram_panchayats",
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("block_lgd", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["block_lgd"], ["india_blocks.lgd"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("code"),
    )
    op.create_index("india_gram_panchayats_block_idx", "india_gram_panchayats", ["block_lgd"])

    op.create_table(
        "india_villages",
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("gram_panchayat_code", sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(
            ["gram_panchayat_code"], ["india_gram_panchayats.code"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("code"),
    )
    op.create_index("india_villages_gp_idx", "india_villages", ["gram_panchayat_code"])


def downgrade() -> None:
    op.drop_index("india_villages_gp_idx", table_name="india_villages")
    op.drop_table("india_villages")
    op.drop_index("india_gram_panchayats_block_idx", table_name="india_gram_panchayats")
    op.drop_table("india_gram_panchayats")
    op.drop_index("india_blocks_state_district_idx", table_name="india_blocks")
    op.drop_index("india_blocks_district_idx", table_name="india_blocks")
    op.drop_table("india_blocks")
    op.drop_index("india_cities_state_idx", table_name="india_cities")
    op.drop_table("india_cities")
    op.drop_index("india_districts_state_idx", table_name="india_districts")
    op.drop_table("india_districts")
    op.drop_table("india_states")
