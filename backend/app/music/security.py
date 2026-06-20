from datetime import datetime
from ipaddress import ip_address
from urllib.parse import urlparse

from core.config import settings
from music.schemas import PlayableMedia


class MusicSecurityError(ValueError):
    """Raised when a media URL should not be sent to the browser."""


def _is_private_host(hostname: str) -> bool:
    lowered = hostname.lower()
    if lowered in {"localhost", "127.0.0.1", "0.0.0.0"}:
        return True
    try:
        parsed_ip = ip_address(lowered)
    except ValueError:
        return False
    return parsed_ip.is_private or parsed_ip.is_loopback or parsed_ip.is_link_local


def _validate_expiry(expires_at: str | None) -> None:
    if not expires_at:
        return
    expiry = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
    now = datetime.now(tz=expiry.tzinfo) if expiry.tzinfo else datetime.now()
    if expiry <= now:
        raise MusicSecurityError("音乐资源已过期")


def _hostname_matches_allowlist(hostname: str, allowed: set[str]) -> bool:
    """检查 hostname 是否精确匹配或为允许域名的子域名。"""
    for domain in allowed:
        if hostname == domain or hostname.endswith("." + domain):
            return True
    return False


def validate_media(media: PlayableMedia) -> PlayableMedia:
    parsed = urlparse(media.source_url)
    if parsed.scheme != "https":
        raise MusicSecurityError("音乐资源必须使用 HTTPS")
    if parsed.scheme in {"file", "javascript", "data"}:
        raise MusicSecurityError("音乐资源协议不安全")
    if not parsed.hostname:
        raise MusicSecurityError("音乐资源 URL 缺少域名")
    if _is_private_host(parsed.hostname):
        raise MusicSecurityError("音乐资源不能指向本机或内网地址")

    allowed_domains = {
        item.strip().lower()
        for item in (settings.MUSIC_ALLOWED_MEDIA_DOMAINS or "").split(",")
        if item.strip()
    }
    if allowed_domains and not _hostname_matches_allowlist(
        parsed.hostname.lower(), allowed_domains
    ):
        raise MusicSecurityError("音乐资源域名不在允许列表中")

    _validate_expiry(media.expires_at)
    return media

