from __future__ import annotations

import os
from logging.config import fileConfig

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.core.config import normalize_database_url
from app.core.db import Base
from app.models import catalog, playlist, song, user  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Load environment variables from `backend/.env` for local dev
load_dotenv()


def get_url_and_ssl_required() -> tuple[str, bool]:
    # Prefer NON_POOLING for migrations (PgBouncer transaction pooling can break DDL/migrations)
    raw_url = (
        os.getenv("POSTGRES_URL_NON_POOLING", "")
        or os.getenv("DATABASE_URL", "")
        or os.getenv("POSTGRES_URL", "")
        or os.getenv("POSTGRES_PRISMA_URL", "")
    )
    if not raw_url:
        raise RuntimeError(
            "Database URL env var is required for migrations (POSTGRES_URL_NON_POOLING, DATABASE_URL, POSTGRES_URL, POSTGRES_PRISMA_URL)"
        )
    return normalize_database_url(raw_url)


def run_migrations_offline() -> None:
    url, _ssl_required = get_url_and_ssl_required()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section) or {}
    url, ssl_required = get_url_and_ssl_required()
    configuration["sqlalchemy.url"] = url

    engine_kwargs = {"prefix": "sqlalchemy.", "poolclass": pool.NullPool}
    if ssl_required:
        engine_kwargs["connect_args"] = {"ssl": True}

    connectable = async_engine_from_config(configuration, **engine_kwargs)

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    import asyncio

    asyncio.run(run_migrations_online())

