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
    position: int
    ref: str
    added_at: Optional[datetime] = None
    item: Optional[dict] = None

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
    ref: str = Field(min_length=3, max_length=220)
    type: str = Field(default="track", pattern="^(track|album|artist)$")


class PlaylistReorderIn(BaseModel):
    ordered_item_ids: List[uuid.UUID]

