/** Shared types for the image generation workflow (frontend ↔ backend). */

export interface GenerateImageRequest {
  thread_id: string;
  user_prompt: string;
  reference_images: string[];
  mode: "text_to_image" | "image_to_image" | "multi_image_fusion";
  size: "2K" | string;
  output_format: "png" | "jpeg";
  watermark: boolean;
  sequential_image_generation?: "disabled" | "auto";
  use_kimi_prompt: boolean;
}

export interface GenerateImageResponse {
  prompt: string;
  raw_user_prompt: string;
  model: string;
  provider: "jimeng";
  images: Array<{ url: string; size?: string }>;
  usage: Record<string, any>;
  metadata: Record<string, any>;
}

/** Build a default request body from minimal inputs. */
export function buildGenerateImageRequest(
  threadId: string,
  userPrompt: string,
  referenceImages: string[],
  opts?: Partial<Pick<GenerateImageRequest, "mode" | "size" | "use_kimi_prompt">>,
): GenerateImageRequest {
  const mode = inferMode(opts?.mode ?? "text_to_image", referenceImages.length);
  return {
    thread_id: threadId,
    user_prompt: userPrompt,
    reference_images: referenceImages,
    mode,
    size: opts?.size ?? "2K",
    output_format: "png",
    watermark: false,
    sequential_image_generation: mode === "multi_image_fusion" ? "disabled" : undefined,
    use_kimi_prompt: opts?.use_kimi_prompt ?? true,
  };
}

export function inferMode(
  explicit: GenerateImageRequest["mode"],
  refCount: number,
): GenerateImageRequest["mode"] {
  if (refCount === 0) return "text_to_image";
  if (refCount === 1) return "image_to_image";
  return "multi_image_fusion";
}
