from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import auth, browse, catalog, demo, me, playlists, songs, stats


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

