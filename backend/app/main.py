from __future__ import annotations

import logging
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request

from app.api.routes import auth, browse, catalog, demo, me, playlists, songs, stats
from app.core.config import settings

logger = logging.getLogger("sonoteca")


def create_app() -> FastAPI:
    app = FastAPI(title="Sonoteca API", version="1.0.0")

    origins = settings.cors_origin_list
    if origins == ["*"]:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=False,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    else:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "request method=%s path=%s status=%s duration_ms=%.2f",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
        return response

    @app.get("/health")
    async def health():
        return {"ok": True}

    app.include_router(auth.router)
    app.include_router(songs.router)
    app.include_router(playlists.router)
    app.include_router(stats.router)
    app.include_router(browse.router)
    app.include_router(catalog.router)
    app.include_router(me.router)
    app.include_router(demo.router)

    return app


app = create_app()
