// ============================================================================
// IndexedDB database setup & upgrade management
// ============================================================================

const DB_NAME = "ai-chatkit";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in this environment"));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // --- sessions store ---
      if (!db.objectStoreNames.contains("sessions")) {
        const sessionsStore = db.createObjectStore("sessions", { keyPath: "threadId" });
        sessionsStore.createIndex("updatedAt", "updatedAt", { unique: false });
        sessionsStore.createIndex("agentId", "agentId", { unique: false });
      }

      // --- messages store ---
      if (!db.objectStoreNames.contains("messages")) {
        const messagesStore = db.createObjectStore("messages", { keyPath: "id" });
        messagesStore.createIndex("threadId", "threadId", { unique: false });
        messagesStore.createIndex("threadId_createdAt", ["threadId", "createdAt"], { unique: false });
      }

      // --- assets store ---
      if (!db.objectStoreNames.contains("assets")) {
        const assetsStore = db.createObjectStore("assets", { keyPath: "id" });
        assetsStore.createIndex("threadId", "threadId", { unique: false });
        assetsStore.createIndex("kind", "kind", { unique: false });
        assetsStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      // --- pendingMessages store ---
      if (!db.objectStoreNames.contains("pendingMessages")) {
        db.createObjectStore("pendingMessages", { keyPath: "threadId" });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };

    request.onblocked = () => {
      console.warn("[ai-chatkit] IndexedDB upgrade blocked — close other tabs using this DB");
    };
  });
}

/**
 * Returns a singleton promise for the IndexedDB connection.
 * Reuses the same connection for the lifetime of the page.
 */
export function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabase();
  }
  return dbPromise;
}

/**
 * Simple promise wrapper for IDBRequest, with typed result.
 */
export function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Open a readwrite transaction on one or more stores.
 */
export function rwTx(db: IDBDatabase, storeNames: string[]): IDBTransaction {
  return db.transaction(storeNames, "readwrite");
}

/**
 * Open a readonly transaction on one or more stores.
 */
export function roTx(db: IDBDatabase, storeNames: string[]): IDBTransaction {
  return db.transaction(storeNames, "readonly");
}
