"""Planting program templates and user program memberships.

Revision ID: 0007_planting_programs
Revises: 0006_bioacoustic_phase1
"""

from __future__ import annotations

import json

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op
from app.services.planting_programs.catalog import PROGRAM_CATALOG, program_form_schema

revision = "0007_planting_programs"
down_revision = "0006_bioacoustic_phase1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "planting_programs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("code", sa.String(64), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.String(1024), nullable=False, server_default=""),
        sa.Column("audience", sa.String(255), nullable=False, server_default=""),
        sa.Column("min_photos", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("form_schema", postgresql.JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("planting_programs_code_idx", "planting_programs", ["code"])

    op.create_table(
        "user_planting_programs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("program_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("planting_programs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("enrolled_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.UniqueConstraint("user_id", "program_id", name="user_planting_programs_user_program_uq"),
    )
    op.create_index("user_planting_programs_user_idx", "user_planting_programs", ["user_id"])
    op.create_index("user_planting_programs_program_idx", "user_planting_programs", ["program_id"])

    op.add_column(
        "trees",
        sa.Column("program_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("planting_programs.id", ondelete="SET NULL")),
    )
    op.create_index("trees_program_idx", "trees", ["program_id"])

    programs = sa.table(
        "planting_programs",
        sa.column("code", sa.String),
        sa.column("name", sa.String),
        sa.column("description", sa.String),
        sa.column("audience", sa.String),
        sa.column("min_photos", sa.Integer),
        sa.column("is_default", sa.Boolean),
        sa.column("is_public", sa.Boolean),
        sa.column("form_schema", postgresql.JSONB),
    )
    op.bulk_insert(
        programs,
        [
            {
                "code": definition["code"],
                "name": definition["name"],
                "description": definition["description"],
                "audience": definition["audience"],
                "min_photos": definition["min_photos"],
                "is_default": definition["is_default"],
                "is_public": True,
                "form_schema": json.loads(json.dumps(program_form_schema(definition))),
            }
            for definition in PROGRAM_CATALOG.values()
        ],
    )


def downgrade() -> None:
    op.drop_index("trees_program_idx", table_name="trees")
    op.drop_column("trees", "program_id")
    op.drop_index("user_planting_programs_program_idx", table_name="user_planting_programs")
    op.drop_index("user_planting_programs_user_idx", table_name="user_planting_programs")
    op.drop_table("user_planting_programs")
    op.drop_index("planting_programs_code_idx", table_name="planting_programs")
    op.drop_table("planting_programs")
