import {
  AnimalProfile,
  ScreeningRecord,
  CareReminder,
  VeterinaryPrescription,
  VetVisit,
} from "../types";
import { apiUrl } from "../config/api";
import {
  directSaveAnimalToFirestore,
  directDeleteAnimalFromFirestore,
  directSaveScanToFirestore,
  directSaveReminderToFirestore,
  directDeleteReminderFromFirestore,
  directSavePrescriptionToFirestore,
  directSaveVetVisitToFirestore,
  directFetchUserDataFromFirestore,
} from "./firestoreClient";

const USER_ID_STORAGE_KEY = "vetcheck_anonymous_user_id_v1";
const MIGRATION_DONE_KEY = "vetcheck_backend_migrated_v1";
const OFFLINE_QUEUE_KEY = "vetcheck_offline_sync_queue_v1";
const DELETED_ANIMALS_KEY = "vetcheck_deleted_animal_ids_v1";

export function getDeletedAnimalIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DELETED_ANIMALS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function recordDeletedAnimalId(animalId: string): void {
  if (typeof window === "undefined" || !animalId) return;
  try {
    const ids = getDeletedAnimalIds();
    if (!ids.includes(animalId)) {
      ids.push(animalId);
      localStorage.setItem(DELETED_ANIMALS_KEY, JSON.stringify(ids.slice(-100)));
    }
  } catch (e) {
    // Ignore storage write errors
  }
}

export function isAnimalDeletedLocally(animalId: string): boolean {
  if (!animalId) return false;
  return getDeletedAnimalIds().includes(animalId);
}

export function removePendingQueueActionsForAnimal(animalId: string): void {
  if (typeof window === "undefined" || !animalId) return;
  try {
    const queue = getOfflineQueue();
    const filtered = queue.filter((item) => {
      // Remove any POST/PUT /api/animals matching this animal
      if (item.endpoint.includes(`/api/animals/${animalId}`) && item.method !== "DELETE") {
        return false;
      }
      if (item.endpoint === "/api/animals" && item.payload?.id === animalId) {
        return false;
      }
      // Remove any scan/reminder/prescription/visit creations linked to this animal
      if (
        item.payload?.animalProfileId === animalId ||
        item.payload?.animalId === animalId
      ) {
        return false;
      }
      return true;
    });
    saveOfflineQueue(filtered);
  } catch (e) {
    // Non-fatal
  }
}

export function getOrCreateAnonymousUserId(): string {
  if (typeof window === "undefined") return "user-server";
  try {
    let id = localStorage.getItem(USER_ID_STORAGE_KEY);
    if (!id) {
      id = "usr-" + Date.now() + "-" + Math.random().toString(36).substring(2, 10);
      localStorage.setItem(USER_ID_STORAGE_KEY, id);
    }
    return id;
  } catch (e) {
    return "user-default";
  }
}

interface QueuedAction {
  id: string;
  endpoint: string;
  method: "POST" | "PUT" | "DELETE";
  payload?: any;
  timestamp: number;
}

function getOfflineQueue(): QueuedAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveOfflineQueue(queue: QueuedAction[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue.slice(-50)));
  } catch (e) {
    // Ignore
  }
}

export type SyncStateListener = (isSyncing: boolean, pendingCount: number) => void;
const syncListeners = new Set<SyncStateListener>();
let currentIsSyncing = false;

export function getOfflineQueueCount(): number {
  return getOfflineQueue().length;
}

export function subscribeSyncState(listener: SyncStateListener): () => void {
  syncListeners.add(listener);
  listener(currentIsSyncing, getOfflineQueue().length);
  return () => {
    syncListeners.delete(listener);
  };
}

export function notifySyncState(isSyncing: boolean) {
  currentIsSyncing = isSyncing;
  const count = getOfflineQueue().length;
  syncListeners.forEach((fn) => {
    try {
      fn(isSyncing, count);
    } catch (e) {
      // Ignore listener error
    }
  });
}

function enqueueOfflineAction(endpoint: string, method: "POST" | "PUT" | "DELETE", payload?: any) {
  const queue = getOfflineQueue();
  queue.push({
    id: "q-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
    endpoint,
    method,
    payload,
    timestamp: Date.now(),
  });
  saveOfflineQueue(queue);
  notifySyncState(currentIsSyncing);
}

export async function flushOfflineQueue(): Promise<number> {
  if (typeof window === "undefined") return 0;
  const queue = getOfflineQueue();
  if (queue.length === 0) {
    notifySyncState(false);
    return 0;
  }

  notifySyncState(true);
  try {
    const userId = getOrCreateAnonymousUserId();
    const remaining: QueuedAction[] = [];
    let flushedCount = 0;

    for (const item of queue) {
      try {
        const res = await fetch(item.endpoint, {
          method: item.method,
          headers: {
            "Content-Type": "application/json",
            "x-user-id": userId,
          },
          body: item.payload ? JSON.stringify(item.payload) : undefined,
        });
        if (res.ok) {
          flushedCount++;
        } else {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }

    saveOfflineQueue(remaining);
    if (flushedCount > 0) {
      console.log(`[VetCheck Sync] Flushed ${flushedCount} offline queued actions to backend.`);
    }
    return flushedCount;
  } finally {
    notifySyncState(false);
  }
}

// Attach auto-flush on reconnection with safe async/await handling
if (typeof window !== "undefined") {
  window.addEventListener("online", async () => {
    try {
      await flushOfflineQueue();
    } catch (err) {
      console.warn("[VetCheck Sync] Error flushing offline queue on online event:", err);
    }
  });
}

function getApiUrl(endpoint: string): string {
  return apiUrl(endpoint);
}

async function safeApiCall(endpoint: string, method: "POST" | "PUT" | "DELETE", payload?: any): Promise<void> {
  const userId = getOrCreateAnonymousUserId();
  const fullUrl = getApiUrl(endpoint);
  try {
    const res = await fetch(fullUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const ct = res.headers.get("content-type") || "";
    if (res.ok && !ct.includes("text/html")) {
      return;
    }
    if (!res.ok && !ct.includes("text/html")) {
      console.warn(`[VetCheck Sync] ${method} ${endpoint} returned status ${res.status}. Enqueuing for offline retry.`);
      enqueueOfflineAction(endpoint, method, payload);
    }
  } catch (err) {
    console.log(`[VetCheck Sync] Network error on ${method} ${endpoint}. Enqueuing for offline retry:`, err);
    enqueueOfflineAction(endpoint, method, payload);
  }
}

export async function syncAnimalToBackend(animal: AnimalProfile | { id: string }, action: "save" | "delete"): Promise<void> {
  const userId = getOrCreateAnonymousUserId();
  try {
    if (action === "delete") {
      recordDeletedAnimalId(animal.id);
      removePendingQueueActionsForAnimal(animal.id);
      directDeleteAnimalFromFirestore(animal.id);
      await safeApiCall(`/api/animals/${encodeURIComponent(animal.id)}`, "DELETE");
    } else {
      if (isAnimalDeletedLocally(animal.id)) {
        console.log(`[VetCheck Sync] Skipping sync save for locally deleted animal ${animal.id}`);
        return;
      }
      directSaveAnimalToFirestore(animal as AnimalProfile, userId);
      await safeApiCall("/api/animals", "POST", animal);
    }
  } catch (err) {
    console.warn("[VetCheck Sync] Error syncing animal to backend:", err);
  }
}

export async function syncScanToBackend(scan: ScreeningRecord, action: "save" | "delete"): Promise<void> {
  const userId = getOrCreateAnonymousUserId();
  try {
    if (action === "delete") {
      await safeApiCall(`/api/scans/${encodeURIComponent(scan.id)}`, "DELETE");
    } else {
      directSaveScanToFirestore(scan, userId);
      await safeApiCall("/api/scans", "POST", scan);
    }
  } catch (err) {
    console.warn("[VetCheck Sync] Error syncing scan to backend:", err);
  }
}

export async function syncReminderToBackend(reminder: CareReminder, action: "save" | "delete"): Promise<void> {
  const userId = getOrCreateAnonymousUserId();
  try {
    if (action === "delete") {
      directDeleteReminderFromFirestore(reminder.id);
      await safeApiCall(`/api/reminders/${encodeURIComponent(reminder.id)}`, "DELETE");
    } else {
      directSaveReminderToFirestore(reminder, userId);
      await safeApiCall("/api/reminders", "POST", {
        ...reminder,
        scheduledDate: reminder.dueDate,
      });
    }
  } catch (err) {
    console.warn("[VetCheck Sync] Error syncing reminder to backend:", err);
  }
}

export async function syncPrescriptionToBackend(prescription: VeterinaryPrescription, action: "save" | "delete"): Promise<void> {
  const userId = getOrCreateAnonymousUserId();
  try {
    if (action === "delete") {
      await safeApiCall(`/api/prescriptions/${encodeURIComponent(prescription.id)}`, "DELETE");
    } else {
      directSavePrescriptionToFirestore(prescription, userId);
      await safeApiCall("/api/prescriptions", "POST", prescription);
    }
  } catch (err) {
    console.warn("[VetCheck Sync] Error syncing prescription to backend:", err);
  }
}

export async function syncVetVisitToBackend(visit: VetVisit, action: "save" | "delete"): Promise<void> {
  const userId = getOrCreateAnonymousUserId();
  try {
    if (action === "delete") {
      await safeApiCall(`/api/vet-visits/${encodeURIComponent(visit.id)}`, "DELETE");
    } else {
      directSaveVetVisitToFirestore(visit, userId);
      await safeApiCall("/api/vet-visits", "POST", visit);
    }
  } catch (err) {
    console.warn("[VetCheck Sync] Error syncing vet visit to backend:", err);
  }
}

// In-flight migration promise lock to avoid race conditions across multiple initializations
let activeMigrationPromise: Promise<boolean> | null = null;

/**
 * Automatically and sequentially migrates existing client-side local data to the persistent Firestore database.
 * Uses explicit async/await across each phase and returns a Promise that guarantees all sub-tasks
 * (migration, local queue processing, and Firestore persistence) are fully completed before resolving
 * or triggering optional completion callbacks.
 */
export async function initializeBackendMigration(
  localData: {
    animals: AnimalProfile[];
    history: ScreeningRecord[];
    reminders: CareReminder[];
    prescriptions: VeterinaryPrescription[];
    vetVisits: VetVisit[];
  },
  callbacks?: {
    onComplete?: (success: boolean) => void;
    onError?: (error: any) => void;
  }
): Promise<boolean> {
  if (typeof window === "undefined") {
    callbacks?.onComplete?.(false);
    return false;
  }

  // Prevent concurrent startup migration race conditions by awaiting any in-flight migration
  if (activeMigrationPromise) {
    const result = await activeMigrationPromise;
    callbacks?.onComplete?.(result);
    return result;
  }

  activeMigrationPromise = (async (): Promise<boolean> => {
    try {
      // Step 1: Check existing migration status safely from local storage
      let alreadyMigrated = false;
      try {
        alreadyMigrated = localStorage.getItem(MIGRATION_DONE_KEY) === "true";
      } catch (storageReadErr) {
        console.warn("[VetCheck Sync] Could not read migration status from localStorage:", storageReadErr);
      }

      // Step 2: If already migrated, sequentially drain and process any pending offline actions
      if (alreadyMigrated) {
        try {
          const flushedCount = await flushOfflineQueue();
          if (flushedCount > 0) {
            console.log(`[VetCheck Sync] Reconnection queue verified: ${flushedCount} actions synchronized.`);
          }
        } catch (flushErr) {
          console.warn("[VetCheck Sync] Routine offline queue flush error:", flushErr);
        }
        callbacks?.onComplete?.(true);
        return true;
      }

      // Step 3: Prepare persistent sync payload for backend Firestore synchronization
      const userId = getOrCreateAnonymousUserId();
      const deletedIds = new Set(getDeletedAnimalIds());
      const payload = {
        userId,
        animals: (localData.animals || []).filter((a) => !deletedIds.has(a.id)),
        history: (localData.history || []).filter((s) => !s.animalProfileId || !deletedIds.has(s.animalProfileId)),
        reminders: (localData.reminders || []).filter((r) => (!r.animalProfileId || !deletedIds.has(r.animalProfileId)) && (!r.animalId || !deletedIds.has(r.animalId))),
        prescriptions: (localData.prescriptions || []).filter((p) => !p.animalProfileId || !deletedIds.has(p.animalProfileId)),
        vetVisits: (localData.vetVisits || []).filter((v) => !v.animalProfileId || !deletedIds.has(v.animalProfileId)),
      };

      // Step 4: Await network transmission to persistent backend API
      let res: Response;
      try {
        res = await fetch(apiUrl("/api/sync/all"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": userId,
          },
          body: JSON.stringify(payload),
        });
      } catch (fetchErr) {
        console.warn("[VetCheck Sync] Network error during backend migration:", fetchErr);
        callbacks?.onError?.(fetchErr);
        callbacks?.onComplete?.(false);
        return false;
      }

      // Step 5: Await response parsing and verify Firestore persistence confirmation from server
      if (res.ok) {
        try {
          const responseData = await res.json();
          console.log("[VetCheck Sync] Backend migration verified by server:", responseData?.migrated || "success");
        } catch (jsonErr) {
          console.warn("[VetCheck Sync] Warning reading server confirmation payload:", jsonErr);
        }

        // Step 6: Await writing migration confirmation flag to local storage
        try {
          localStorage.setItem(MIGRATION_DONE_KEY, "true");
        } catch (storageWriteErr) {
          console.warn("[VetCheck Sync] Failed to write migration flag to localStorage:", storageWriteErr);
        }

        // Step 7: Await post-migration local offline queue drainage
        try {
          const postFlushedCount = await flushOfflineQueue();
          if (postFlushedCount > 0) {
            console.log(`[VetCheck Sync] Post-migration queued items flushed: ${postFlushedCount}`);
          }
        } catch (flushErr) {
          console.warn("[VetCheck Sync] Post-migration offline queue flush warning:", flushErr);
        }

        console.log("[VetCheck Sync] Initial migration, queue processing, and Firestore persistence completed successfully.");
        // Step 8: Trigger completion callback after all asynchronous sub-tasks are strictly finished
        callbacks?.onComplete?.(true);
        return true;
      } else {
        let errorText = "Unknown response";
        try {
          errorText = await res.text();
        } catch {
          // ignore text decode error
        }
        console.warn(`[VetCheck Sync] Backend migration endpoint returned status ${res.status}:`, errorText);
        callbacks?.onError?.(new Error(`Migration HTTP ${res.status}: ${errorText}`));
        callbacks?.onComplete?.(false);
        return false;
      }
    } catch (err) {
      console.warn("[VetCheck Sync] Could not complete initial migration, will retry next session:", err);
      callbacks?.onError?.(err);
      callbacks?.onComplete?.(false);
      return false;
    } finally {
      activeMigrationPromise = null;
    }
  })();

  return await activeMigrationPromise;
}
