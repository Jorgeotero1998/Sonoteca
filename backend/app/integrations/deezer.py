from __future__ import annotations

import asyncio
import random
from typing import Optional

import httpx

from app.core.config import settings
from app.integrations.cache import TTLCache


def _embed(kind: str, did: str) -> str:
    # Deezer doesn't have a universally-embeddable official iframe like Spotify.
    # We expose a canonical link and let the frontend open it externally.
    return f"https://www.deezer.com/{kind}/{did}"


class DeezerClient:
    def __init__(self) -> None:
        self._http = httpx.AsyncClient(timeout=20)
        self._cache = TTLCache()

    @property
    def base_url(self) -> str:
        return (settings.deezer_base_url or "https://api.deezer.com").rstrip("/")

    async def close(self) -> None:
        await self._http.aclose()

    async def _get(self, path: str, params: Optional[dict] = None) -> dict:
        url = f"{self.base_url}{path}"
        # Basic jittered retry for transient 429/5xx
        for attempt in range(4):
            res = await self._http.get(url, params=params)
            if res.status_code in (429, 500, 502, 503, 504):
                await asyncio.sleep((0.25 * (2**attempt)) + random.random() * 0.2)
                continue
            res.raise_for_status()
            return res.json()
        res.raise_for_status()
        return res.json()

    def normalize_track(self, t: dict) -> dict:
        artist = t.get("artist") or {}
        album = t.get("album") or {}
        did = str(t.get("id"))
        return {
            "ref": f"deezer:{did}",
            "provider": "deezer",
            "id": did,
            "title": t.get("title"),
            "artist": artist.get("name"),
            "artists": [{"id": str(artist.get("id")) if artist.get("id") is not None else None, "name": artist.get("name")}],
            "album": album.get("title"),
            "album_id": str(album.get("id")) if album.get("id") is not None else None,
            "duration_ms": (int(t.get("duration") or 0) * 1000) or None,
            "rank": t.get("rank"),
            "explicit": t.get("explicit_lyrics"),
            "cover_url": album.get("cover_xl") or album.get("cover_big") or album.get("cover_medium"),
            "preview_url": t.get("preview"),
            "embed_url": _embed("track", did) if did else None,
            "external_urls": {"deezer": t.get("link")},
        }

    def normalize_album(self, a: dict) -> dict:
        artist = a.get("artist") or {}
        did = str(a.get("id"))
        return {
            "ref": f"deezer:{did}",
            "provider": "deezer",
            "id": did,
            "title": a.get("title"),
            "artist": artist.get("name"),
            "artists": [{"id": str(artist.get("id")) if artist.get("id") is not None else None, "name": artist.get("name")}],
            "release_date": a.get("release_date"),
            "cover_url": a.get("cover_xl") or a.get("cover_big") or a.get("cover_medium"),
            "embed_url": _embed("album", did) if did else None,
            "external_urls": {"deezer": a.get("link")},
            "tracklist_url": a.get("tracklist"),
        }

    def normalize_artist(self, a: dict) -> dict:
        did = str(a.get("id"))
        return {
            "ref": f"deezer:{did}",
            "provider": "deezer",
            "id": did,
            "name": a.get("name"),
            "image_url": a.get("picture_xl") or a.get("picture_big") or a.get("picture_medium"),
            "embed_url": _embed("artist", did) if did else None,
            "external_urls": {"deezer": a.get("link")},
            "nb_fan": a.get("nb_fan"),
        }

    async def search(self, q: str, kind: str = "track", limit: int = 25, index: int = 0) -> dict:
        kind = kind.lower().strip()
        if kind not in ("track", "artist", "album"):
            raise ValueError("Invalid Deezer search type")
        limit = max(1, min(int(limit), 50))
        index = max(0, int(index))
        cache_key = f"deezer:search:{kind}:{limit}:{index}:{q.strip().lower()}"

        async def _do():
            body = await self._get(f"/search/{kind}", params={"q": q, "limit": limit, "index": index})
            items = body.get("data") or []
            if kind == "track":
                out = [self.normalize_track(x) for x in items]
            elif kind == "artist":
                out = [self.normalize_artist(x) for x in items]
            else:
                out = [self.normalize_album(x) for x in items]
            return {"provider": "deezer", "type": kind, "items": out}

        return await self._cache.get_or_set(cache_key, ttl_sec=60, compute=_do)

    async def get_track(self, did: str) -> dict:
        cache_key = f"deezer:track:{did}"

        async def _do():
            body = await self._get(f"/track/{did}")
            return self.normalize_track(body)

        return await self._cache.get_or_set(cache_key, ttl_sec=3600, compute=_do)

    async def get_album(self, did: str) -> dict:
        cache_key = f"deezer:album:{did}"

        async def _do():
            body = await self._get(f"/album/{did}")
            out = self.normalize_album(body)
            tracks = (body.get("tracks") or {}).get("data") or []
            out["tracks"] = [self.normalize_track(x) for x in tracks]
            return out

        return await self._cache.get_or_set(cache_key, ttl_sec=3600, compute=_do)

    async def get_artist(self, did: str) -> dict:
        cache_key = f"deezer:artist:{did}"

        async def _do():
            body = await self._get(f"/artist/{did}")
            out = self.normalize_artist(body)
            return out

        return await self._cache.get_or_set(cache_key, ttl_sec=3600, compute=_do)

    async def artist_top(self, artist_id: str, limit: int = 25, index: int = 0) -> dict:
        limit = max(1, min(int(limit), 50))
        index = max(0, int(index))
        cache_key = f"deezer:artist_top:{artist_id}:{limit}:{index}"

        async def _do():
            body = await self._get(f"/artist/{artist_id}/top", params={"limit": limit, "index": index})
            items = body.get("data") or []
            next_url = body.get("next")
            out = [self.normalize_track(x) for x in items]
            has_more = bool(next_url) or (len(out) == limit)
            next_index = index + len(out) if has_more else None
            return {"provider": "deezer", "type": "track", "items": out, "has_more": has_more, "next_index": next_index}

        return await self._cache.get_or_set(cache_key, ttl_sec=120, compute=_do)

    async def artist_albums(self, artist_id: str, limit: int = 25, index: int = 0) -> dict:
        limit = max(1, min(int(limit), 50))
        index = max(0, int(index))
        cache_key = f"deezer:artist_albums:{artist_id}:{limit}:{index}"

        async def _do():
            body = await self._get(f"/artist/{artist_id}/albums", params={"limit": limit, "index": index})
            items = body.get("data") or []
            next_url = body.get("next")
            out = [self.normalize_album(x) for x in items]
            has_more = bool(next_url) or (len(out) == limit)
            next_index = index + len(out) if has_more else None
            return {"provider": "deezer", "type": "album", "items": out, "has_more": has_more, "next_index": next_index}

        return await self._cache.get_or_set(cache_key, ttl_sec=300, compute=_do)

    async def charts(self, limit: int = 25, index: int = 0) -> dict:
        limit = max(1, min(int(limit), 50))
        index = max(0, int(index))
        cache_key = f"deezer:charts:{limit}:{index}"

        async def _do():
            body = await self._get("/chart", params={"limit": limit, "index": index})
            return {
                "provider": "deezer",
                "tracks": [self.normalize_track(x) for x in ((body.get("tracks") or {}).get("data") or [])],
                "albums": [self.normalize_album(x) for x in ((body.get("albums") or {}).get("data") or [])],
                "artists": [self.normalize_artist(x) for x in ((body.get("artists") or {}).get("data") or [])],
                "playlists": (body.get("playlists") or {}).get("data") or [],
            }

        return await self._cache.get_or_set(cache_key, ttl_sec=120, compute=_do)

    async def new_releases(self, limit: int = 25, index: int = 0) -> dict:
        limit = max(1, min(int(limit), 50))
        index = max(0, int(index))
        cache_key = f"deezer:newreleases:{limit}:{index}"

        async def _do():
            # Deezer editorial releases (global)
            body = await self._get("/editorial/0/releases", params={"limit": limit, "index": index})
            items = body.get("data") or []
            return {"provider": "deezer", "type": "album", "items": [self.normalize_album(x) for x in items]}

        return await self._cache.get_or_set(cache_key, ttl_sec=300, compute=_do)


deezer = DeezerClient()

