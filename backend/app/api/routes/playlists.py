from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.db import get_db
from app.models.playlist import Playlist, PlaylistItem
from app.models.user import User
from app.schemas.playlists import (
    PlaylistAddSongIn,
    PlaylistCreate,
    PlaylistDetailOut,
    PlaylistOut,
    PlaylistReorderIn,
    PlaylistUpdate,
)
from app.services.catalog_hydrate import hydrate, parse_ref

router = APIRouter(prefix="/playlists", tags=["playlists"])


@router.get("", response_model=List[PlaylistOut])
async def list_playlists(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> List[Playlist]:
    res = await db.execute(
        select(Playlist).where(Playlist.user_id == user.id).order_by(Playlist.created_at.desc())
    )
    return list(res.scalars().all())


@router.post("", response_model=PlaylistOut)
async def create_playlist(
    payload: PlaylistCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner", "editor")),
) -> Playlist:
    pl = Playlist(user_id=user.id, **payload.model_dump())
    if pl.is_public and not pl.share_slug:
        pl.share_slug = Playlist.new_share_slug()
    db.add(pl)
    await db.commit()
    await db.refresh(pl)
    return pl


async def _get_playlist(db: AsyncSession, playlist_id: uuid.UUID, user_id: uuid.UUID) -> Playlist:
    res = await db.execute(select(Playlist).where(Playlist.id == playlist_id, Playlist.user_id == user_id))
    pl = res.scalar_one_or_none()
    if not pl:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return pl


@router.get("/{playlist_id}", response_model=PlaylistDetailOut)
async def get_playlist(
    playlist_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    pl = await _get_playlist(db, playlist_id, user.id)
    items = await db.execute(
        select(PlaylistItem)
        .where(PlaylistItem.playlist_id == pl.id)
        .order_by(PlaylistItem.position.asc())
    )
    item_rows = list(items.scalars().all())
    enriched = []
    for it in item_rows:
        item = await hydrate(db, it.provider, it.provider_id, it.type)
        enriched.append(
            {
                "id": it.id,
                "position": it.position,
                "ref": f"{it.provider}:{it.provider_id}",
                "added_at": it.added_at,
                "item": item,
            }
        )

    base = PlaylistOut.model_validate(pl).model_dump()
    return {**base, "items": enriched}


@router.patch("/{playlist_id}", response_model=PlaylistOut)
async def update_playlist(
    playlist_id: uuid.UUID,
    payload: PlaylistUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner", "editor")),
) -> Playlist:
    pl = await _get_playlist(db, playlist_id, user.id)
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    for k, v in data.items():
        setattr(pl, k, v)
    if pl.is_public and not pl.share_slug:
        pl.share_slug = Playlist.new_share_slug()
    if not pl.is_public:
        pl.share_slug = None
    await db.commit()
    await db.refresh(pl)
    return pl


@router.delete("/{playlist_id}")
async def delete_playlist(
    playlist_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner", "editor")),
):
    pl = await _get_playlist(db, playlist_id, user.id)
    await db.delete(pl)
    await db.commit()
    return {"ok": True}


@router.post("/{playlist_id}/items", response_model=PlaylistDetailOut)
async def add_song_to_playlist(
    playlist_id: uuid.UUID,
    payload: PlaylistAddSongIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner", "editor")),
) -> dict:
    pl = await _get_playlist(db, playlist_id, user.id)

    provider, pid = parse_ref(payload.ref)
    if provider != "deezer":
        raise HTTPException(status_code=400, detail="Playlist items must be Deezer refs (deezer:{id})")

    max_pos = await db.execute(
        select(func.coalesce(func.max(PlaylistItem.position), 0)).where(PlaylistItem.playlist_id == pl.id)
    )
    next_pos = int(max_pos.scalar_one() or 0) + 1

    item = PlaylistItem(
        playlist_id=pl.id,
        provider=provider,
        provider_id=pid,
        type=payload.type,
        position=next_pos,
    )
    db.add(item)
    await db.commit()

    return await get_playlist(pl.id, db=db, user=user)


@router.delete("/{playlist_id}/items/{item_id}", response_model=PlaylistDetailOut)
async def remove_item(
    playlist_id: uuid.UUID,
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner", "editor")),
) -> dict:
    pl = await _get_playlist(db, playlist_id, user.id)
    res = await db.execute(
        select(PlaylistItem).where(PlaylistItem.id == item_id, PlaylistItem.playlist_id == pl.id)
    )
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.delete(item)
    await db.commit()
    return await get_playlist(pl.id, db=db, user=user)


@router.post("/{playlist_id}/reorder", response_model=PlaylistDetailOut)
async def reorder_items(
    playlist_id: uuid.UUID,
    payload: PlaylistReorderIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner", "editor")),
) -> dict:
    pl = await _get_playlist(db, playlist_id, user.id)

    res = await db.execute(
        select(PlaylistItem).where(PlaylistItem.playlist_id == pl.id)
    )
    items = list(res.scalars().all())
    by_id = {i.id: i for i in items}

    ordered = [by_id.get(iid) for iid in payload.ordered_item_ids]
    if any(x is None for x in ordered):
        raise HTTPException(status_code=400, detail="Invalid item ids")
    if len(ordered) != len(items):
        raise HTTPException(status_code=400, detail="Must include all playlist items")

    for idx, item in enumerate(ordered, start=1):
        item.position = idx

    await db.commit()
    return await get_playlist(pl.id, db=db, user=user)


@router.get("/public/{share_slug}", response_model=PlaylistDetailOut)
async def public_playlist(share_slug: str, db: AsyncSession = Depends(get_db)) -> dict:
    res = await db.execute(
        select(Playlist).where(Playlist.share_slug == share_slug, Playlist.is_public == True)  # noqa: E712
    )
    pl = res.scalar_one_or_none()
    if not pl:
        raise HTTPException(status_code=404, detail="Playlist not found")

    items = await db.execute(
        select(PlaylistItem).where(PlaylistItem.playlist_id == pl.id).order_by(PlaylistItem.position.asc())
    )
    item_rows = list(items.scalars().all())
    enriched = []
    for it in item_rows:
        item = await hydrate(db, it.provider, it.provider_id, it.type)
        enriched.append(
            {
                "id": it.id,
                "position": it.position,
                "ref": f"{it.provider}:{it.provider_id}",
                "added_at": it.added_at,
                "item": item,
            }
        )

    base = PlaylistOut.model_validate(pl).model_dump()
    return {**base, "items": enriched}

