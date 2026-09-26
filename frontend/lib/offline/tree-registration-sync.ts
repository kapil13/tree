import { errorMessage, isApiError, trees, uploads } from "@/lib/api";
import {
  dataUrlToFile,
  listPendingTreeRegistrations,
  removeTreeRegistration,
  updateTreeRegistrationStatus,
  type QueuedTreeRegistration,
} from "@/lib/offline/tree-registration-queue";

export function isBrowserOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

export function isNetworkFailure(err: unknown): boolean {
  return isApiError(err) && (!err.response || err.code === "ERR_NETWORK");
}

export async function syncQueuedTreeRegistrations(): Promise<number> {
  if (!isBrowserOnline()) return 0;

  const pending = await listPendingTreeRegistrations();
  let synced = 0;

  for (const item of pending) {
    if (!isBrowserOnline()) break;
    await updateTreeRegistrationStatus(item.id, { status: "syncing", errorMessage: undefined });
    try {
      await uploadAndCreateTree(item);
      await removeTreeRegistration(item.id);
      synced++;
    } catch (err) {
      const message = errorMessage(err);
      await updateTreeRegistrationStatus(item.id, {
        status: "failed",
        errorMessage: message,
        retryCount: item.retryCount + 1,
      });
      if (isApiError(err) && err.response?.status === 401) {
        break;
      }
    }
  }

  return synced;
}

async function uploadAndCreateTree(item: QueuedTreeRegistration): Promise<void> {
  const payload = { ...item.payload };
  const uploadedKeys: string[] = [];

  for (const photo of item.photos) {
    const file = dataUrlToFile(photo.dataUrl, photo.filename);
    uploadedKeys.push(await uploads.uploadImage(file));
  }

  const existingKeys = Array.isArray(payload.photo_keys)
    ? payload.photo_keys.filter((key) => typeof key === "string" && !key.startsWith("offline:"))
    : [];

  payload.photo_keys = [...existingKeys, ...uploadedKeys];

  await trees.create({
    program_code: payload.program_code as string | undefined,
    species_text: payload.species_text as string | undefined,
    planted_at: payload.planted_at as string | undefined,
    latitude: Number(payload.latitude),
    longitude: Number(payload.longitude),
    altitude_m: payload.altitude_m as number | undefined,
    accuracy_m: payload.accuracy_m as number | undefined,
    plantation_id: payload.plantation_id as string | undefined,
    work_area_id: payload.work_area_id as string | undefined,
    photo_keys: payload.photo_keys as string[],
    metadata: (payload.metadata as Record<string, unknown>) ?? {},
  });
}
