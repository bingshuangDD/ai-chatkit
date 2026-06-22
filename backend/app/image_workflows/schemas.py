"""Request / response models for the image generation workflow."""

from typing import Any, Literal

from pydantic import BaseModel, Field


class GenerateImageRequest(BaseModel):
    thread_id: str = Field(description="Chat thread ID for traceability")
    user_prompt: str = Field(description="User's natural-language image request")
    reference_images: list[str] = Field(
        default_factory=list,
        description="Public URLs or data URLs of reference images",
    )
    mode: Literal["text_to_image", "image_to_image", "multi_image_fusion"] = Field(
        default="text_to_image",
    )
    size: str = Field(default="2K", description="Output image size")
    output_format: Literal["png", "jpeg"] = Field(default="png")
    watermark: bool = Field(default=False)
    sequential_image_generation: Literal["disabled", "auto"] | None = Field(default=None)
    use_kimi_prompt: bool = Field(
        default=True,
        description="Whether to optimize the prompt via Kimi before generation",
    )


class GeneratedImageItem(BaseModel):
    url: str
    size: str | None = None


class GenerateImageResponse(BaseModel):
    prompt: str = Field(description="Final prompt used for generation")
    raw_user_prompt: str
    model: str
    provider: Literal["jimeng"] = "jimeng"
    images: list[GeneratedImageItem]
    usage: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


class KimiPromptResult(BaseModel):
    prompt: str
    reference_instruction: str | None = None
    negative_prompt: str | None = None
    style: str | None = None
    notes: str | None = None
