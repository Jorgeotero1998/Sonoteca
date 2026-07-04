from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class PlaylistCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: Optional[str] = None
    is_public: bool = False


class PlaylistUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=160)
    description: Optional[str] = None
    is_public: Optional[bool] = None


class PlaylistItemOut(BaseModel):
    id: uuid.UUID
    song_id: uuid.UUID
    position: int
    note: Optional[str] = None
    song: Optional[dict] = None

    model_config = {"from_attributes": True}


class PlaylistOut(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    is_public: bool
    share_slug: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class PlaylistDetailOut(PlaylistOut):
    items: List[PlaylistItemOut]


class PlaylistAddSongIn(BaseModel):
    song_id: uuid.UUID
    note: Optional[str] = None


class PlaylistReorderIn(BaseModel):
    ordered_item_ids: List[uuid.UUID]

