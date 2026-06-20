import logging
import json
from datetime import datetime, timedelta, timezone
from typing import Any

from core.config import settings
from music.schemas import MusicSearchResult, PlayableMedia

logger = logging.getLogger(__name__)


class MusicMCPError(RuntimeError):
    """Base exception for Music MCP failures."""


class MusicMCPUnavailable(MusicMCPError):
    """Raised when the Music MCP server cannot be used."""


class MusicMCPClient:
    """Music MCP client boundary.

    The project may run without the optional MCP package in local development.
    In that case, a deterministic mock path is available when
    MUSIC_ENABLE_MCP=false, which keeps the rest of the feature testable.
    """

    async def search(self, query: str, limit: int = 5) -> list[MusicSearchResult]:
        if not settings.MUSIC_ENABLE_MCP:
            return self._mock_search(query, limit)
        result = await self._call_tool("music_search", {"query": query, "limit": limit})
        return [MusicSearchResult(**item) for item in result.get("items", [])]

    async def get_play_url(self, song_id: str, provider: str) -> PlayableMedia:
        if not settings.MUSIC_ENABLE_MCP:
            return self._mock_playable_media(song_id, provider)
        result = await self._call_tool(
            "music_get_play_url",
            {"id": song_id, "provider": provider},
        )
        return PlayableMedia(**result)

    async def _call_tool(self, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        try:
            from mcp import ClientSession, StdioServerParameters
            from mcp.client.stdio import stdio_client
        except ImportError as exc:
            raise MusicMCPUnavailable("音乐服务暂不可用") from exc

        server_path = settings.MUSIC_MCP_SERVER_PATH
        if not server_path:
            raise MusicMCPUnavailable("音乐服务暂不可用")

        command = settings.MUSIC_MCP_COMMAND or "python"
        args = self._build_server_args(command, server_path)
        server_params = StdioServerParameters(command=command, args=args)

        try:
            async with stdio_client(server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    result = await session.call_tool(tool_name, arguments)
        except Exception as exc:
            logger.warning("Music MCP call failed: %s", exc)
            raise MusicMCPUnavailable("音乐服务暂不可用") from exc

        return self._normalize_tool_result(result)

    def _build_server_args(self, command: str, server_path: str) -> list[str]:
        if command == "uv":
            return [
                "run",
                "--with",
                "httpx",
                "--with",
                "mcp",
                "python",
                server_path,
            ]
        return [server_path]

    def _normalize_tool_result(self, result: Any) -> dict[str, Any]:
        structured = getattr(result, "structuredContent", None)
        if isinstance(structured, dict):
            return structured
        content = getattr(result, "content", None)
        if isinstance(content, list) and content:
            text = getattr(content[0], "text", None)
            if isinstance(text, str):
                parsed = json.loads(text)
                if isinstance(parsed, dict):
                    return parsed
        if isinstance(result, dict):
            return result
        raise MusicMCPUnavailable("音乐服务暂不可用")

    def _mock_search(self, query: str, limit: int) -> list[MusicSearchResult]:
        if not query.strip() or "不存在" in query:
            return []
        return [
            MusicSearchResult(
                id="mock-song-001",
                title=query.strip(),
                artist="Mock Artist",
                album="Mock Album",
                duration_ms=180000,
                provider="mock",
                playable=True,
            )
        ][:limit]

    def _mock_playable_media(self, song_id: str, provider: str) -> PlayableMedia:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        return PlayableMedia(
            id=song_id,
            title="Mock Song",
            artist="Mock Artist",
            source_url="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
            media_type="audio",
            mime_type="audio/mpeg",
            cover_url=None,
            provider=provider,
            expires_at=expires_at.isoformat(),
            playable=True,
        )


music_mcp_client = MusicMCPClient()
