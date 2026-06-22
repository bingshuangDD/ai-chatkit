from functools import cache
from typing import TypeAlias


from chromadb.auth import T
from langchain_community.chat_models import FakeListChatModel, tongyi
from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI
from langchain_deepseek import ChatDeepSeek
from langchain_community.chat_models import ChatTongyi




from core.config import settings
from ai.models import (
    AllModelEnum,
    DeepseekModelName,
    FakeModelName,
    KimiModelName,
    OllamaModelName,
    OpenAIModelName,
    TongYiModelName,

)

_MODEL_TABLE = {
    OpenAIModelName.GPT_4O_MINI: "gpt-4o-mini",
    OpenAIModelName.GPT_4O: "gpt-4o",
    DeepseekModelName.DEEPSEEK_CHAT: "deepseek-chat",
    DeepseekModelName.DEEPSEEK_V4_FLASH: "deepseek-chat",
    OllamaModelName.OLLAMA_GENERIC: "ollama",
    FakeModelName.FAKE: "fake",
    TongYiModelName.QWEN_PLUS: "qwen-plus",
    KimiModelName.KIMI_FOR_CODING: "kimi-for-coding",
    KimiModelName.KIMI_K2: "kimi-k2-instruct",
    KimiModelName.KIMI_K2_6: "kimi-k2.6",
    KimiModelName.KIMI_K2_7_CODE: "kimi-k2.7-code",
    KimiModelName.KIMI_K2_7_CODE_HIGHSPEED: "kimi-k2.7-code-highspeed",
    KimiModelName.MOONSHOT_V1_8K: "moonshot-v1-8k",
    KimiModelName.MOONSHOT_V1_32K: "moonshot-v1-32k",
    KimiModelName.MOONSHOT_V1_128K: "moonshot-v1-128k",
}


class FakeToolModel(FakeListChatModel):
    def __init__(self, responses: list[str]):
        super().__init__(responses=responses)

    def bind_tools(self, tools):
        return self

ModelT: TypeAlias = (
    ChatOpenAI | ChatOllama | ChatDeepSeek | FakeToolModel | ChatTongyi
)



@cache
def get_model(model_name: AllModelEnum, /) -> ModelT: # pyright: ignore[reportReturnType]
    """
    Get model by model name.
    Args:
        model_name: Model name.
    Returns:
        Model instance.
    """


    api_model_name = _MODEL_TABLE.get(model_name)
    if not api_model_name:
        raise ValueError(f"Unsupported model: {model_name}")

    if model_name in OpenAIModelName:
        return ChatOpenAI(model=api_model_name, temperature=0.5, streaming=True)


    if model_name in DeepseekModelName:

        return ChatDeepSeek(
            model=api_model_name,
            temperature=0.5,
            streaming=True,
            api_key=settings.DEEPSEEK_API_KEY, # type: ignore
        )

    if model_name in OllamaModelName:
        if settings.OLLAMA_BASE_URL:
            chat_ollama = ChatOllama(
                model=settings.OLLAMA_MODEL, temperature=0.5, base_url=settings.OLLAMA_BASE_URL # type: ignore
            )
        else:
            chat_ollama = ChatOllama(model=settings.OLLAMA_MODEL, temperature=0.5) # type: ignore
        return chat_ollama
    if model_name in FakeModelName:
        return FakeToolModel(responses=["This is a test response from the fake model."])

    if model_name in TongYiModelName:
        return ChatTongyi(model=api_model_name, temperature=0.5, streaming=True) # type: ignore

    if model_name in KimiModelName:
        moonshot_api_key = settings.MOONSHOT_API_KEY.strip() if settings.MOONSHOT_API_KEY else None
        moonshot_base_url = settings.MOONSHOT_BASE_URL.strip() if settings.MOONSHOT_BASE_URL else None
        if not moonshot_api_key:
            raise ValueError("MOONSHOT_API_KEY is required when using Kimi/Moonshot models.")

        # kimi-k2.7-code 系列固定 temperature/top_p 等参数，不可由客户端传入
        k27_fixed_params_models = {
            KimiModelName.KIMI_FOR_CODING,
            KimiModelName.KIMI_K2_7_CODE,
            KimiModelName.KIMI_K2_7_CODE_HIGHSPEED,
        }
        kwargs: dict[str, object] = {
            "model": api_model_name,
            "streaming": True,
            "api_key": moonshot_api_key,
            "base_url": moonshot_base_url,
        }
        if model_name not in k27_fixed_params_models:
            kwargs["temperature"] = 0.5
        return ChatOpenAI(**kwargs) # type: ignore
