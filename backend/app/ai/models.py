from enum import StrEnum
from typing import TypeAlias

DEFAULT_MODEL = "deepseek-chat"


class OpenAIModelName(StrEnum):
    """https://platform.openai.com/docs/models/gpt-4o"""

    GPT_4O_MINI = "gpt-4o-mini"
    GPT_4O = "gpt-4o"

class DeepseekModelName(StrEnum):
    """https://api-docs.deepseek.com/quick_start/pricing"""
    DEEPSEEK_CHAT = "deepseek-chat"
    DEEPSEEK_V4_FLASH = "deepseek-v4-flash"

class OllamaModelName(StrEnum):
    """https://ollama.com/search"""

    OLLAMA_GENERIC = "ollama"

class FakeModelName(StrEnum):
    """Fake model for testing."""
    FAKE = "fake"

class TongYiModelName(StrEnum):
    """TongYi model"""
    QWEN_PLUS = "qwen-plus"
    QWEN_MAX = "qwen-max"


class KimiModelName(StrEnum):
    """https://platform.moonshot.cn/docs/pricing"""

    KIMI_FOR_CODING = "kimi-for-coding"
    KIMI_K2 = "kimi-k2-instruct"
    KIMI_K2_6 = "kimi-k2.6"
    KIMI_K2_7_CODE = "kimi-k2.7-code"
    KIMI_K2_7_CODE_HIGHSPEED = "kimi-k2.7-code-highspeed"
    MOONSHOT_V1_8K = "moonshot-v1-8k"
    MOONSHOT_V1_32K = "moonshot-v1-32k"
    MOONSHOT_V1_128K = "moonshot-v1-128k"


AllModelEnum: TypeAlias = (
    OpenAIModelName
    | DeepseekModelName
    | OllamaModelName
    | FakeModelName
    | TongYiModelName
    | KimiModelName
)
