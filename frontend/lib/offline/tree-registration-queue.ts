/** IndexedDB-backed offline tree registration queue for web field capture. */

export type TreeQueueStatus = "pending" | "syncing" | "failed";

export type QueuedTreePhoto = {
  filename: string;
  dataUrl: string;
};

export type QueuedTreeRegistration = {
  id: string;
  payload: Record<string, unknown>;
  photos: QueuedTreePhoto[];
  status: TreeQueueStatus;
  errorMessage?: string;
  createdAt: string;
  retryCount: number;
};

const DB_NAME = "aranyix-offline";
const DB_VERSION = 1;
const STORE = "tree_registrations";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("indexedDB open failed"));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const request = fn(store);
    request.onerror = () => reject(request.error ?? new Error("indexedDB request failed"));
    request.onsuccess = () => resolve(request.result as T);
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error ?? new Error("indexedDB transaction failed"));
  });
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, body] = dataUrl.split(",");
  const mime = header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

export async function listQueuedTreeRegistrations(): Promise<QueuedTreeRegistration[]> {
  const rows = await withStore("readonly", (store) => store.getAll());
  return (rows as QueuedTreeRegistration[]).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function listPendingTreeRegistrations(): Promise<QueuedTreeRegistration[]> {
  const all = await listQueuedTreeRegistrations();
  return all.filter((item) => item.status === "pending" || item.status === "failed");
}

export async function pendingTreeRegistrationCount(): Promise<number> {
  const pending = await listPendingTreeRegistrations();
  return pending.length;
}

export async function enqueueTreeRegistration(input: {
  payload: Record<string, unknown>;
  photos: QueuedTreePhoto[];
}): Promise<QueuedTreeRegistration> {
  const item: QueuedTreeRegistration = {
    id: crypto.randomUUID(),
    payload: input.payload,
    photos: input.photos,
    status: "pending",
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
  await withStore("readwrite", (store) => store.put(item));
  return item;
}

export async function updateTreeRegistrationStatus(
  id: string,
  update: Partial<Pick<QueuedTreeRegistration, "status" | "errorMessage" | "retryCount">>,
): Promise<void> {
  const existing = await withStore("readonly", (store) => store.get(id));
  if (!existing) return;
  const next = { ...(existing as QueuedTreeRegistration), ...update };
  await withStore("readwrite", (store) => store.put(next));
}

export async function removeTreeRegistration(id: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id));
}
