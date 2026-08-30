"""India admin geography lookups backed by PostgreSQL."""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.india_admin import repository as repo
from app.services.india_admin.financial_years import current_financial_year, list_financial_years


class IndiaAdminService:
    """State → district → block → GP → village lookups from DB."""

    def financial_years(self) -> dict[str, Any]:
        years = list_financial_years()
        return {"items": years, "current": current_financial_year()}

    async def states(self, db: AsyncSession) -> list[dict[str, Any]]:
        rows = await repo.list_states(db)
        return [{"code": r.code, "lgd": r.lgd, "name": r.name} for r in rows]

    async def districts(self, db: AsyncSession, *, state_code: str) -> list[dict[str, Any]]:
        rows = await repo.list_districts(db, state_code=state_code)
        return [
            {
                "code": r.code,
                "lgd": r.lgd,
                "name": r.name,
                "state_code": r.state_code,
            }
            for r in rows
        ]

    async def cities(self, db: AsyncSession, *, state_code: str) -> list[dict[str, Any]]:
        rows = await repo.list_cities(db, state_code=state_code)
        return [
            {"code": r.name, "name": r.name, "state_code": r.state_code}
            for r in rows
        ]

    async def blocks(
        self, db: AsyncSession, *, state_code: str, district_code: str
    ) -> dict[str, Any]:
        rows = await repo.list_blocks(db, state_code=state_code, district_code=district_code)
        items = [
            {
                "code": r.code or str(r.lgd),
                "lgd": r.lgd,
                "name": r.name,
                "district_code": r.district_code,
                "state_code": r.state_code,
            }
            for r in rows
        ]
        seeded = await repo.geography_is_seeded(db)
        return {
            "items": items,
            "manual_fallback": not seeded and len(items) == 0,
            "hint": None if items else ("not_seeded" if not seeded else None),
            "source": "database",
        }

    async def gram_panchayats(
        self,
        db: AsyncSession,
        *,
        block_lgd: int | None = None,
    ) -> dict[str, Any]:
        if block_lgd is None:
            return {"items": [], "manual_fallback": True, "hint": "missing_parent", "source": "database"}
        rows = await repo.list_gram_panchayats(db, block_lgd=block_lgd)
        items = [{"code": r.code, "name": r.name, "block_lgd": r.block_lgd} for r in rows]
        seeded = await repo.geography_is_seeded(db)
        return {
            "items": items,
            "manual_fallback": len(items) == 0,
            "hint": None if items else ("not_seeded" if not seeded else None),
            "source": "database",
        }

    async def villages(
        self,
        db: AsyncSession,
        *,
        gram_panchayat_code: str | None = None,
    ) -> dict[str, Any]:
        if not gram_panchayat_code:
            return {"items": [], "manual_fallback": True, "hint": "missing_parent", "source": "database"}
        rows = await repo.list_villages(db, gram_panchayat_code=gram_panchayat_code)
        items = [
            {"code": r.code, "name": r.name, "gram_panchayat_code": r.gram_panchayat_code}
            for r in rows
        ]
        seeded = await repo.geography_is_seeded(db)
        return {
            "items": items,
            "manual_fallback": len(items) == 0,
            "hint": None if items else ("not_seeded" if not seeded else None),
            "source": "database",
        }
