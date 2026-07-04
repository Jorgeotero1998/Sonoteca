from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.db import get_db
from app.models.song import Song
from app.models.user import User
from app.schemas.songs import SongCreate, SongOut, SongUpdate

router = APIRouter(prefix="/songs", tags=["songs"])


@router.get("", response_model=List[SongOut])
async def list_songs(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    q: Optional[str] = None,
    artist: Optional[str] = None,
    album: Optional[str] = None,
    genre: Optional[str] = None,
    year: Optional[int] = Query(default=None, ge=1900, le=2100),
    key: Optional[str] = None,
    bpm_min: Optional[int] = Query(default=None, ge=1, le=400),
    bpm_max: Optional[int] = Query(default=None, ge=1, le=400),
    tag: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=500),
) -> List[Song]:
    filters = [Song.owner_id == user.id]

    if artist:
        filters.append(func.lower(Song.artist) == artist.lower())
    if album:
        filters.append(Song.album.is_not(None))
        filters.append(func.lower(Song.album) == album.lower())
    if genre:
        filters.append(func.lower(Song.genre) == genre.lower())
    if year is not None:
        filters.append(Song.year == year)
    if key:
        filters.append(func.lower(Song.key) == key.lower())
    if bpm_min is not None:
        filters.append(Song.bpm.is_not(None))
        filters.append(Song.bpm >= bpm_min)
    if bpm_max is not None:
        filters.append(Song.bpm.is_not(None))
        filters.append(Song.bpm <= bpm_max)
    if tag:
        # JSONB array contains
        filters.append(Song.tags.contains([tag]))
    if q:
        like = f"%{q.strip().lower()}%"
        filters.append(
            or_(
                func.lower(Song.title).like(like),
                func.lower(Song.artist).like(like),
                func.lower(Song.album).like(like),
            )
        )

    stmt = select(Song).where(and_(*filters)).order_by(Song.created_at.desc()).limit(limit)
    res = await db.execute(stmt)
    return list(res.scalars().all())


@router.post("", response_model=SongOut)
async def create_song(
    payload: SongCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner", "editor")),
) -> Song:
    data = payload.model_dump()
    if not data.get("cover_url"):
        # Free placeholder images (nice for demo). Deterministic by UUID after insert.
        data["cover_url"] = None
    song = Song(owner_id=user.id, **data)
    db.add(song)
    await db.commit()
    await db.refresh(song)
    if not song.cover_url:
        song.cover_url = f"https://picsum.photos/seed/sonoteca-{song.id}/420/420"
        await db.commit()
        await db.refresh(song)
    return song


@router.patch("/{song_id}", response_model=SongOut)
async def update_song(
    song_id: uuid.UUID,
    payload: SongUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner", "editor")),
) -> Song:
    stmt = select(Song).where(Song.id == song_id, Song.owner_id == user.id)
    res = await db.execute(stmt)
    song = res.scalar_one_or_none()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "tags" in payload.model_dump() and payload.tags is None:
        # leave tags unchanged
        data.pop("tags", None)
    for k, v in data.items():
        setattr(song, k, v)

    await db.commit()
    await db.refresh(song)
    return song


@router.delete("/{song_id}")
async def delete_song(
    song_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner", "editor")),
):
    stmt = delete(Song).where(Song.id == song_id, Song.owner_id == user.id).returning(Song.id)
    res = await db.execute(stmt)
    deleted = res.scalar_one_or_none()
    if not deleted:
        raise HTTPException(status_code=404, detail="Song not found")
    await db.commit()
    return {"ok": True}
