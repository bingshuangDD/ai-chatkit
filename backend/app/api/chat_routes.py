import logging
from core.config import settings
from fastapi import APIRouter, status
from fastapi.exceptions import HTTPException
from fastapi.responses import StreamingResponse
from openai import AuthenticationError

from uuid import UUID, uuid4
from langchain_core.messages import AIMessage, AIMessageChunk, AnyMessage, HumanMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langgraph.types import Command, Interrupt
from api.schema.chatSchema import UserInput, ChatMessage, StreamInput
from asyncio import CancelledError
from ai.agent.agents import get_agent, DEFAULT_AGENT, CompiledStateGraph
from typing import Any, Union, Dict, List, Optional
from utils.chat_utils import langchain_to_chat_message, remove_tool_calls, convert_message_content_to_string
from collections.abc import AsyncGenerator
import json
import ast
import base64

logger = logging.getLogger(__name__)

MOONSHOT_AUTH_ERROR_MESSAGE = (
    "Kimi/Moonshot authentication failed. Please check MOONSHOT_API_KEY in backend/.env, "
    "make sure the key is valid for https://api.moonshot.cn/v1, then restart the backend server."
)


def _guess_image_mime(raw_base64: str) -> str:
    try:
        header = base64.b64decode(raw_base64[:32], validate=False)[:12]
    except Exception:
        return "image/jpeg"
    if header.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if header.startswith(b"GIF87a") or header.startswith(b"GIF89a"):
        return "image/gif"
    if header.startswith(b"RIFF") and header[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"


def _normalize_image_url(image: str) -> str:
    image = image.strip()
    if image.startswith("data:image/"):
        return image
    return f"data:{_guess_image_mime(image)};base64,{image}"


def _build_human_message_content(message: str, images: list[str]) -> list[dict[str, Any]]:
    content_blocks: list[dict[str, Any]] = []
    if message:
        content_blocks.append({"type": "text", "text": message})
    else:
        content_blocks.append({"type": "text", "text": "请分析这些图片。"})

    for image in images:
        content_blocks.append(
            {
                "type": "image_url",
                "image_url": {
                    "url": _normalize_image_url(image),
                    "detail": "auto",
                },
            }
        )
    return content_blocks


def _content_has_image(content: Any) -> bool:
    if not isinstance(content, list):
        return False
    for content_item in content:
        if isinstance(content_item, dict) and content_item.get("type") == "image_url":
            return True
    return False


def _state_has_images(state: Any) -> bool:
    messages = getattr(state, "values", {}).get("messages", [])
    return any(_content_has_image(getattr(message, "content", None)) for message in messages)


def _parse_tool_payload(content: Any) -> dict[str, Any] | None:
    if isinstance(content, dict):
        return content
    if not isinstance(content, str):
        return None
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        try:
            parsed = ast.literal_eval(content)
        except (ValueError, SyntaxError):
            return None
    return parsed if isinstance(parsed, dict) else None


def _extract_player_command(message: Any) -> dict[str, Any] | None:
    if not isinstance(message, ToolMessage):
        return None
    payload = _parse_tool_payload(message.content)
    if not payload:
        return None
    if payload.get("kind") == "player_command" and isinstance(payload.get("command"), dict):
        return payload["command"]
    return None


chat_router = APIRouter(prefix="/chat", tags=["chat"],)

@chat_router.post("/invoke")
async def invoke(user_input: UserInput) -> ChatMessage:
    """
    Use user input to invoke a proxy to get the final response.

    If no agent_id is provided, the default proxy will be used.
    Use thread_id to persist and continue multi-turn dialogues. The run_id keyword argument will also be attached to the message for recording feedback.
    """
    agent: CompiledStateGraph = get_agent(user_input.agent_id)
    
    kwargs, run_id = await _handle_input(user_input, agent)
    try:
        response_events = await agent.ainvoke(**kwargs, stream_mode=["updates", "values"])
        response_type, response = response_events[-1]
        if response_type == "values":
            # Normal response, the agent completed successfully
            output = langchain_to_chat_message(response["messages"][-1])
        elif response_type == "updates" and "__interrupt__" in response:
            # The last thing to occur was an interrupt
            # Return the value of the first interrupt as an AIMessage
            output = langchain_to_chat_message(
                AIMessage(content=response["__interrupt__"][0].value)
            )
        else:
            raise ValueError(f"Unexpected response type: {response_type}")

        output.run_id = str(run_id)
        return output
    except AuthenticationError as e:
        logger.error(f"Moonshot authentication failed: {e}")
        raise HTTPException(status_code=401, detail=MOONSHOT_AUTH_ERROR_MESSAGE)
    except Exception as e:
        logger.error(f"An exception occurred: {e}")
        raise HTTPException(status_code=500, detail="Unexpected error")
    
    
def _sse_response_example() -> dict[int, Any]:
    return {
        status.HTTP_200_OK: {
            "description": "Server Sent Event Response",
            "content": {
                "text/event-stream": {
                    "example": "data: {'type': 'token', 'content': 'Hello'}\n\ndata: {'type': 'token', 'content': ' World'}\n\ndata: end\n\n",
                    "schema": {"type": "string"},
                }
            },
        }
    }

@chat_router.post("/stream", response_class=StreamingResponse, responses=_sse_response_example())
async def stream(user_input: StreamInput) -> StreamingResponse:
    """
    流式传输代理的响应。

    """

    return StreamingResponse(
        message_generator(user_input),
        media_type="text/event-stream",
    )


async def _handle_input(
    user_input: UserInput, agent: CompiledStateGraph
) -> tuple[dict[str, Any], UUID]:
    """
    Parse user input and handle any required interrupt resumption.
    Returns kwargs for agent invocation and the run_id.
    """
    run_id = uuid4()
    thread_id = user_input.thread_id or str(uuid4())
    images = [image for image in (user_input.images or []) if image and image.strip()]
    has_images = len(images) > 0

    configurable = {
        "thread_id": thread_id,
        "model": settings.DEFAULT_MODEL,
    }

    # Check whether agent_config exists in user_input
    if user_input.agent_config:
        # Find the intersection of the keys in the configurable dictionary and the keys in the user_input.agent_config dictionary
        overlap = configurable.keys() & user_input.agent_config.keys()
        if overlap:
            # If there is an intersection, it means that agent_config contains reserved keys, throw an HTTP exception
            raise HTTPException(
                status_code=422,
                detail=f"agent_config contains reserved keys: {overlap}",
            )
    # If there is no intersection, update the content of user_input.agent_config to the configurable dictionary
    configurable.update(user_input.agent_config)

    # Check for interrupts that need to be resumed
    state_config = RunnableConfig(configurable=configurable, run_id=run_id)
    state = await agent.aget_state(config=state_config)
    history_has_images = _state_has_images(state)
    if has_images or history_has_images:
        configurable["model"] = settings.VISION_MODEL

    # Kimi Code Plan: pass prompt_cache_key to model via model_kwargs in RunnableConfig
    model_kwargs: dict[str, Any] = {}
    if getattr(user_input, "prompt_cache_key", None):
        model_kwargs["prompt_cache_key"] = user_input.prompt_cache_key

    config = RunnableConfig(
        configurable=configurable,
        run_id=run_id,
    )
    if model_kwargs:
        config["model_kwargs"] = model_kwargs

    interrupted_tasks = [
        task for task in state.tasks if hasattr(task, "interrupts") and task.interrupts
    ]

    if interrupted_tasks:
        # assume user input is response to resume agent execution from interrupt
        input = Command(resume=user_input.message)
    elif has_images:
        input = {"messages": [HumanMessage(content=_build_human_message_content(user_input.message, images))]}
    else:
        input = {"messages": [HumanMessage(content=user_input.message)]}

    kwargs = {
        "input": input,
        "config": config,
    }

    return kwargs, run_id

async def message_generator(
    user_input: StreamInput
) -> AsyncGenerator[str, None]:
    """
    An asynchronous generator for generating messages, used for the responses of streaming agents.
    """
    agent: CompiledStateGraph = get_agent(user_input.agent_id)
    kwargs, run_id = await _handle_input(user_input, agent)

    try:
        async for stream_event in agent.astream(
            **kwargs, stream_mode=["updates", "messages", "custom"]
        ):
            if not isinstance(stream_event, tuple):
                continue
            stream_mode, event = stream_event
            new_messages = []
            if stream_mode == "updates":
                for node, updates in event.items():
                    # A simple approach to handle agent interrupts.
                    if node == "__interrupt__":
                        interrupt: Interrupt
                        for interrupt in updates:
                            new_messages.append(AIMessage(content=interrupt.value))
                        continue
                    update_messages = updates.get("messages", [])
 
                     # Only retain the output of "supervisor"
                    if node == "supervisor":
                        if isinstance(update_messages[-1], AIMessage):
                            update_messages = [update_messages[-1]]
                        elif isinstance(update_messages[-1], ToolMessage):
                            if len(update_messages) > 1:
                                update_messages = [update_messages[-2],update_messages[-1]]
                            else:
                                update_messages = [update_messages[-1]]
                        else:
                            update_messages = []
                    if node in ("math_agent", "code_agent"):
                        update_messages = []
                    new_messages.extend(update_messages)

            if stream_mode == "custom":
                new_messages = [event]

            for message in new_messages:
                player_command = _extract_player_command(message)
                if player_command:
                    yield f"data: {json.dumps({'type': 'player_command', 'content': player_command}, ensure_ascii=False)}\n\n"
                    continue
                try:
                    chat_message = langchain_to_chat_message(message)
                    chat_message.run_id = str(run_id)
                except Exception as e:
                    logger.error(f"Error parsing message: {e}")
                    yield f"data: {json.dumps({'type': 'error', 'content': 'Unexpected error'})}\n\n"
                    continue
                if chat_message.type == "human" and chat_message.content == user_input.message:
                    continue
                yield f"data: {json.dumps({'type': 'message', 'content': chat_message.model_dump()})}\n\n"

            if stream_mode == "messages":
                if not user_input.stream_tokens:
                    continue
                msg, metadata = event
                if "skip_stream" in metadata.get("tags", []):
                    continue

                if not isinstance(msg, AIMessageChunk):
                    continue
                content = remove_tool_calls(msg.content)
                if content:
                    yield f"data: {json.dumps({'type': 'token', 'content': convert_message_content_to_string(content)})}\n\n"
    except GeneratorExit:
        # Handle GeneratorExit gracefully
        logger.info("Stream closed by client")
        return
    except CancelledError:
        # Handle CancelledError gracefully
        logger.info("Stream cancelled")
        return
    except AuthenticationError as e:
        logger.error(f"Moonshot authentication failed in message generator: {e}")
        yield f"data: {json.dumps({'type': 'error', 'content': MOONSHOT_AUTH_ERROR_MESSAGE})}\n\n"
    except Exception as e:
        logger.error(f"Error in message generator: {e}")
        yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
    finally:
        yield f"data: {json.dumps({'type': 'end'})}\n\n"


