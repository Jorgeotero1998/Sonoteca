from __future__ import annotations

import secrets
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Playlist(Base):
    __tablename__ = "playlists"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    is_public: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    share_slug: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))

    @staticmethod
    def new_share_slug() -> str:
        # URL-safe, short, collision-resistant enough for a portfolio app
        return secrets.token_urlsafe(18).replace("-", "").replace("_", "")


class PlaylistItem(Base):
    __tablename__ = "playlist_items"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    playlist_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("playlists.id", ondelete="CASCADE"), index=True
    )
    provider: Mapped[str] = mapped_column(String(32))
    provider_id: Mapped[str] = mapped_column(String(128))
    type: Mapped[str] = mapped_column(String(16))  # track|album|artist (we store tracks in playlists today)
    position: Mapped[int] = mapped_column(Integer, index=True)
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))

