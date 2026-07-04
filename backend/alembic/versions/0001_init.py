"""init tables

Revision ID: 0001_init
Revises: 
Create Date: 2026-07-04

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email", sa.String(length=320), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False, server_default="owner"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "songs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("artist", sa.String(length=200), nullable=False),
        sa.Column("album", sa.String(length=200), nullable=True),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("genre", sa.String(length=80), nullable=True),
        sa.Column("bpm", sa.Integer(), nullable=True),
        sa.Column("key", sa.String(length=20), nullable=True),
        sa.Column("duration_sec", sa.Integer(), nullable=True),
        sa.Column("tags", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Index("ix_songs_owner_id", "owner_id"),
        sa.Index("ix_songs_artist", "artist"),
        sa.Index("ix_songs_genre", "genre"),
    )

    op.create_table(
        "playlists",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("share_slug", sa.String(length=64), nullable=True, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Index("ix_playlists_owner_id", "owner_id"),
    )

    op.create_table(
        "playlist_items",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("playlist_id", sa.Uuid(), sa.ForeignKey("playlists.id", ondelete="CASCADE"), nullable=False),
        sa.Column("song_id", sa.Uuid(), sa.ForeignKey("songs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.UniqueConstraint("playlist_id", "song_id", name="uq_playlist_song"),
        sa.Index("ix_playlist_items_playlist_id", "playlist_id"),
        sa.Index("ix_playlist_items_position", "position"),
    )


def downgrade() -> None:
    op.drop_table("playlist_items")
    op.drop_table("playlists")
    op.drop_table("songs")
    op.drop_table("users")

