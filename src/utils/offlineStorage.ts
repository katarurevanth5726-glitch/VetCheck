/**
 * IndexedDB storage utility for large binary / base64 image data in VetCheck.
 * Prevents LocalStorage QuotaExceededError while enabling offline persistent access to high-res scan photos.
 */

const DB_NAME = "vetcheck_indexed_db";
const DB_VERSION = 1;
const STORE_NAME = "scan_images";

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.reject(new Error("IndexedDB is not supported in this environment."));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      console.warn("[VetCheck IndexedDB] Database open error:", (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

export interface ScanImagePayload {
  id: string; // screening record id
  imageThumbnail?: string;
  allImages?: { type: string; url: string; base64?: string }[];
  timestamp: number;
}

export async function saveScanImagesToIndexedDB(payload: ScanImagePayload): Promise<boolean> {
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(payload);

      req.onsuccess = () => resolve(true);
      req.onerror = () => {
        console.warn("[VetCheck IndexedDB] Save scan images error:", req.error);
        resolve(false);
      };
    });
  } catch (err) {
    console.warn("[VetCheck IndexedDB] Could not save to IndexedDB:", err);
    return false;
  }
}

export async function getScanImagesFromIndexedDB(id: string): Promise<ScanImagePayload | null> {
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function deleteScanImagesFromIndexedDB(id: string): Promise<boolean> {
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
