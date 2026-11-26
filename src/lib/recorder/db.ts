/** Nahrávky v IndexedDB (zůstanou v zařízení i po zavření aplikace). */
export interface RecordingMeta {
  id: string;
  name: string;
  created: number;      // ms od 1970
  duration: number;     // s
  sampleRate: number;
  bytes: number;
}
export interface RecordingRow extends RecordingMeta {
  blob: Blob;
}

const DB = 'soundlab';
const STORE = 'recordings';

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export const putRecording = (r: RecordingRow) => tx('readwrite', s => s.put(r));
export const getRecording = (id: string) => tx<RecordingRow | undefined>('readonly', s => s.get(id));
export const deleteRecording = (id: string) => tx('readwrite', s => s.delete(id));
export const clearRecordings = () => tx('readwrite', s => s.clear());
export async function listRecordings(): Promise<RecordingMeta[]> {
  const rows = await tx<RecordingRow[]>('readonly', s => s.getAll());
  return rows.map(({ blob: _b, ...m }) => m).sort((a, b) => b.created - a.created);
}
