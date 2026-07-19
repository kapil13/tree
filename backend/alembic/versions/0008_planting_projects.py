"""Planting projects, work areas, standards, and compliance.

Revision ID: 0008_planting_projects
Revises: 0007_planting_programs
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0008_planting_projects"
down_revision = "0007_planting_programs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "planting_projects",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("code", sa.String(64), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.String(1024), nullable=False, server_default=""),
        sa.Column("segment", sa.String(64), nullable=False, server_default="general"),
        sa.Column("compliance_mode", sa.String(16), nullable=False, server_default="guided"),
        sa.Column("status", sa.String(32), nullable=False, server_default="planning"),
        sa.Column("program_code", sa.String(64)),
        sa.Column("standard_template_code", sa.String(64)),
        sa.Column("target_tree_count", sa.Integer()),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="SET NULL"),
        ),
        sa.Column(
            "owner_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "metadata",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "planting_projects_org_code_idx",
        "planting_projects",
        ["organization_id", "code"],
        unique=True,
    )
    op.create_index("planting_projects_owner_idx", "planting_projects", ["owner_user_id"])
    op.create_index("planting_projects_segment_idx", "planting_projects", ["segment"])

    op.create_table(
        "planting_standards",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("planting_projects.id", ondelete="CASCADE"),
        ),
        sa.Column("template_code", sa.String(64)),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("is_template_snapshot", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "rules",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.add_column(
        "plantation_fences",
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("planting_projects.id", ondelete="CASCADE"),
        ),
    )
    op.add_column(
        "plantation_fences",
        sa.Column(
            "planting_standard_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("planting_standards.id", ondelete="SET NULL"),
        ),
    )
    op.add_column(
        "plantation_fences",
        sa.Column("geometry_type", sa.String(16), nullable=False, server_default="polygon"),
    )
    op.add_column("plantation_fences", sa.Column("buffer_m", sa.Numeric(8, 2)))
    op.add_column("plantation_fences", sa.Column("chainage_start_km", sa.Numeric(10, 3)))
    op.add_column("plantation_fences", sa.Column("chainage_end_km", sa.Numeric(10, 3)))
    op.add_column("plantation_fences", sa.Column("segment_code", sa.String(64)))
    op.create_index("plantation_fences_project_idx", "plantation_fences", ["project_id"])

    op.add_column(
        "trees",
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("planting_projects.id", ondelete="SET NULL"),
        ),
    )
    # Clear orphan plantation references before adding the FK (common on upgraded DBs).
    op.execute(
        sa.text(
            """
            UPDATE trees
            SET plantation_id = NULL
            WHERE plantation_id IS NOT NULL
              AND NOT EXISTS (
                SELECT 1 FROM plantation_fences pf WHERE pf.id = trees.plantation_id
              )
            """
        )
    )
    op.create_foreign_key(
        "trees_plantation_id_fkey",
        "trees",
        "plantation_fences",
        ["plantation_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("trees_plantation_idx", "trees", ["plantation_id"])
    op.create_index("trees_project_idx", "trees", ["project_id"])

    op.create_table(
        "planting_compliance_violations",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("planting_projects.id", ondelete="SET NULL"),
        ),
        sa.Column(
            "work_area_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("plantation_fences.id", ondelete="SET NULL"),
        ),
        sa.Column(
            "tree_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("trees.id", ondelete="SET NULL"),
        ),
        sa.Column("violation_type", sa.String(64), nullable=False),
        sa.Column("severity", sa.String(16), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "metadata",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "planting_compliance_project_idx",
        "planting_compliance_violations",
        ["project_id"],
    )
    op.create_index(
        "planting_compliance_work_area_idx",
        "planting_compliance_violations",
        ["work_area_id"],
    )


def downgrade() -> None:
    op.drop_index("planting_compliance_work_area_idx", table_name="planting_compliance_violations")
    op.drop_index("planting_compliance_project_idx", table_name="planting_compliance_violations")
    op.drop_table("planting_compliance_violations")

    op.drop_index("trees_project_idx", table_name="trees")
    op.drop_index("trees_plantation_idx", table_name="trees")
    op.drop_constraint("trees_plantation_id_fkey", "trees", type_="foreignkey")
    op.drop_column("trees", "project_id")

    op.drop_index("plantation_fences_project_idx", table_name="plantation_fences")
    op.drop_column("plantation_fences", "segment_code")
    op.drop_column("plantation_fences", "chainage_end_km")
    op.drop_column("plantation_fences", "chainage_start_km")
    op.drop_column("plantation_fences", "buffer_m")
    op.drop_column("plantation_fences", "geometry_type")
    op.drop_column("plantation_fences", "planting_standard_id")
    op.drop_column("plantation_fences", "project_id")

    op.drop_table("planting_standards")
    op.drop_index("planting_projects_segment_idx", table_name="planting_projects")
    op.drop_index("planting_projects_owner_idx", table_name="planting_projects")
    op.drop_index("planting_projects_org_code_idx", table_name="planting_projects")
    op.drop_table("planting_projects")
