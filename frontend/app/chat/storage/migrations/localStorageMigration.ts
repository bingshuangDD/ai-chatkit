// ============================================================================
// One-time migration: localStorage → IndexedDB
// ============================================================================

import { createSession, listSessions } from "../repositories/sessionRepository";
import { persistUiMessages } from "../repositories/messageRepository";
import { savePendingMessage } from "../repositories/pendingMessageRepository";

const MIGRATION_FLAG = "indexedDbMigration:v1";

interface OldSession {
  threadId: string;
  name: string;
  lastUpdated: number;
}

interface OldMessage {
  id: string;
  type: "user" | "ai" | "tool";
  content: string;
  images?: string[];
  toolCall?: { calls: any[] };
}

/**
 * Check whether the v1 migration has already been performed.
 */
export function isMigrationDone(): boolean {
  try {
    return localStorage.getItem(MIGRATION_FLAG) === "done";
  } catch {
    return false;
  }
}

/**
 * Run the one-time localStorage → IndexedDB migration.
 * Safe to call multiple times — it checks the flag first.
 */
export async function migrateLocalStorageToIndexedDB(): Promise<void> {
  if (isMigrationDone()) return;

  console.log("[ai-chatkit] Starting localStorage → IndexedDB migration...");

  try {
    // 1. Migrate sessions
    const sessionsJson = localStorage.getItem("chatSessions");
    const oldSessions: OldSession[] = sessionsJson ? JSON.parse(sessionsJson) : [];

    for (const session of oldSessions) {
      await createSession({
        threadId: session.threadId,
        name: session.name,
        agentId: "oa-assistant", // default for old data
        lastMessagePreview: session.name,
      });
    }

    // 2. Migrate messages for each session
    for (const session of oldSessions) {
      const messagesKey = `chatMessages-${session.threadId}`;
      const messagesJson = localStorage.getItem(messagesKey);
      if (!messagesJson) continue;

      try {
        const oldMessages: OldMessage[] = JSON.parse(messagesJson);
        if (oldMessages.length > 0) {
          await persistUiMessages(session.threadId, oldMessages);
        }
      } catch (e) {
        console.warn(`[ai-chatkit] Failed to migrate messages for ${session.threadId}:`, e);
      }
    }

    // 3. Migrate pending messages
    const pendingKeys = Object.keys(localStorage).filter((k) =>
      k.startsWith("chatPendingMessage-") && !k.endsWith("-images")
    );

    for (const key of pendingKeys) {
      const threadId = key.replace("chatPendingMessage-", "");
      const message = localStorage.getItem(key);
      if (!message) continue;

      const imagesKey = `${key}-images`;
      const imagesJson = localStorage.getItem(imagesKey);
      const imageAssetIds: string[] = [];

      // Pending images → assets will be handled by ChatComponent on first load
      // For now, we only migrate the text and mark the presence of images
      if (imagesJson) {
        try {
          const pendingImages: string[] = JSON.parse(imagesJson);
          if (pendingImages.length > 0) {
            // We pass a placeholder; ChatComponent will hydrate images on load
            imageAssetIds.push(...pendingImages.map((_, i) => `pending_${threadId}_${i}`));
          }
        } catch { /* ignore malformed image data */ }
      }

      await savePendingMessage({
        threadId,
        message,
        imageAssetIds: imageAssetIds.length > 0 ? imageAssetIds : undefined,
        agentId: "oa-assistant",
        createdAt: Date.now(),
      });
    }

    // Mark migration as done (but DON'T delete old localStorage data yet)
    localStorage.setItem(MIGRATION_FLAG, "done");
    console.log("[ai-chatkit] Migration completed successfully.");
  } catch (e) {
    console.error("[ai-chatkit] Migration failed:", e);
    throw e;
  }
}

/**
 * Clean up old localStorage keys after confirming IndexedDB is stable.
 * Call this manually or in a future version auto-cleanup.
 */
export function cleanupOldLocalStorageData(): void {
  if (!isMigrationDone()) return;

  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (
      key &&
      (key.startsWith("chatMessages-") ||
        key.startsWith("chatPendingMessage-") ||
        key === "chatSessions")
    ) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }

  console.log(`[ai-chatkit] Cleaned up ${keysToRemove.length} old localStorage keys.`);
}
