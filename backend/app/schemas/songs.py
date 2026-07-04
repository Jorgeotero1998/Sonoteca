from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class SongCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    artist: str = Field(min_length=1, max_length=200)
    album: Optional[str] = Field(default=None, max_length=200)
    year: Optional[int] = Field(default=None, ge=1900, le=2100)
    genre: Optional[str] = Field(default=None, max_length=80)
    bpm: Optional[int] = Field(default=None, ge=1, le=400)
    key: Optional[str] = Field(default=None, max_length=20)
    duration_sec: Optional[int] = Field(default=None, ge=1, le=60 * 60 * 6)
    cover_url: Optional[str] = Field(default=None, max_length=600)
    audio_url: Optional[str] = Field(default=None, max_length=900)
    tags: List[str] = Field(default_factory=list, max_length=50)


class SongUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    artist: Optional[str] = Field(default=None, min_length=1, max_length=200)
    album: Optional[str] = Field(default=None, max_length=200)
    year: Optional[int] = Field(default=None, ge=1900, le=2100)
    genre: Optional[str] = Field(default=None, max_length=80)
    bpm: Optional[int] = Field(default=None, ge=1, le=400)
    key: Optional[str] = Field(default=None, max_length=20)
    duration_sec: Optional[int] = Field(default=None, ge=1, le=60 * 60 * 6)
    cover_url: Optional[str] = Field(default=None, max_length=600)
    audio_url: Optional[str] = Field(default=None, max_length=900)
    tags: Optional[List[str]] = None


class SongOut(BaseModel):
    id: uuid.UUID
    title: str
    artist: str
    album: Optional[str]
    year: Optional[int]
    genre: Optional[str]
    bpm: Optional[int]
    key: Optional[str]
    duration_sec: Optional[int]
    cover_url: Optional[str]
    audio_url: Optional[str]
    tags: List[str]
    created_at: datetime

    model_config = {"from_attributes": True}
