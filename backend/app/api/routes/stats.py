from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.playlist import Playlist
from app.models.song import Song
from app.models.user import User

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/overview")
async def overview(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    songs_count = await db.execute(select(func.count()).select_from(Song).where(Song.owner_id == user.id))
    playlists_count = await db.execute(select(func.count()).select_from(Playlist).where(Playlist.owner_id == user.id))

    duration_sum = await db.execute(
        select(func.coalesce(func.sum(Song.duration_sec), 0))
        .where(Song.owner_id == user.id)
    )

    top_genres = await db.execute(
        select(Song.genre, func.count().label("c"))
        .where(Song.owner_id == user.id, Song.genre.is_not(None))
        .group_by(Song.genre)
        .order_by(func.count().desc())
        .limit(5)
    )
    top_artists = await db.execute(
        select(Song.artist, func.count().label("c"))
        .where(Song.owner_id == user.id)
        .group_by(Song.artist)
        .order_by(func.count().desc())
        .limit(5)
    )

    return {
        "songs": int(songs_count.scalar_one() or 0),
        "playlists": int(playlists_count.scalar_one() or 0),
        "total_duration_sec": int(duration_sum.scalar_one() or 0),
        "top_genres": [{"genre": g, "count": int(c)} for g, c in top_genres.all()],
        "top_artists": [{"artist": a, "count": int(c)} for a, c in top_artists.all()],
    }

