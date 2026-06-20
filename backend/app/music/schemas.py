from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field, HttpUrl


class MusicSearchResult(BaseModel):
    id: str
    title: str
    artist: str
    album: str | None = None
    duration_ms: int | None = None
    provider: str
    playable: bool


class PlayableMedia(BaseModel):
    id: str
    title: str
    artist: str
    source_url: str
    media_type: Literal["audio"] = "audio"
    mime_type: str | None = None
    cover_url: str | None = None
    provider: str
    expires_at: str | None = None
    playable: bool


class PlayerCommand(BaseModel):
    command_id: str = Field(default_factory=lambda: str(uuid4()))
    action: Literal["play", "pause", "resume", "stop"]
    media: PlayableMedia | None = None
    message: str | None = None

