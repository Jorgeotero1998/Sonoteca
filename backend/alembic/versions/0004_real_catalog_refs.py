"""real catalog refs + user collections

Revision ID: 0004_real_catalog_refs
Revises: 0003_song_audio_url
Create Date: 2026-07-04

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0004_real_catalog_refs"
down_revision = "0003_song_audio_url"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Keep legacy internal catalog for backwards compatibility.
    op.rename_table("songs", "legacy_songs")
    op.rename_table("playlist_items", "legacy_playlist_items")
    # Renaming tables keeps old index names. Drop conflicting legacy indexes
    # so new table creation can reuse canonical names.
    op.execute("DROP INDEX IF EXISTS ix_playlist_items_position")
    op.execute("DROP INDEX IF EXISTS ix_playlist_items_playlist_id")

    # playlists: owner_id -> user_id
    op.alter_column("playlists", "owner_id", new_column_name="user_id")

    # New playlist_items using provider refs
    op.create_table(
        "playlist_items",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("playlist_id", sa.Uuid(), sa.ForeignKey("playlists.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("provider_id", sa.String(length=128), nullable=False),
        sa.Column("type", sa.String(length=16), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("added_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("playlist_id", "provider", "provider_id", "type", name="uq_playlist_item_ref"),
        sa.Index("ix_playlist_items_playlist_id", "playlist_id"),
        sa.Index("ix_playlist_items_position", "position"),
    )

    # Optional DB cache for hydrated catalog payloads
    op.create_table(
        "catalog_items",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("provider_id", sa.String(length=128), nullable=False),
        sa.Column("type", sa.String(length=16), nullable=False),
        sa.Column("payload_json", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("etag", sa.String(length=200), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("provider", "provider_id", "type", name="uq_catalog_item_ref"),
        sa.Index("ix_catalog_items_provider", "provider"),
        sa.Index("ix_catalog_items_provider_id", "provider_id"),
        sa.Index("ix_catalog_items_type", "type"),
    )

    op.create_table(
        "user_favorites",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("provider_id", sa.String(length=128), nullable=False),
        sa.Column("type", sa.String(length=16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "provider", "provider_id", "type", name="uq_user_fav_ref"),
        sa.Index("ix_user_favorites_user_id", "user_id"),
    )

    op.create_table(
        "user_library",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("provider_id", sa.String(length=128), nullable=False),
        sa.Column("type", sa.String(length=16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "provider", "provider_id", "type", name="uq_user_lib_ref"),
        sa.Index("ix_user_library_user_id", "user_id"),
    )

    op.create_table(
        "user_history",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("provider_id", sa.String(length=128), nullable=False),
        sa.Column("type", sa.String(length=16), nullable=False),
        sa.Column("played_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("context", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Index("ix_user_history_user_id", "user_id"),
        sa.Index("ix_user_history_played_at", "played_at"),
    )


def downgrade() -> None:
    op.drop_table("user_history")
    op.drop_table("user_library")
    op.drop_table("user_favorites")
    op.drop_table("catalog_items")
    op.drop_table("playlist_items")

    op.alter_column("playlists", "user_id", new_column_name="owner_id")
    op.rename_table("legacy_playlist_items", "playlist_items")
    op.rename_table("legacy_songs", "songs")

