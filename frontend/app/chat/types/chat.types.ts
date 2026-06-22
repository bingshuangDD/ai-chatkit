// Chat message type
export interface Message {
  id: string;
  type: "user" | "ai" | "tool";
  content: string;
  /** User-uploaded images (data URLs or object URLs). */
  images?: string[];
  /** Backend-returned images for user messages with vision support. */
  generatedImages?: string[];
  /** IndexedDB asset IDs for user-uploaded images. */
  imageAssetIds?: string[];
  /** IndexedDB asset IDs for generated images (Jimeng). */
  generatedAssetIds?: string[];
  toolCall?: { calls: any[] };
}

// Chat component props
export interface ChatComponentProps {
  threadId: string;
}
