// ============================================================================
// dataUrl <-> Blob conversion utilities
// ============================================================================

/**
 * Convert a Blob to a data URL string.
 * Used when sending images to the backend (which still expects data URL format).
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to convert Blob to data URL"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert a data URL string to a Blob + extracted MIME type.
 * Used when ingesting user-uploaded images into IndexedDB.
 */
export function dataUrlToBlob(dataUrl: string): { blob: Blob; mimeType: string } {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid data URL format");
  }
  const mimeType = match[1];
  const base64 = match[2];
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  return { blob, mimeType };
}

/**
 * Derive a simple MIME type from a data URL prefix.
 */
export function getMimeTypeFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:(.+?)[;,]/,);
  return match ? match[1] : "image/png";
}
