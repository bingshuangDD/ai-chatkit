// ============================================================================
// Pending message repository — handles first-message handoff between routes
// ============================================================================

import { getDb, promisifyRequest, rwTx, roTx } from "../db";
import type { PendingMessageRecord } from "../schema";

export async function savePendingMessage(record: PendingMessageRecord): Promise<void> {
  const db = await getDb();
  const tx = rwTx(db, ["pendingMessages"]);
  await promisifyRequest(tx.objectStore("pendingMessages").put(record));
}

/**
 * Read the pending message for a thread, then delete it.
 * Returns null if no pending message exists.
 */
export async function consumePendingMessage(
  threadId: string
): Promise<PendingMessageRecord | null> {
  const db = await getDb();

  // Read
  const roTx_ = roTx(db, ["pendingMessages"]);
  const record = await promisifyRequest<PendingMessageRecord | undefined>(
    roTx_.objectStore("pendingMessages").get(threadId)
  );

  if (!record) return null;

  // Delete after reading
  const rwTx_ = rwTx(db, ["pendingMessages"]);
  rwTx_.objectStore("pendingMessages").delete(threadId);
  await new Promise<void>((resolve, reject) => {
    rwTx_.oncomplete = () => resolve();
    rwTx_.onerror = () => reject(rwTx_.error);
  });

  return record;
}
