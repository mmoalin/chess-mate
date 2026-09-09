type StoredRecord<T> = { key: string; value: T };

const DB_NAME = 'chessmate-guided';
const STORE_NAME = 'records';
const DB_VERSION = 1;

const memoryFallback = new Map<string, unknown>();

export function resetGuidedMemoryStoreForTests(): void {
  memoryFallback.clear();
}

export class GuidedBrowserStore {
  async putMany(items: { key: string; value: unknown }[]): Promise<void> {
    if (!globalThis.indexedDB) {
      for (const item of items) memoryFallback.set(item.key, structuredClone(item.value));
      return;
    }
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      for (const item of items) transaction.objectStore(STORE_NAME).put(item);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }
  async get<T>(key: string): Promise<T | null> {
    if (!globalThis.indexedDB) return (memoryFallback.get(key) as T | undefined) ?? null;
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve((request.result as StoredRecord<T> | undefined)?.value ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async put<T>(key: string, value: T): Promise<void> {
    if (!globalThis.indexedDB) {
      memoryFallback.set(key, value);
      return;
    }
    const database = await openDatabase();
    await transactionRequest(database, 'readwrite', (store) => store.put({ key, value } satisfies StoredRecord<T>));
  }

  async remove(key: string): Promise<void> {
    if (!globalThis.indexedDB) {
      memoryFallback.delete(key);
      return;
    }
    const database = await openDatabase();
    await transactionRequest(database, 'readwrite', (store) => store.delete(key));
  }

  async list<T>(prefix: string): Promise<T[]> {
    if (!globalThis.indexedDB) {
      return Array.from(memoryFallback.entries()).filter(([key]) => key.startsWith(prefix)).map(([, value]) => value as T);
    }
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve((request.result as StoredRecord<T>[]).filter((record) => record.key.startsWith(prefix)).map((record) => record.value));
      request.onerror = () => reject(request.error);
    });
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionRequest(database: IDBDatabase, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    action(transaction.objectStore(STORE_NAME));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
