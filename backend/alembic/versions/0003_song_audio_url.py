"""add song audio_url

Revision ID: 0003_song_audio_url
Revises: 0002_song_cover_url
Create Date: 2026-07-04

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0003_song_audio_url"
down_revision = "0002_song_cover_url"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("songs", sa.Column("audio_url", sa.String(length=900), nullable=True))


def downgrade() -> None:
    op.drop_column("songs", "audio_url")

