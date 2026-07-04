from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.integrations.deezer import deezer
from app.integrations.spotify import spotify
from app.models.catalog import CatalogItem


_REF_RE = re.compile(r"^(?P<provider>[a-zA-Z0-9_]+):(?P<id>.+)$")


def parse_ref(ref: str) -> Tuple[str, str]:
    m = _REF_RE.match((ref or "").strip())
    if not m:
        raise HTTPException(status_code=400, detail="Invalid ref format. Expected provider:id")
    provider = m.group("provider").lower()
    pid = m.group("id")
    if provider == "spotify" and pid.startswith(("track:", "album:", "artist:")):
        pid = pid.split(":", 1)[1]
    return provider, pid


def _fresh(updated_at: datetime) -> bool:
    ttl = int(getattr(settings, "catalog_cache_ttl_sec", 120) or 120)
    if ttl <= 0:
        return False
    now = datetime.now(timezone.utc)
    if updated_at.tzinfo is None:
        updated_at = updated_at.replace(tzinfo=timezone.utc)
    return (now - updated_at) < timedelta(seconds=ttl)


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
        if dt != st or da != sa:
            continue
        if sdur and ddur and abs(sdur - ddur) > 4500:
            continue
        score = 1.0
        if salb and dalb and salb == dalb:
            score += 0.3
        if sdur and ddur:
            score += max(0.0, 0.2 - (abs(sdur - ddur) / 4500) * 0.2)
        if score > best_score:
            best, best_score = dz, score
    return best


async def hydrate(db: AsyncSession, provider: str, provider_id: str, type: str) -> dict:
    provider = (provider or "deezer").lower().strip()
    type = (type or "track").lower().strip()
    # DB cache lookup
    row = (
        await db.execute(
            select(CatalogItem).where(
                CatalogItem.provider == provider, CatalogItem.provider_id == provider_id, CatalogItem.type == type
            )
        )
    ).scalar_one_or_none()

    if row and _fresh(row.updated_at):
        return dict(row.payload_json or {})

    # Fetch from provider (Deezer-first; Spotify optional)
    if provider == "deezer":
        if type == "track":
            item = await deezer.get_track(provider_id)
        elif type == "album":
            item = await deezer.get_album(provider_id)
        elif type == "artist":
            item = await deezer.get_artist(provider_id)
        else:
            raise HTTPException(status_code=400, detail="Unsupported type")
    elif provider == "spotify":
        if type == "track":
            item = await spotify.get_track(provider_id)
            if not item.get("preview_url"):
                dz = await deezer.search(f'{item.get("artist")} {item.get("title")}', kind="track", limit=10)
                m = _best_deezer_match(item, dz.get("items") or [])
                if m and m.get("preview_url"):
                    item["preview_url"] = m.get("preview_url")
                    item["preview_ref"] = m.get("ref")
        elif type == "album":
            item = await spotify.get_album(provider_id)
        elif type == "artist":
            item = await spotify.get_artist(provider_id)
        else:
            raise HTTPException(status_code=400, detail="Unsupported type")
    else:
        raise HTTPException(status_code=400, detail="Unsupported provider")

    # Upsert cache
    if row:
        row.payload_json = item
        row.updated_at = datetime.now(timezone.utc)
    else:
        db.add(
            CatalogItem(
                provider=provider,
                provider_id=provider_id,
                type=type,
                payload_json=item,
            )
        )
    await db.commit()
    return item

