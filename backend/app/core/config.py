from __future__ import annotations

import os
from typing import List
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic_settings import BaseSettings, SettingsConfigDict

_SSL_REQUIRED_MODES = {"require", "verify-full", "verify-ca"}


def normalize_database_url(url: str) -> tuple[str, bool]:
    """Normalize provider DB URLs for SQLAlchemy+asyncpg.

    - Convert postgres/postgresql schemes to postgresql+asyncpg
    - Remove libpq-only query params like `sslmode` and `channel_binding` (asyncpg will choke on them)
    - Derive whether SSL is required from sslmode
    """

    url = (url or "").strip()
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    parts = urlsplit(url)
    if not parts.query:
        return url, False

    params = parse_qsl(parts.query, keep_blank_values=True)
    sslmode: str | None = None
    removed_any = False
    filtered: list[tuple[str, str]] = []
    for k, v in params:
        key = (k or "").lower()
        if key == "sslmode":
            removed_any = True
            sslmode = (v or "").lower()
            continue
        if key == "channel_binding":
            removed_any = True
            continue
        filtered.append((k, v))

    if not removed_any:
        return url, False

    ssl_required = (sslmode or "") in _SSL_REQUIRED_MODES
    new_query = urlencode(filtered, doseq=True)
    normalized = urlunsplit((parts.scheme, parts.netloc, parts.path, new_query, parts.fragment))
    return normalized, ssl_required


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

    def _database_url_async_and_ssl_required(self) -> tuple[str, bool]:
        # Vercel Postgres injects `POSTGRES_URL*`; prefer those when `DATABASE_URL` isn't set.
        # Keep `DATABASE_URL` as the primary override for portability (local/dev/other hosts).
        env_url = (
            os.getenv("DATABASE_URL")
            or os.getenv("POSTGRES_URL")
            or os.getenv("POSTGRES_PRISMA_URL")
            or os.getenv("POSTGRES_URL_NON_POOLING")
        )
        url = (env_url or self.database_url or "").strip()
        return normalize_database_url(url)

    @property
    def database_url_async(self) -> str:
        url, _ssl_required = self._database_url_async_and_ssl_required()
        return url

    @property
    def database_ssl_required(self) -> bool:
        _url, ssl_required = self._database_url_async_and_ssl_required()
        return ssl_required

    @property
    def cors_origin_list(self) -> List[str]:
        v = (self.cors_origins or "").strip()
        if v == "*" or not v:
            return ["*"]
        return [x.strip() for x in v.split(",") if x.strip()]


settings = Settings()
