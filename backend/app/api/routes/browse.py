from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.song import Song
from app.models.user import User

router = APIRouter(prefix="/browse", tags=["browse"])


@router.get("/facets")
async def facets(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    limit: int = Query(default=24, ge=1, le=200),
):
    genres = await db.execute(
        select(Song.genre, func.count().label("c"))
        .where(Song.owner_id == user.id, Song.genre.is_not(None))
        .group_by(Song.genre)
        .order_by(func.count().desc())
        .limit(limit)
    )
    artists = await db.execute(
        select(Song.artist, func.count().label("c"))
        .where(Song.owner_id == user.id)
        .group_by(Song.artist)
        .order_by(func.count().desc())
        .limit(limit)
    )
    albums = await db.execute(
        select(Song.album, func.count().label("c"))
        .where(Song.owner_id == user.id, Song.album.is_not(None))
        .group_by(Song.album)
        .order_by(func.count().desc())
        .limit(limit)
    )
    years = await db.execute(
        select(Song.year, func.count().label("c"))
        .where(Song.owner_id == user.id, Song.year.is_not(None))
        .group_by(Song.year)
        .order_by(Song.year.desc())
        .limit(limit)
    )

    return {
        "genres": [{"value": g, "count": int(c)} for g, c in genres.all()],
        "artists": [{"value": a, "count": int(c)} for a, c in artists.all()],
        "albums": [{"value": a, "count": int(c)} for a, c in albums.all()],
        "years": [{"value": y, "count": int(c)} for y, c in years.all()],
    }
