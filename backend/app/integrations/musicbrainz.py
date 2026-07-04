from __future__ import annotations

import asyncio
import random
from typing import Optional

import httpx

from app.integrations.cache import TTLCache


MB_BASE = "https://musicbrainz.org/ws/2"
CAA_BASE = "https://coverartarchive.org"


class MusicBrainzClient:
    def __init__(self) -> None:
        self._http = httpx.AsyncClient(timeout=20, headers={"user-agent": "Sonoteca/1.0 (portfolio app; contact: none)"})
        self._cache = TTLCache()

    async def close(self) -> None:
        await self._http.aclose()

    async def _get(self, url: str, params: Optional[dict] = None) -> dict:
        for attempt in range(4):
            res = await self._http.get(url, params=params)
            if res.status_code in (429, 500, 502, 503, 504):
                await asyncio.sleep((0.35 * (2**attempt)) + random.random() * 0.2)
                continue
            res.raise_for_status()
            return res.json()
        res.raise_for_status()
        return res.json()

    async def search_recording(self, q: str, limit: int = 10) -> dict:
        limit = max(1, min(int(limit), 25))
        key = f"mb:rec:{limit}:{q.strip().lower()}"

        async def _do():
            return await self._get(f"{MB_BASE}/recording", params={"query": q, "fmt": "json", "limit": limit})

        return await self._cache.get_or_set(key, ttl_sec=600, compute=_do)

    async def release_cover(self, release_mbid: str) -> Optional[str]:
        # Try to fetch the "front" image; if it doesn't exist we return None.
        key = f"caa:rel:{release_mbid}"

        async def _do():
            url = f"{CAA_BASE}/release/{release_mbid}"
            res = await self._http.get(url)
            if res.status_code == 404:
                return None
            res.raise_for_status()
            body = res.json()
            images = body.get("images") or []
            front = next((img for img in images if img.get("front")), None) or (images[0] if images else None)
            if not front:
                return None
            return (front.get("thumbnails") or {}).get("large") or front.get("image")

        return await self._cache.get_or_set(key, ttl_sec=86400, compute=_do)


musicbrainz = MusicBrainzClient()

