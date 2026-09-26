"""Async SQLAlchemy engine + session management."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.core.rls import apply_rls_to_session


class Base(DeclarativeBase):
    pass


_engine_kwargs: dict = {
    "echo": settings.app_debug,
    "connect_args": {"timeout": 10, "command_timeout": 10},
}
if settings.app_env == "test":
    # Avoid asyncpg pool connections surviving across pytest-asyncio event loops.
    _engine_kwargs["poolclass"] = NullPool
else:
    _engine_kwargs["pool_pre_ping"] = True
    _engine_kwargs["pool_size"] = settings.db_pool_size
    _engine_kwargs["max_overflow"] = settings.db_max_overflow

engine = create_async_engine(settings.database_url, **_engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding an async DB session."""
    async with AsyncSessionLocal() as session:
        await apply_rls_to_session(session)
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
