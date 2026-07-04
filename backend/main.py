from __future__ import annotations

# Vercel Services entrypoint for the backend service.
# Exporting a top-level `app` lets Vercel run FastAPI as an ASGI Function.
from app.main import app  # noqa: F401
