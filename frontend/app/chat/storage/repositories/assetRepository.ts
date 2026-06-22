// ============================================================================
// Asset repository — manages image & binary assets in IndexedDB
// ============================================================================

import { v4 as uuidv4 } from "uuid";
import { getDb, promisifyRequest, rwTx, roTx } from "../db";
import type { AssetRecord } from "../schema";
import { dataUrlToBlob } from "../utils/dataUrl";

export async function saveImageAsset(input: {
  threadId: string;
  dataUrlOrBlob: string | Blob;
  kind?: "user_upload" | "generated_image";
  source?: "input" | "jimeng";
  metadata?: Record<string, any>;
}): Promise<AssetRecord> {
  const db = await getDb();

  let blob: Blob;
  let mimeType: string;

  if (typeof input.dataUrlOrBlob === "string") {
    const result = dataUrlToBlob(input.dataUrlOrBlob);
    blob = result.blob;
    mimeType = result.mimeType;
  } else {
    blob = input.dataUrlOrBlob;
    mimeType = blob.type || "image/png";
  }

  const record: AssetRecord = {
    id: uuidv4(),
    threadId: input.threadId,
    kind: input.kind ?? "user_upload",
    mimeType,
    blob,
    size: blob.size,
    createdAt: Date.now(),
    source: input.source ?? "input",
    metadata: input.metadata,
  };

  const tx = rwTx(db, ["assets"]);
  const store = tx.objectStore("assets");
  await promisifyRequest(store.add(record));

  return record;
}

export async function getAsset(assetId: string): Promise<AssetRecord | null> {
  const db = await getDb();
  const tx = roTx(db, ["assets"]);
  const store = tx.objectStore("assets");
  const record = await promisifyRequest<AssetRecord | undefined>(store.get(assetId));
  return record ?? null;
}

export async function listAssetsByThread(threadId: string): Promise<AssetRecord[]> {
  const db = await getDb();
  const tx = roTx(db, ["assets"]);
  const store = tx.objectStore("assets");
  const index = store.index("threadId");
  return promisifyRequest<AssetRecord[]>(index.getAll(threadId));
}

export async function deleteAssetsByThread(threadId: string): Promise<void> {
  const db = await getDb();
  const assets = await listAssetsByThread(threadId);

  if (assets.length === 0) return;

  const tx = rwTx(db, ["assets"]);
  const store = tx.objectStore("assets");
  for (const asset of assets) {
    store.delete(asset.id);
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Save a generated image (from Jimeng) to IndexedDB.
 *
 * Downloads the remote image as a Blob when possible and stores both
 * the Blob and the remoteUrl.  Falls back to remoteUrl-only if CORS
 * blocks the download.
 */
export async function saveGeneratedImageAsset(input: {
  threadId: string;
  imageUrl: string;
  prompt: string;
  metadata?: Record<string, any>;
}): Promise<AssetRecord> {
  const db = await getDb();
  const id = uuidv4();

  // Try downloading the generated image; if CORS blocks it, store remoteUrl only
  let blob: Blob;
  let mimeType = "image/png";
  let size = 0;

  try {
    const response = await fetch(input.imageUrl, { mode: "cors" });
    if (response.ok) {
      blob = await response.blob();
      mimeType = blob.type || "image/png";
      size = blob.size;
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch {
    // Cross-origin or network error — create a small placeholder so the
    // record is still valid, and rely on remoteUrl for display.
    blob = new Blob([], { type: "image/png" });
    mimeType = "image/png";
    size = 0;
  }

  const record: AssetRecord = {
    id,
    threadId: input.threadId,
    kind: "generated_image",
    mimeType,
    blob,
    size,
    createdAt: Date.now(),
    source: "jimeng",
    prompt: input.prompt,
    remoteUrl: input.imageUrl,
    metadata: input.metadata,
  };

  const tx = rwTx(db, ["assets"]);
  const store = tx.objectStore("assets");
  await promisifyRequest(store.add(record));

  return record;
}

/**
 * Create an object URL from a stored asset Blob.
 * Caller MUST revoke this URL via URL.revokeObjectURL() when done.
 */
export async function createObjectUrl(assetId: string): Promise<string | null> {
  const asset = await getAsset(assetId);
  if (!asset) return null;
  return URL.createObjectURL(asset.blob);
}
