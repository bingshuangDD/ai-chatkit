from music.mcp_client import MusicMCPUnavailable, music_mcp_client
from music.schemas import MusicSearchResult, PlayableMedia, PlayerCommand
from music.security import MusicSecurityError, validate_media


class MusicServiceError(RuntimeError):
    """Raised for user-displayable music service failures."""


async def search_music(query: str) -> list[MusicSearchResult]:
    try:
        return await music_mcp_client.search(query=query, limit=5)
    except MusicMCPUnavailable as exc:
        raise MusicServiceError("音乐服务暂不可用") from exc


async def resolve_playable_media(song_id: str, provider: str = "mock") -> PlayableMedia:
    try:
        media = await music_mcp_client.get_play_url(song_id=song_id, provider=provider)
    except MusicMCPUnavailable as exc:
        raise MusicServiceError("音乐服务暂不可用") from exc
    if not media.playable:
        raise MusicServiceError("未找到可播放版本")
    try:
        return validate_media(media)
    except MusicSecurityError as exc:
        raise MusicServiceError("音乐资源未通过安全校验") from exc


async def create_play_command(query: str) -> PlayerCommand:
    results = await search_music(query)
    if not results:
        raise MusicServiceError("未找到相关歌曲")
    playable = next((item for item in results if item.playable), None)
    if not playable:
        raise MusicServiceError("未找到可播放版本")
    media = await resolve_playable_media(playable.id, playable.provider)
    if media.title == "Mock Song":
        media.title = playable.title
        media.artist = playable.artist
    return PlayerCommand(
        action="play",
        media=media,
        message=f"正在播放：{media.title} - {media.artist}",
    )


def create_pause_command() -> PlayerCommand:
    return PlayerCommand(action="pause", message="已暂停播放")


def create_resume_command() -> PlayerCommand:
    return PlayerCommand(action="resume", message="继续播放")


def create_stop_command() -> PlayerCommand:
    return PlayerCommand(action="stop", message="已停止播放")

