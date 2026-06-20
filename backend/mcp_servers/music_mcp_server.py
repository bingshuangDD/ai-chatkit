"""Music MCP Server — 网易云音乐真实对接.

通过 MCP stdio 协议暴露两个工具，供 ai-chatkit 后端的 MusicMCPClient 调用：

    music_search(query, limit)      → 搜索网易云音乐歌曲
    music_get_play_url(id, provider) → 获取歌曲可播放直链

工具名称与返回结构保持与 app/music/mcp_client.py 的契约一致。
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from mcp.server.fastmcp import FastMCP

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("music-mcp")

mcp = FastMCP("music-player")

# ============================================================
# 网易云音乐 API 封装
# ============================================================

NETEASE_API_SEARCH = "https://music.163.com/api/search/get/web"
NETEASE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Referer": "https://music.163.com/",
    "Content-Type": "application/x-www-form-urlencoded",
}

# 外链域名（网易云 CDN 实际使用）
NETEASE_CDN_DOMAINS = {"music.126.net", "music.163.com", "126.net"}


def _is_netease_cdn_host(hostname: str) -> bool:
    """判断 hostname 是否属于网易云 CDN。"""
    lowered = hostname.lower()
    return any(
        lowered == domain or lowered.endswith("." + domain)
        for domain in NETEASE_CDN_DOMAINS
    )


async def _search_netease(keyword: str, limit: int = 5) -> list[dict[str, Any]]:
    """搜索网易云音乐歌曲，返回结构化结果列表。"""
    async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
        resp = await client.post(
            NETEASE_API_SEARCH,
            data={
                "csrf_token": "",
                "hlposttag": "</span>",
                "hlpretag": "<span class=\"s-fc7\">",
                "limit": str(limit),
                "offset": "0",
                "s": keyword,
                "total": "true",
                "type": "1",
            },
            headers=NETEASE_HEADERS,
        )
        resp.raise_for_status()
        data = resp.json()

    songs = data.get("result", {}).get("songs") or []
    results: list[dict[str, Any]] = []
    for song in songs:
        song_id = song.get("id")
        if song_id is None:
            continue
        artists = [a.get("name", "") for a in song.get("artists", [])]
        results.append({
            "id": str(song_id),
            "title": song.get("name", ""),
            "artist": " / ".join(artists) if artists else "未知歌手",
            "album": song.get("album", {}).get("name", ""),
            "duration_ms": song.get("duration", 0),
            "provider": "netease",
            "playable": True,
        })
    return results


async def _get_netease_play_url(song_id: str) -> str | None:
    """通过网易云外链接口获取歌曲播放直链。

    外链接口会将请求重定向到 CDN 的真实 mp3 地址。
    返回 HTTPS 版本的直链，失败返回 None。
    """
    outer_url = f"http://music.163.com/song/media/outer/url?id={song_id}.mp3"

    async with httpx.AsyncClient(
        follow_redirects=True, timeout=httpx.Timeout(10.0)
    ) as client:
        try:
            resp = await client.head(outer_url, headers=NETEASE_HEADERS)
        except httpx.RequestError:
            return None

    if resp.status_code != 200:
        return None

    final_url = str(resp.url)

    # 网易云外链重定向后可能落在 music.126.net 或其他 CDN 域名
    if not _is_netease_cdn_host(resp.url.host or ""):
        logger.warning("Unexpected redirect host: %s", resp.url.host)
        # 仍然返回，由安全模块做最终校验

    # 强制使用 HTTPS（安全模块要求）
    if final_url.startswith("http://"):
        final_url = final_url.replace("http://", "https://", 1)

    return final_url


# ============================================================
# MCP Tools（与 mcp_client.py 契约一致）
# ============================================================

@mcp.tool()
async def music_search(query: str, limit: int = 5) -> dict[str, Any]:
    """搜索网易云音乐歌曲。

    Args:
        query: 搜索关键词（歌曲名、歌手名等）
        limit: 返回结果数量上限，默认 5
    """
    if not query.strip():
        return {"items": []}

    try:
        items = await _search_netease(query.strip(), limit)
        return {"items": items}
    except Exception as exc:
        logger.error("music_search failed for query=%r: %s", query, exc)
        return {"items": []}


@mcp.tool()
async def music_get_play_url(id: str, provider: str = "netease") -> dict[str, Any]:
    """获取指定歌曲的可播放音频直链。

    Args:
        id: 歌曲 ID（来自 music_search 结果中的 id 字段）
        provider: 音乐来源标识，默认 "netease"
    """
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

    base_error = {
        "id": id,
        "title": "",
        "artist": "",
        "source_url": "",
        "media_type": "audio",
        "mime_type": "audio/mpeg",
        "cover_url": None,
        "provider": provider,
        "expires_at": expires_at.isoformat(),
        "playable": False,
    }

    try:
        play_url = await _get_netease_play_url(id)
    except Exception as exc:
        logger.error("get_play_url failed for id=%s: %s", id, exc)
        return base_error

    if not play_url:
        return base_error

    return {
        **base_error,
        "title": f"网易云音乐-{id}",
        "artist": "网易云音乐",
        "source_url": play_url,
        "playable": True,
    }


# ============================================================
# 启动入口
# ============================================================

if __name__ == "__main__":
    mcp.run(transport="stdio")
