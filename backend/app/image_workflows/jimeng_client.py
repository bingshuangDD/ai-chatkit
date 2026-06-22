"""Thin wrapper around the Volcengine Ark Jimeng (DreamSeed) image generation API."""

import logging
from typing import Any, Literal

import httpx

from core.config import settings

logger = logging.getLogger(__name__)

JIMENG_API_TIMEOUT = 120.0


async def generate_image(
    prompt: str,
    image: str | list[str] | None = None,
    size: str = "2K",
    output_format: Literal["png", "jpeg"] = "png",
    watermark: bool = False,
    sequential_image_generation: str | None = None,
) -> dict[str, Any]:
    """Call the Jimeng (DreamSeed) generation endpoint.

    Args:
        prompt: Image generation prompt.
        image: Single URL (image_to_image) or list of URLs (multi_image_fusion).
        size: Output size, e.g. "2K".
        output_format: "png" or "jpeg".
        watermark: Whether to watermark the output.
        sequential_image_generation: "disabled" or "auto" for multi-image mode.

    Returns:
        The full JSON response dict from the Jimeng API.
    """
    if not settings.ARK_API_KEY:
        raise JimengAuthError("ARK_API_KEY is not configured")

    payload: dict[str, Any] = {
        "model": settings.JIMENG_MODEL,
        "prompt": prompt,
        "size": size,
        "output_format": output_format,
        "watermark": watermark,
    }

    if image:
        payload["image"] = image

    if isinstance(image, list) and sequential_image_generation:
        payload["sequential_image_generation"] = sequential_image_generation

    url = f"{settings.JIMENG_BASE_URL}/images/generations"

    async with httpx.AsyncClient(timeout=JIMENG_API_TIMEOUT) as client:
        try:
            response = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {settings.ARK_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
        except httpx.TimeoutException:
            raise JimengTimeoutError("Jimeng API request timed out")

    if response.status_code == 401:
        raise JimengAuthError("Invalid ARK_API_KEY — authentication failed")
    if response.status_code >= 500:
        raise JimengServiceError(
            f"Jimeng service returned {response.status_code}: {response.text[:500]}"
        )

    try:
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise JimengServiceError(
            f"Jimeng API error {exc.response.status_code}: {exc.response.text[:500]}"
        ) from exc

    return response.json()


class JimengError(RuntimeError):
    """Base exception for Jimeng-related failures."""


class JimengAuthError(JimengError):
    """ARK_API_KEY is missing or invalid."""


class JimengServiceError(JimengError):
    """The upstream Jimeng API returned an error."""


class JimengTimeoutError(JimengError):
    """The Jimeng API request timed out."""
