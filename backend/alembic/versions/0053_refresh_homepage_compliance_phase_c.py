"""Refresh homepage CMS for compliance Phase C multilateral surfacing."""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime

import sqlalchemy as sa

from alembic import op
from app.services.cms.defaults import (
    FOOTER_DEFAULT,
    HEADER_DEFAULT,
    HOME_PAGE_DEFAULT,
    HOME_SECTIONS_DEFAULT,
)

revision = "0053_refresh_homepage_compliance_phase_c"
down_revision = "0052_refresh_homepage_compliance_phase_b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    row = conn.execute(sa.text("SELECT id FROM cms_pages WHERE is_home = true LIMIT 1")).fetchone()
    if row is None:
        return

    page_id = row[0]
    now = datetime.now(UTC)

    conn.execute(sa.text("DELETE FROM cms_sections WHERE page_id = :pid"), {"pid": page_id})

    for section_def in HOME_SECTIONS_DEFAULT:
        conn.execute(
            sa.text(
                """
                INSERT INTO cms_sections
                (id, page_id, section_type, anchor_id, title, content, sort_order, enabled, created_at, updated_at)
                VALUES (:id, :page_id, :section_type, :anchor_id, :title, CAST(:content AS jsonb), :sort_order, true, :now, :now)
                """
            ),
            {
                "id": uuid.uuid4(),
                "page_id": page_id,
                "section_type": section_def["section_type"],
                "anchor_id": section_def.get("anchor_id"),
                "title": section_def["title"],
                "content": json.dumps(section_def["content"]),
                "sort_order": section_def["sort_order"],
                "now": now,
            },
        )

    conn.execute(
        sa.text(
            "UPDATE cms_pages SET title = :title, meta_description = :meta, updated_at = :now WHERE id = :id"
        ),
        {
            "title": HOME_PAGE_DEFAULT["title"],
            "meta": HOME_PAGE_DEFAULT["meta_description"],
            "id": page_id,
            "now": now,
        },
    )

    for key, data in (("header", HEADER_DEFAULT), ("footer", FOOTER_DEFAULT)):
        conn.execute(
            sa.text(
                "UPDATE cms_site_config SET data = CAST(:data AS jsonb), updated_at = :now WHERE config_key = :key"
            ),
            {"key": key, "data": json.dumps(data), "now": now},
        )


def downgrade() -> None:
    pass
