from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Uuid, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Song(Base):
    # Legacy table kept for backwards compatibility with `/songs` endpoints.
    __tablename__ = "legacy_songs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    title: Mapped[str] = mapped_column(String(200))
    artist: Mapped[str] = mapped_column(String(200), index=True)
    album: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    genre: Mapped[Optional[str]] = mapped_column(String(80), index=True, nullable=True)
    bpm: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    key: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    duration_sec: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    cover_url: Mapped[Optional[str]] = mapped_column(String(600), nullable=True)
    audio_url: Mapped[Optional[str]] = mapped_column(String(900), nullable=True)

    tags: Mapped[List[str]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
