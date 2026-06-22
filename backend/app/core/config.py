"""
config settings
"""

# from pydantic import BaseSettings
from pathlib import Path
from typing import Any
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_ENV_FILE,
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        extra="ignore",
        validate_default=False,
    )
    
    APP_NAME: str = "AI ChatKit"
    DEBUG: bool = True
    DATABASE_URL: str | None = None
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEV: bool = True
    
    DEEPSEEK_API_KEY: str | None = None
    OLLAMA_BASE_URL: str | None = None
    OLLAMA_MODEL: str | None = None

    MOONSHOT_API_KEY: str | None = None
    MOONSHOT_BASE_URL: str = "https://api.moonshot.cn/v1"

    DEFAULT_MODEL: str | None = None
    VISION_MODEL: str = "kimi-for-coding"
    
    EMBEDDING_MODEL: str | None = None
    
    CHROMA_PATH: str | None = None
    
    MUSIC_ENABLE_MCP: bool = True
    MUSIC_MCP_COMMAND: str = "uv"
    MUSIC_MCP_SERVER_PATH: str = "D:/Agent_ai-chatkit/ai-chatkit/backend/mcp_servers/music_mcp_server.py"
    MUSIC_ALLOWED_MEDIA_DOMAINS: str | None = None
    MUSIC_MCP_TIMEOUT_SECONDS: int = 15

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, value: Any) -> Any:
        if isinstance(value, str) and value.lower() in {"release", "prod", "production"}:
            return False
        return value
    
    def is_dev(self):
        return self.DEV



settings = Settings()
