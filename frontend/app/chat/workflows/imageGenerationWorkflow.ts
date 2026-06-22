/**
 * Image generation workflow — calls POST /image-workflows/generate.
 *
 * This module is the frontend counterpart of the backend image_workflows
 * service. See the design doc §5–§6 for details.
 */

import type { GenerateImageRequest, GenerateImageResponse } from "./imageGenerationTypes";

const API_BASE = () => process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export class ImageGenerationError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(message);
    this.name = "ImageGenerationError";
  }
}

/**
 * Call the backend image generation workflow.
 *
 * Returns the full response on success; throws {@link ImageGenerationError}
 * on any HTTP or network failure.
 */
export async function requestImageGeneration(
  request: GenerateImageRequest,
): Promise<GenerateImageResponse> {
  const url = `${API_BASE()}/image-workflows/generate`;

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch (err) {
    throw new ImageGenerationError(
      "Network error — could not reach the image generation service",
      0,
      String(err),
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "Unknown error");
    throw new ImageGenerationError(
      `Image generation failed (${response.status})`,
      response.status,
      detail,
    );
  }

  return (await response.json()) as GenerateImageResponse;
}
