// IndexedDB persistence for memories (F-MEM). Every call is wrapped: if storage is unavailable the app runs in memory.
// Pre-rename name, kept on purpose: renaming would orphan saved memories (ADR-0010, ADR-0012).
const DB = 'fun-banter';
const VERSION = 1;
let dbp: Promise<IDBDatabase | null> | undefined;

function open(): Promise<IDBDatabase | null> {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB, VERSION);
      req.onupgradeneeded = (e) => {
        const db = req.result;
        // v1 schema. Future versions: add `if (e.oldVersion < 2) {...}` migrations here.
        if (e.oldVersion < 1) {
          db.createObjectStore('rooms', { keyPath: 'id' });
          db.createObjectStore('blobs');
          db.createObjectStore('live');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbp;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | null> {
  return open().then((db) => new Promise<T | null>((resolve) => {
    if (!db) return resolve(null);
    try {
      const t = db.transaction(store, mode);
      const r = fn(t.objectStore(store));
      t.oncomplete = () => resolve(r ? (r.result as T) : (true as unknown as T));
      t.onerror = () => resolve(null);
      t.onabort = () => resolve(null);
    } catch { resolve(null); }
  }));
}

export const storage = {
  available: () => open().then((d) => !!d),
  putRoom: <T extends { id: string }>(room: T) => tx('rooms', 'readwrite', (s) => s.put(room)).then((r) => r !== null),
  getRoom: <T,>(id: string) => tx<T>('rooms', 'readonly', (s) => s.get(id) as IDBRequest<T>),
  listRooms: <T,>() => tx<T[]>('rooms', 'readonly', (s) => s.getAll() as IDBRequest<T[]>).then((r) => r ?? []),
  deleteRoom: (id: string) => tx('rooms', 'readwrite', (s) => s.delete(id)),
  putBlob: (key: string, blob: Blob) => tx('blobs', 'readwrite', (s) => s.put(blob, key)).then((r) => r !== null),
  getBlob: (key: string) => tx<Blob>('blobs', 'readonly', (s) => s.get(key) as IDBRequest<Blob>),
  /** in-progress room for reload-resume */
  putLive: (v: unknown) => tx('live', 'readwrite', (s) => s.put(v, 'current')).then((r) => r !== null),
  getLive: <T,>() => tx<T>('live', 'readonly', (s) => s.get('current') as IDBRequest<T>),
  clearLive: () => tx('live', 'readwrite', (s) => s.delete('current')),
};
