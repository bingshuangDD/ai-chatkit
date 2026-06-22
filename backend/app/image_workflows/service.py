"""Orchestrate the full image generation workflow.

Pipeline:

    user_prompt + reference_images
      → stage to public URLs
      → (optional) Kimi prompt optimization
      → Jimeng generation
      → normalized response
"""

import logging
from typing import Literal

from core.config import settings
from image_workflows.image_staging import stage_reference_images
from image_workflows.jimeng_client import generate_image
from image_workflows.kimi_prompt_builder import build_prompt_with_kimi
from image_workflows.schemas import (
    GenerateImageRequest,
    GenerateImageResponse,
    GeneratedImageItem,
)

logger = logging.getLogger(__name__)

MAX_REFERENCE_IMAGES = 4
MAX_PROMPT_LENGTH = 4000


def infer_mode(
    explicit: Literal["text_to_image", "image_to_image", "multi_image_fusion"],
    staged_count: int,
) -> Literal["text_to_image", "image_to_image", "multi_image_fusion"]:
    """Fallback mode inference based on the number of staged reference images."""
    if staged_count == 0:
        return "text_to_image"
    if staged_count == 1:
        return "image_to_image"
    return "multi_image_fusion"


async def generate_image_workflow(
    request: GenerateImageRequest,
) -> GenerateImageResponse:
    # --- Validation -----------------------------------------------------------
    if len(request.reference_images) > MAX_REFERENCE_IMAGES:
        raise WorkflowValidationError(
            f"Too many reference images ({len(request.reference_images)}); max is {MAX_REFERENCE_IMAGES}"
        )

    if len(request.user_prompt) > MAX_PROMPT_LENGTH:
        raise WorkflowValidationError(
            f"Prompt too long ({len(request.user_prompt)} chars); max is {MAX_PROMPT_LENGTH}"
        )

    mode: Literal["text_to_image", "image_to_image", "multi_image_fusion"] = (
        request.mode
    )

    # --- Stage reference images to public URLs --------------------------------
    staged_images = await stage_reference_images(request.reference_images)

    # Override mode if not enough images after staging
    if mode == "multi_image_fusion" and len(staged_images) < 2:
        raise WorkflowValidationError(
            "multi_image_fusion requires at least 2 valid reference images"
        )
    mode = infer_mode(mode, len(staged_images))

    # --- Optional Kimi prompt optimization ------------------------------------
    prompt = request.user_prompt
    metadata: dict = {}

    if request.use_kimi_prompt:
        kimi_result = await build_prompt_with_kimi(
            user_prompt=request.user_prompt,
            reference_images=staged_images,
            mode=mode,
        )
        prompt = kimi_result.prompt
        metadata["kimi"] = kimi_result.model_dump()

    # --- Build Jimeng parameters ----------------------------------------------
    image_param: str | list[str] | None = None
    sequential: str | None = None

    if mode == "image_to_image" and staged_images:
        image_param = staged_images[0]
    elif mode == "multi_image_fusion" and len(staged_images) >= 2:
        image_param = staged_images
        sequential = request.sequential_image_generation or "disabled"

    # --- Call Jimeng ----------------------------------------------------------
    result = await generate_image(
        prompt=prompt,
        image=image_param,
        size=request.size,
        output_format=request.output_format,
        watermark=request.watermark,
        sequential_image_generation=sequential,
    )

    # --- Normalize response ---------------------------------------------------
    images = [
        GeneratedImageItem(url=item["url"], size=item.get("size"))
        for item in result.get("data", [])
    ]

    return GenerateImageResponse(
        prompt=prompt,
        raw_user_prompt=request.user_prompt,
        model=result.get("model", settings.JIMENG_MODEL),
        provider="jimeng",
        images=images,
        usage=result.get("usage", {}),
        metadata=metadata,
    )


class WorkflowValidationError(ValueError):
    """Raised when request parameters are invalid (maps to HTTP 422)."""
