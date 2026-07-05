from __future__ import annotations

import re
from typing import Optional, Tuple

from fastapi import APIRouter, HTTPException, Query

from app.integrations.deezer import deezer
from app.integrations.spotify import spotify

router = APIRouter(prefix="/catalog", tags=["catalog"])


_REF_RE = re.compile(r"^(?P<provider>[a-zA-Z0-9_]+):(?P<id>.+)$")


def _parse_ref(ref: str) -> Tuple[str, str]:
    m = _REF_RE.match((ref or "").strip())
    if not m:
        raise HTTPException(status_code=400, detail="Invalid ref format. Expected provider:id")
    provider = m.group("provider").lower()
    pid = m.group("id")
    # allow spotify:track:{id} style
    if provider == "spotify" and pid.startswith("track:"):
        pid = pid.split("track:", 1)[1]
    if provider == "spotify" and pid.startswith("album:"):
        pid = pid.split("album:", 1)[1]
    if provider == "spotify" and pid.startswith("artist:"):
        pid = pid.split("artist:", 1)[1]
    return provider, pid


def _norm(s: Optional[str]) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()


def _best_deezer_match(sp: dict, dz_items: list[dict]) -> Optional[dict]:
    st = _norm(sp.get("title"))
    sa = _norm(sp.get("artist"))
    salb = _norm(sp.get("album"))
    sdur = int(sp.get("duration_ms") or 0)
    best = None
    best_score = -1.0
    for dz in dz_items:
        dt = _norm(dz.get("title"))
        da = _norm(dz.get("artist"))
        dalb = _norm(dz.get("album"))
        ddur = int(dz.get("duration_ms") or 0)
        if not dt or not da:
            continue
        # Hard gates
        if dt != st:
            continue
        if da != sa:
            continue
        # Duration tolerance (Spotify duration_ms vs Deezer duration_sec*1000)
        if sdur and ddur and abs(sdur - ddur) > 4500:
            continue
        score = 1.0
        if salb and dalb and salb == dalb:
            score += 0.3
        if sdur and ddur:
            score += max(0.0, 0.2 - (abs(sdur - ddur) / 4500) * 0.2)
        if score > best_score:
            best = dz
            best_score = score
    return best


@router.get("/providers")
async def providers() -> dict:
    return {"spotify": {"enabled": spotify.enabled()}, "deezer": {"enabled": True}}


@router.get("/search")
async def search(
    q: str = Query(min_length=1, max_length=200),
    type: str = Query(default="track", pattern="^(track|artist|album)$"),
    limit: int = Query(default=25, ge=1, le=50),
    provider: str = Query(default="deezer", pattern="^(deezer|spotify)$"),
    index: int = Query(default=0, ge=0, le=10000),
) -> dict:
    kind = type.lower()

    p = provider.lower().strip()

    if kind == "track":
        # Deezer is the default/primary provider (previews).
        if p == "deezer" or not spotify.enabled():
            dz = await deezer.search(q, kind="track", limit=min(limit, 50), index=index)
            return {"type": "track", "provider": "deezer", "items": dz.get("items") or []}

        # Spotify optional: return Spotify metadata but always try to attach Deezer preview when missing.
        dz = await deezer.search(q, kind="track", limit=min(limit, 50), index=index)
        dz_items = dz.get("items") or []
        sp = await spotify.search(q, kind="track", limit=min(limit, 50))
        sp_items = sp.get("items") or []
        merged = []
        for t in sp_items:
            out = dict(t)
            if not out.get("preview_url"):
                m = _best_deezer_match(out, dz_items)
                if m and m.get("preview_url"):
                    out["preview_url"] = m.get("preview_url")
                    out["preview_ref"] = m.get("ref")
            merged.append(out)
        return {"type": "track", "provider": "spotify", "items": merged}

    if kind == "artist":
        if p == "spotify" and spotify.enabled():
            sp = await spotify.search(q, kind="artist", limit=min(limit, 50))
            return {"type": "artist", "provider": "spotify", "items": sp.get("items") or []}
        dz = await deezer.search(q, kind="artist", limit=min(limit, 50), index=index)
        return {"type": "artist", "provider": "deezer", "items": dz.get("items") or []}

    # album
    if p == "spotify" and spotify.enabled():
        sp = await spotify.search(q, kind="album", limit=min(limit, 50))
        return {"type": "album", "provider": "spotify", "items": sp.get("items") or []}
    dz = await deezer.search(q, kind="album", limit=min(limit, 50), index=index)
    return {"type": "album", "provider": "deezer", "items": dz.get("items") or []}


@router.get("/track/{ref}")
async def get_track(ref: str) -> dict:
    provider, pid = _parse_ref(ref)
    if provider == "spotify":
        t = await spotify.get_track(pid)
        if not t.get("preview_url"):
            # Try to obtain a Deezer preview opportunistically.
            dz = await deezer.search(f"{t.get('artist')} {t.get('title')}", kind="track", limit=10)
            m = _best_deezer_match(t, dz.get("items") or [])
            if m and m.get("preview_url"):
                t["preview_url"] = m.get("preview_url")
                t["preview_ref"] = m.get("ref")
        return t
    if provider == "deezer":
        return await deezer.get_track(pid)
    raise HTTPException(status_code=400, detail="Unsupported provider")


@router.get("/album/{ref}")
async def get_album(ref: str) -> dict:
    provider, pid = _parse_ref(ref)
    if provider == "spotify":
        return await spotify.get_album(pid)
    if provider == "deezer":
        return await deezer.get_album(pid)
    raise HTTPException(status_code=400, detail="Unsupported provider")


@router.get("/artist/{ref}")
async def get_artist(ref: str) -> dict:
    provider, pid = _parse_ref(ref)
    if provider == "spotify":
        return await spotify.get_artist(pid)
    if provider == "deezer":
        return await deezer.get_artist(pid)
    raise HTTPException(status_code=400, detail="Unsupported provider")


@router.get("/artist/{ref}/top")
async def artist_top(
    ref: str,
    limit: int = Query(default=25, ge=1, le=50),
    index: int = Query(default=0, ge=0, le=10000),
) -> dict:
    provider, pid = _parse_ref(ref)
    if provider != "deezer":
        raise HTTPException(status_code=400, detail="Artist top is Deezer-only for this build")
    return await deezer.artist_top(pid, limit=limit, index=index)


@router.get("/artist/{ref}/albums")
async def artist_albums(
    ref: str,
    limit: int = Query(default=25, ge=1, le=50),
    index: int = Query(default=0, ge=0, le=10000),
) -> dict:
    provider, pid = _parse_ref(ref)
    if provider != "deezer":
        raise HTTPException(status_code=400, detail="Artist albums is Deezer-only for this build")
    return await deezer.artist_albums(pid, limit=limit, index=index)


@router.get("/charts")
async def charts(
    limit: int = Query(default=25, ge=1, le=50),
    index: int = Query(default=0, ge=0, le=10000),
) -> dict:
    return await deezer.charts(limit=limit, index=index)


@router.get("/new-releases")
async def new_releases(
    limit: int = Query(default=25, ge=1, le=50),
    index: int = Query(default=0, ge=0, le=10000),
) -> dict:
    return await deezer.new_releases(limit=min(limit, 50), index=index)
