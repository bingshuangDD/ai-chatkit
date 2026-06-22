// ============================================================================
// Session repository — manages chat session list
// ============================================================================

import { getDb, promisifyRequest, rwTx, roTx } from "../db";
import type { ChatSessionRecord } from "../schema";
import { deleteMessagesByThread } from "./messageRepository";
import { deleteAssetsByThread } from "./assetRepository";

export async function listSessions(): Promise<ChatSessionRecord[]> {
  const db = await getDb();
  const tx = roTx(db, ["sessions"]);
  const store = tx.objectStore("sessions");
  const index = store.index("updatedAt");
  // Return newest-first
  const records = await promisifyRequest<ChatSessionRecord[]>(index.getAll());
  return records.reverse();
}

export async function getSession(threadId: string): Promise<ChatSessionRecord | null> {
  const db = await getDb();
  const tx = roTx(db, ["sessions"]);
  const store = tx.objectStore("sessions");
  const record = await promisifyRequest<ChatSessionRecord | undefined>(store.get(threadId));
  return record ?? null;
}

export async function createSession(input: {
  threadId: string;
  name: string;
  agentId: string;
  lastMessagePreview?: string;
}): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  const record: ChatSessionRecord = {
    threadId: input.threadId,
    name: input.name,
    agentId: input.agentId,
    createdAt: now,
    updatedAt: now,
    lastMessagePreview: input.lastMessagePreview ?? input.name,
  };

  const tx = rwTx(db, ["sessions"]);
  const store = tx.objectStore("sessions");
  await promisifyRequest(store.add(record));
}

export async function updateSession(
  threadId: string,
  patch: Partial<ChatSessionRecord>
): Promise<void> {
  const db = await getDb();
  const tx = rwTx(db, ["sessions"]);
  const store = tx.objectStore("sessions");
  const existing = await promisifyRequest<ChatSessionRecord | undefined>(store.get(threadId));
  if (!existing) return;

  const updated = { ...existing, ...patch, threadId, updatedAt: Date.now() };
  await promisifyRequest(store.put(updated));
}

/**
 * Delete a session and cascade-delete its messages, assets, and pending message.
 */
export async function deleteSession(threadId: string): Promise<void> {
  // Delete related data in parallel
  await Promise.all([
    deleteMessagesByThread(threadId),
    deleteAssetsByThread(threadId),
    (async () => {
      const db = await getDb();
      const tx = rwTx(db, ["pendingMessages"]);
      tx.objectStore("pendingMessages").delete(threadId);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    })(),
  ]);

  // Delete the session itself
  const db = await getDb();
  const tx = rwTx(db, ["sessions"]);
  tx.objectStore("sessions").delete(threadId);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
