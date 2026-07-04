from __future__ import annotations

import base64
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings
from app.integrations.cache import TTLCache


SPOTIFY_API = "https://api.spotify.com/v1"
SPOTIFY_ACCOUNTS = "https://accounts.spotify.com/api/token"


def _cover_from_images(images: List[dict] | None) -> Optional[str]:
    if not images:
        return None
    # Spotify returns biggest first; still be defensive.
    best = max(images, key=lambda x: int(x.get("width") or 0))
    return best.get("url")


def _embed(kind: str, sid: str) -> str:
    return f"https://open.spotify.com/embed/{kind}/{sid}"


@dataclass
class SpotifyToken:
    access_token: str
    expires_at: float

    def valid(self) -> bool:
        return time.time() < (self.expires_at - 20)


class SpotifyClient:
    def __init__(self) -> None:
        self._http = httpx.AsyncClient(timeout=20)
        self._cache = TTLCache()
        self._token: Optional[SpotifyToken] = None

    def enabled(self) -> bool:
        return bool(settings.spotify_client_id and settings.spotify_client_secret)

    async def close(self) -> None:
        await self._http.aclose()

    async def _get_token(self) -> str:
        if self._token and self._token.valid():
            return self._token.access_token

        cid = (settings.spotify_client_id or "").strip()
        csec = (settings.spotify_client_secret or "").strip()
        if not cid or not csec:
            raise RuntimeError("Spotify not configured (missing SPOTIFY_CLIENT_ID/SECRET)")

        basic = base64.b64encode(f"{cid}:{csec}".encode("utf-8")).decode("ascii")
        res = await self._http.post(
            SPOTIFY_ACCOUNTS,
            headers={"authorization": f"Basic {basic}", "content-type": "application/x-www-form-urlencoded"},
            data={"grant_type": "client_credentials"},
        )
        res.raise_for_status()
        body = res.json()
        token = body["access_token"]
        expires_in = int(body.get("expires_in") or 3600)
        self._token = SpotifyToken(access_token=token, expires_at=time.time() + expires_in)
        return token

    async def _get(self, path: str, params: Optional[dict] = None) -> dict:
        token = await self._get_token()
        res = await self._http.get(f"{SPOTIFY_API}{path}", params=params, headers={"authorization": f"Bearer {token}"})
        res.raise_for_status()
        return res.json()

    def normalize_track(self, t: dict) -> dict:
        album = t.get("album") or {}
        artists = t.get("artists") or []
        artist_name = (artists[0].get("name") if artists else None) or ""
        album_images = album.get("images") or []
        cover_url = _cover_from_images(album_images)
        sid = t.get("id")
        return {
            "ref": f"spotify:{sid}",
            "provider": "spotify",
            "id": sid,
            "uri": t.get("uri"),
            "title": t.get("name"),
            "artists": [{"id": a.get("id"), "name": a.get("name")} for a in artists],
            "artist": artist_name,
            "album": album.get("name"),
            "album_id": album.get("id"),
            "release_date": album.get("release_date"),
            "duration_ms": t.get("duration_ms"),
            "popularity": t.get("popularity"),
            "explicit": t.get("explicit"),
            "images": album_images,
            "cover_url": cover_url,
            "preview_url": t.get("preview_url"),
            "embed_url": _embed("track", sid) if sid else None,
            "external_urls": t.get("external_urls"),
        }

    def normalize_album(self, a: dict) -> dict:
        images = a.get("images") or []
        aid = a.get("id")
        artists = a.get("artists") or []
        return {
            "ref": f"spotify:{aid}",
            "provider": "spotify",
            "id": aid,
            "uri": a.get("uri"),
            "title": a.get("name"),
            "artists": [{"id": x.get("id"), "name": x.get("name")} for x in artists],
            "artist": (artists[0].get("name") if artists else None),
            "release_date": a.get("release_date"),
            "images": images,
            "cover_url": _cover_from_images(images),
            "embed_url": _embed("album", aid) if aid else None,
            "external_urls": a.get("external_urls"),
            "total_tracks": a.get("total_tracks"),
        }

    def normalize_artist(self, a: dict) -> dict:
        images = a.get("images") or []
        arid = a.get("id")
        return {
            "ref": f"spotify:{arid}",
            "provider": "spotify",
            "id": arid,
            "uri": a.get("uri"),
            "name": a.get("name"),
            "genres": a.get("genres") or [],
            "popularity": a.get("popularity"),
            "images": images,
            "image_url": _cover_from_images(images),
            "embed_url": _embed("artist", arid) if arid else None,
            "external_urls": a.get("external_urls"),
            "followers": (a.get("followers") or {}).get("total"),
        }

    async def search(self, q: str, kind: str = "track", limit: int = 20) -> dict:
        kind = kind.lower().strip()
        if kind not in ("track", "artist", "album"):
            raise ValueError("Invalid Spotify search type")
        limit = max(1, min(int(limit), 50))
        cache_key = f"spotify:search:{kind}:{limit}:{q.strip().lower()}"

        async def _do():
            body = await self._get("/search", params={"q": q, "type": kind, "limit": limit, "market": "US"})
            items = (((body.get(f"{kind}s") or {}).get("items")) or []) if kind != "album" else (((body.get("albums") or {}).get("items")) or [])
            if kind == "track":
                out = [self.normalize_track(x) for x in items]
            elif kind == "artist":
                out = [self.normalize_artist(x) for x in items]
            else:
                out = [self.normalize_album(x) for x in items]
            return {"provider": "spotify", "type": kind, "items": out}

        return await self._cache.get_or_set(cache_key, ttl_sec=60, compute=_do)

    async def get_track(self, sid: str) -> dict:
        cache_key = f"spotify:track:{sid}"

        async def _do():
            body = await self._get(f"/tracks/{sid}", params={"market": "US"})
            return self.normalize_track(body)

        return await self._cache.get_or_set(cache_key, ttl_sec=3600, compute=_do)

    async def get_album(self, sid: str) -> dict:
        cache_key = f"spotify:album:{sid}"

        async def _do():
            body = await self._get(f"/albums/{sid}", params={"market": "US"})
            out = self.normalize_album(body)
            tracks = (body.get("tracks") or {}).get("items") or []
            out["tracks"] = [self.normalize_track({**t, "album": body}) for t in tracks]
            return out

        return await self._cache.get_or_set(cache_key, ttl_sec=3600, compute=_do)

    async def get_artist(self, sid: str) -> dict:
        cache_key = f"spotify:artist:{sid}"

        async def _do():
            body = await self._get(f"/artists/{sid}")
            out = self.normalize_artist(body)
            return out

        return await self._cache.get_or_set(cache_key, ttl_sec=3600, compute=_do)

    async def new_releases(self, limit: int = 20) -> dict:
        limit = max(1, min(int(limit), 50))
        cache_key = f"spotify:newreleases:{limit}"

        async def _do():
            body = await self._get("/browse/new-releases", params={"limit": limit, "country": "US"})
            items = ((body.get("albums") or {}).get("items")) or []
            return {"provider": "spotify", "type": "album", "items": [self.normalize_album(x) for x in items]}

        return await self._cache.get_or_set(cache_key, ttl_sec=300, compute=_do)


spotify = SpotifyClient()

