from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    pass


engine_kwargs = {"pool_pre_ping": True}
if settings.database_ssl_required:
    # asyncpg doesn't understand libpq `sslmode`, so we strip it and enable SSL here.
    engine_kwargs["connect_args"] = {"ssl": True}

engine = create_async_engine(settings.database_url_async, **engine_kwargs)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db() -> AsyncSession:
    async with SessionLocal() as session:
        yield session
