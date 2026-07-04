"""add song cover_url

Revision ID: 0002_song_cover_url
Revises: 0001_init
Create Date: 2026-07-04

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0002_song_cover_url"
down_revision = "0001_init"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("songs", sa.Column("cover_url", sa.String(length=600), nullable=True))


def downgrade() -> None:
    op.drop_column("songs", "cover_url")

