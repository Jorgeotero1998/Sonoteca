from __future__ import annotations

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/demo", tags=["demo"])


@router.post("/seed")
async def seed():
    raise HTTPException(
        status_code=410,
        detail="Demo seeding is disabled. Use real providers via /catalog/* (Spotify/Deezer).",
    )
