// ============================================================================
// Message repository — manages chat messages in IndexedDB
// ============================================================================

import { getDb, promisifyRequest, rwTx, roTx } from "../db";
import type { ChatMessageRecord } from "../schema";
import { getAsset, createObjectUrl } from "./assetRepository";
import type { Message } from "../../types/chat.types";

// ---------------------------------------------------------------------------
// Raw record CRUD
// ---------------------------------------------------------------------------

export async function listMessages(threadId: string): Promise<ChatMessageRecord[]> {
  const db = await getDb();
  const tx = roTx(db, ["messages"]);
  const store = tx.objectStore("messages");
  const index = store.index("threadId");
  const records = await promisifyRequest<ChatMessageRecord[]>(index.getAll(threadId));
  return records.sort(compareMessages);
}

function compareMessages(a: ChatMessageRecord, b: ChatMessageRecord): number {
  const createdDiff = a.createdAt - b.createdAt;
  if (createdDiff !== 0) {
    return createdDiff;
  }

  const typeOrder: Record<ChatMessageRecord["type"], number> = {
    user: 0,
    ai: 1,
    tool: 2,
  };
  const typeDiff = typeOrder[a.type] - typeOrder[b.type];
  if (typeDiff !== 0) {
    return typeDiff;
  }

  return a.id.localeCompare(b.id);
}

function repairLeadingAiPlaceholder(messages: Message[]): Message[] {
  if (
    messages.length >= 2 &&
    messages[0].type === "ai" &&
    messages[0].content === "" &&
    messages[1].type === "user"
  ) {
    return [messages[1], messages[0], ...messages.slice(2)];
  }
  return messages;
}

export async function addMessage(record: ChatMessageRecord): Promise<void> {
  const db = await getDb();
  const tx = rwTx(db, ["messages"]);
  await promisifyRequest(tx.objectStore("messages").add(record));
}

export async function updateMessage(
  messageId: string,
  patch: Partial<ChatMessageRecord>
): Promise<void> {
  const db = await getDb();
  const tx = rwTx(db, ["messages"]);
  const store = tx.objectStore("messages");
  const existing = await promisifyRequest<ChatMessageRecord | undefined>(store.get(messageId));
  if (!existing) return;

  const updated = { ...existing, ...patch, updatedAt: Date.now() };
  await promisifyRequest(store.put(updated));
}

export async function replaceMessages(
  threadId: string,
  messages: ChatMessageRecord[]
): Promise<void> {
  const db = await getDb();

  // Clear existing messages for this thread
  await deleteMessagesByThread(threadId);

  if (messages.length === 0) return;

  // Bulk-insert new messages
  const tx = rwTx(db, ["messages"]);
  const store = tx.objectStore("messages");
  for (const msg of messages) {
    store.add(msg);
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteMessagesByThread(threadId: string): Promise<void> {
  const db = await getDb();
  const existing = await listMessages(threadId);
  if (existing.length === 0) return;

  const tx = rwTx(db, ["messages"]);
  const store = tx.objectStore("messages");
  for (const msg of existing) {
    store.delete(msg.id);
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------------------------------------------------------------------------
// UI-compatible hydrate / persist — bridges between IndexedDB and UI Message[]
// ---------------------------------------------------------------------------

/**
 * Load messages from IndexedDB and convert asset ids to data URLs
 * so the existing UI components can render them unchanged.
 */
export async function hydrateMessages(threadId: string): Promise<Message[]> {
  const records = await listMessages(threadId);

  const messages: Message[] = [];
  for (const record of records) {
    const images: string[] = [];
    const generatedImages: string[] = [];

    // Resolve imageAssetIds → data URLs
    if (record.imageAssetIds && record.imageAssetIds.length > 0) {
      for (const assetId of record.imageAssetIds) {
        const url = await createObjectUrl(assetId);
        if (url) {
          images.push(url);
        }
      }
    }

    // Resolve generatedAssetIds → display URLs (prefer remoteUrl)
    if (record.generatedAssetIds && record.generatedAssetIds.length > 0) {
      for (const assetId of record.generatedAssetIds) {
        const asset = await getAsset(assetId);
        if (!asset) continue;
        if (asset.remoteUrl) {
          generatedImages.push(asset.remoteUrl);
        } else {
          const blobUrl = URL.createObjectURL(asset.blob);
          generatedImages.push(blobUrl);
        }
      }
    }

    messages.push({
      id: record.id,
      type: record.type,
      content: record.content,
      ...(images.length > 0 ? { images } : {}),
      ...(record.imageAssetIds && record.imageAssetIds.length > 0 ? { imageAssetIds: record.imageAssetIds } : {}),
      ...(generatedImages.length > 0 ? { generatedImages } : {}),
      ...(record.generatedAssetIds && record.generatedAssetIds.length > 0 ? { generatedAssetIds: record.generatedAssetIds } : {}),
      ...(record.toolCall ? { toolCall: record.toolCall } : {}),
    });
  }

  return repairLeadingAiPlaceholder(messages);
}

/**
 * Persist UI Message[] into IndexedDB records.
 * Extracts data URLs → saves as assets → stores only asset ids in messages.
 */
export async function persistUiMessages(
  threadId: string,
  messages: Message[]
): Promise<void> {
  const records: ChatMessageRecord[] = [];
  const now = Date.now();

  for (let index = 0; index < messages.length; index += 1) {
    const msg = messages[index];
    const imageAssetIds: string[] = [];

    // Convert inline data URLs to assets
    if (msg.images && msg.images.length > 0) {
      for (const image of msg.images) {
        // Only persist images that are data URLs (not already object URLs)
        if (image.startsWith("data:")) {
          const { saveImageAsset } = await import("./assetRepository");
          const asset = await saveImageAsset({
            threadId,
            dataUrlOrBlob: image,
            kind: "user_upload",
            source: "input",
          });
          imageAssetIds.push(asset.id);
        }
      }
    }

    records.push({
      id: msg.id,
      threadId,
      type: msg.type,
      content: msg.content,
      ...(imageAssetIds.length > 0 ? { imageAssetIds } : {}),
      ...(msg.generatedAssetIds && msg.generatedAssetIds.length > 0 ? { generatedAssetIds: msg.generatedAssetIds } : {}),
      ...(msg.toolCall ? { toolCall: msg.toolCall } : {}),
      createdAt: now + index,
      updatedAt: now + index,
    });
  }

  await replaceMessages(threadId, records);
}
