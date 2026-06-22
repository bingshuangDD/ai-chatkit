"""Use Kimi (Moonshot) to generate optimized Jimeng prompts from natural language."""

import json
import logging
from typing import Literal

from core.config import settings
from image_workflows.schemas import KimiPromptResult

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "你是图像生成提示词工程师。"
    "请根据用户要求和参考图，输出适合 seedream-5.0-lite 的中文生图提示词。"
    "不要输出解释，只输出 JSON。"
    'JSON 格式：{"prompt": "...", "reference_instruction": "...", '
    '"negative_prompt": "...", "style": "...", "notes": "..."}'
)


async def build_prompt_with_kimi(
    user_prompt: str,
    reference_images: list[str],
    mode: Literal["text_to_image", "image_to_image", "multi_image_fusion"],
) -> KimiPromptResult:
    """Generate an optimized Jimeng prompt via Kimi.

    Falls back to the raw *user_prompt* on any failure.
    """
    if not settings.MOONSHOT_API_KEY:
        logger.warning("MOONSHOT_API_KEY not set — using raw user prompt")
        return KimiPromptResult(prompt=user_prompt, notes="Kimi not configured")

    user_text = f"用户需求：{user_prompt}\n生成模式：{mode}"
    if reference_images:
        user_text += f"\n参考图数量：{len(reference_images)}"

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_text},
    ]

    try:
        import httpx

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.MOONSHOT_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.MOONSHOT_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.VISION_MODEL,
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 1024,
                },
            )
            response.raise_for_status()
            body = response.json()

        raw_content = body["choices"][0]["message"]["content"].strip()
        return _parse_kimi_response(raw_content, user_prompt)

    except Exception as exc:
        logger.warning("Kimi prompt build failed, falling back to raw prompt: %s", exc)
        return KimiPromptResult(
            prompt=user_prompt,
            notes=f"Kimi failed ({exc}); using raw user prompt",
        )


def _parse_kimi_response(raw: str, fallback_prompt: str) -> KimiPromptResult:
    """Best-effort JSON parse of the Kimi response."""
    # Strip markdown code fences if present
    cleaned = raw
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1] if "\n" in cleaned else cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("Kimi returned invalid JSON, using raw content as prompt")
        return KimiPromptResult(
            prompt=fallback_prompt,
            notes=f"Kimi JSON parse failed, raw: {raw[:200]}",
        )

    return KimiPromptResult(
        prompt=data.get("prompt", fallback_prompt),
        reference_instruction=data.get("reference_instruction"),
        negative_prompt=data.get("negative_prompt"),
        style=data.get("style"),
        notes=data.get("notes"),
    )
