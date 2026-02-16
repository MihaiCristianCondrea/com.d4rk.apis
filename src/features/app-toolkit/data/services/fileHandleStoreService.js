/**
 * @file IndexedDB-backed file handle store service.
 */

/**
 * Change Rationale:
 * - IndexedDB persistence lived directly inside the route module, coupling IO details to UI flow.
 * - Moving it into `data/services` preserves the data/domain/ui boundary and enables isolated tests.
 * - Centralized persistence improves reliability for token reuse, reducing user friction.
 */

/**
 * Creates a persistent file handle store.
 *
 * @param {{dbName: string, storeName: string, key: string}} options Store configuration.
 * @returns {{get: () => Promise<unknown>, set: (value: unknown) => Promise<void>, clear: () => Promise<void>}} Store API.
 */
export function createFileHandleStore({ dbName, storeName, key }) {
  if (typeof indexedDB === 'undefined') {
    return {
      async set() {},
      async clear() {},
      async get() { return null; }
    };
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      request.addEventListener('upgradeneeded', () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
      });
      request.addEventListener('success', () => resolve(request.result));
      request.addEventListener('error', () => reject(request.error));
    });
  }

  async function runTransaction(mode, executor) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let settled = false;
      const safeResolve = (value) => { if (!settled) { settled = true; resolve(value); } };
      const safeReject = (error) => { if (!settled) { settled = true; reject(error); } };
      tx.addEventListener('complete', () => { db.close(); safeResolve(undefined); });
      tx.addEventListener('abort', () => { db.close(); safeReject(tx.error || new Error('Transaction aborted.')); });
      executor(store, safeResolve, safeReject);
    });
  }

  return {
    async get() {
      try {
        const db = await openDb();
        return await new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, 'readonly');
          const request = tx.objectStore(storeName).get(key);
          request.addEventListener('success', () => resolve(request.result || null));
          request.addEventListener('error', () => reject(request.error));
          tx.addEventListener('complete', () => db.close());
          tx.addEventListener('abort', () => { db.close(); reject(tx.error || request.error || new Error('Transaction aborted.')); });
        });
      } catch (error) {
        console.warn('AppToolkit: Unable to read stored GitHub token file handle.', error);
        return null;
      }
    },
    async set(value) {
      try {
        await runTransaction('readwrite', (store, resolve, reject) => {
          const request = store.put(value, key);
          request.addEventListener('success', () => resolve());
          request.addEventListener('error', () => reject(request.error));
        });
      } catch (error) {
        console.warn('AppToolkit: Unable to store GitHub token file handle.', error);
      }
    },
    async clear() {
      try {
        await runTransaction('readwrite', (store, resolve, reject) => {
          const request = store.delete(key);
          request.addEventListener('success', () => resolve());
          request.addEventListener('error', () => reject(request.error));
        });
      } catch (error) {
        console.warn('AppToolkit: Unable to clear stored GitHub token file handle.', error);
      }
    }
  };
}
