from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.catalog import UserFavorite, UserHistory, UserLibrary
from app.models.user import User
from app.schemas.me import HydratedOut, RefIn
from app.services.catalog_hydrate import hydrate, parse_ref


router = APIRouter(prefix="/me", tags=["me"])


@router.get("/favorites", response_model=List[HydratedOut])
async def list_favorites(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (
        await db.execute(select(UserFavorite).where(UserFavorite.user_id == user.id).order_by(desc(UserFavorite.created_at)))
    ).scalars().all()
    out: list[HydratedOut] = []
    for r in rows:
        item = await hydrate(db, r.provider, r.provider_id, r.type)
        out.append(
            HydratedOut(ref=f"{r.provider}:{r.provider_id}", type=r.type, created_at=r.created_at, item=item)
        )
    return out


@router.post("/favorites/{ref:path}")
async def add_favorite(ref: str, type: str = "track", db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    provider, pid = parse_ref(ref)
    if provider != "deezer":
        # Enforce Deezer-first persistence for this build.
        raise HTTPException(status_code=400, detail="Favorites must be Deezer refs (deezer:{id})")
    db.add(UserFavorite(user_id=user.id, provider=provider, provider_id=pid, type=type))
    await db.commit()
    return {"ok": True}


@router.delete("/favorites/{ref:path}")
async def remove_favorite(ref: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    provider, pid = parse_ref(ref)
    await db.execute(
        delete(UserFavorite).where(UserFavorite.user_id == user.id, UserFavorite.provider == provider, UserFavorite.provider_id == pid)
    )
    await db.commit()
    return {"ok": True}


@router.get("/library", response_model=List[HydratedOut])
async def list_library(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (
        await db.execute(select(UserLibrary).where(UserLibrary.user_id == user.id).order_by(desc(UserLibrary.created_at)))
    ).scalars().all()
    out: list[HydratedOut] = []
    for r in rows:
        item = await hydrate(db, r.provider, r.provider_id, r.type)
        out.append(
            HydratedOut(ref=f"{r.provider}:{r.provider_id}", type=r.type, created_at=r.created_at, item=item)
        )
    return out


@router.post("/library/{ref:path}")
async def add_library(ref: str, type: str = "track", db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    provider, pid = parse_ref(ref)
    if provider != "deezer":
        raise HTTPException(status_code=400, detail="Library must be Deezer refs (deezer:{id})")
    db.add(UserLibrary(user_id=user.id, provider=provider, provider_id=pid, type=type))
    await db.commit()
    return {"ok": True}


@router.delete("/library/{ref:path}")
async def remove_library(ref: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    provider, pid = parse_ref(ref)
    await db.execute(
        delete(UserLibrary).where(UserLibrary.user_id == user.id, UserLibrary.provider == provider, UserLibrary.provider_id == pid)
    )
    await db.commit()
    return {"ok": True}


@router.post("/history")
async def add_history(payload: RefIn, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    provider, pid = parse_ref(payload.ref)
    # Persist plays for anything, but hydration will be Deezer-first.
    db.add(UserHistory(user_id=user.id, provider=provider, provider_id=pid, type=payload.type, context=payload.context))
    await db.commit()
    return {"ok": True}


@router.get("/history", response_model=List[HydratedOut])
async def list_history(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user), limit: int = 50):
    limit = max(1, min(int(limit), 200))
    rows = (
        await db.execute(
            select(UserHistory)
            .where(UserHistory.user_id == user.id)
            .order_by(desc(UserHistory.played_at))
            .limit(limit)
        )
    ).scalars().all()
    out: list[HydratedOut] = []
    for r in rows:
        item = await hydrate(db, r.provider, r.provider_id, r.type)
        out.append(
            HydratedOut(
                ref=f"{r.provider}:{r.provider_id}",
                type=r.type,
                played_at=r.played_at,
                context=r.context,
                item=item,
            )
        )
    return out

