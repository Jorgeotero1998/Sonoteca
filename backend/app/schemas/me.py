from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class RefIn(BaseModel):
    ref: str = Field(min_length=3, max_length=220)
    type: str = Field(default="track", pattern="^(track|album|artist)$")
    context: dict[str, Any] = Field(default_factory=dict)


class HydratedOut(BaseModel):
    ref: str
    type: str
    created_at: Optional[datetime] = None
    played_at: Optional[datetime] = None
    context: Optional[dict[str, Any]] = None
    item: dict[str, Any]
