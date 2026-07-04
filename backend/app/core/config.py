from __future__ import annotations

import os
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/sonoteca"

    jwt_secret: str = "change-me-change-me-change-me-change-me"
    jwt_alg: str = "HS256"
    access_token_ttl_min: int = 60

    cors_origins: str = "http://localhost:5173"

    # Catalog integrations (real music metadata / previews)
    spotify_client_id: str = ""
    spotify_client_secret: str = ""
    deezer_base_url: str = "https://api.deezer.com"

    catalog_cache_ttl_sec: int = 120

    @property
    def database_url_async(self) -> str:
        # Vercel Postgres injects `POSTGRES_URL*`; prefer those when `DATABASE_URL` isn't set.
        # Keep `DATABASE_URL` as the primary override for portability (local/dev/other hosts).
        env_url = (
            os.getenv("DATABASE_URL")
            or os.getenv("POSTGRES_URL")
            or os.getenv("POSTGRES_PRISMA_URL")
            or os.getenv("POSTGRES_URL_NON_POOLING")
        )
        url = (env_url or self.database_url or "").strip()
        if url.startswith("postgresql+asyncpg://"):
            return url
        # Common providers often provide `postgres://` or `postgresql://`
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def cors_origin_list(self) -> List[str]:
        v = (self.cors_origins or "").strip()
        if v == "*" or not v:
            return ["*"]
        return [x.strip() for x in v.split(",") if x.strip()]


settings = Settings()

