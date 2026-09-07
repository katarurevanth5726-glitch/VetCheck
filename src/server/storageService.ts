import fs from "fs";
import path from "path";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  FirebaseStorage,
} from "firebase/storage";

let storage: FirebaseStorage | null = null;
let isInitialized = false;

function loadFirebaseConfig() {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      return JSON.parse(raw);
    } catch (e) {
      console.warn("[VetCheck Storage] Error parsing firebase-applet-config.json:", e);
    }
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT,
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "vetcheck-a547e.firebasestorage.app",
    firestoreDatabaseId: process.env.FIRESTORE_DATABASE_ID,
  };
}

export function getFirebaseStorage(): FirebaseStorage | null {
  if (storage) return storage;
  if (isInitialized && !storage) return null;

  try {
    const config = loadFirebaseConfig();
    if (!config || !config.projectId) {
      console.warn("[VetCheck Storage] No Firebase configuration found for Firebase Storage.");
      isInitialized = true;
      return null;
    }

    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    const bucket = config.storageBucket || `${config.projectId}.firebasestorage.app`;
    storage = getStorage(app, bucket ? `gs://${bucket}` : undefined);
    console.log(`[VetCheck Storage] Connected to Firebase Storage (Bucket: ${bucket})`);
    isInitialized = true;
    return storage;
  } catch (err) {
    console.warn("[VetCheck Storage] Failed to initialize Firebase Storage:", err);
    isInitialized = true;
    return null;
  }
}

export function isBase64Image(str: any): boolean {
  if (typeof str !== "string" || !str) return false;
  if (str.startsWith("data:image/")) return true;
  // If it's a very long string without URL protocol, check if it looks like raw base64
  if (!str.startsWith("http://") && !str.startsWith("https://") && str.length > 500) {
    return /^[A-Za-z0-9+/=]+$/.test(str.slice(0, 100));
  }
  return false;
}

export function parseBase64Image(dataString: string): { buffer: Buffer; mimeType: string } | null {
  try {
    let mimeType = "image/jpeg";
    let base64Data = dataString.trim();

    const dataUriMatch = base64Data.match(/^data:(image\/[a-zA-Z0-9+]+);base64,(.+)$/s);
    if (dataUriMatch) {
      mimeType = dataUriMatch[1];
      base64Data = dataUriMatch[2];
    } else {
      base64Data = base64Data.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, "");
    }

    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length === 0) return null;
    return { buffer, mimeType };
  } catch (err) {
    console.warn("[VetCheck Storage] Error decoding base64 image:", err);
    return null;
  }
}

/**
 * Uploads a base64 image to Firebase Storage and returns its public download URL.
 */
export async function uploadBase64ToFirebaseStorage(
  base64Data: string,
  storagePath: string
): Promise<string | null> {
  const firebaseStorage = getFirebaseStorage();
  if (!firebaseStorage) {
    console.warn("[VetCheck Storage] Firebase Storage not initialized. Skipping upload.");
    return null;
  }

  const parsed = parseBase64Image(base64Data);
  if (!parsed) {
    console.warn("[VetCheck Storage] Invalid base64 image data for path:", storagePath);
    return null;
  }

  try {
    const storageRef = ref(firebaseStorage, storagePath);
    const metadata = {
      contentType: parsed.mimeType,
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        source: "VetCheck App",
      },
    };

    // Upload the byte buffer
    await uploadBytes(storageRef, parsed.buffer, metadata);
    const downloadUrl = await getDownloadURL(storageRef);
    console.log(`[VetCheck Storage] Successfully uploaded image to Firebase Storage: ${storagePath} -> ${downloadUrl}`);
    return downloadUrl;
  } catch (err) {
    console.warn(`[VetCheck Storage] Failed to upload image to ${storagePath}:`, err);
    return null;
  }
}

/**
 * Ensures all scan images (thumbnail, all multi-angle photos, follow-up photos)
 * are uploaded to Firebase Storage and only clean download URLs are returned.
 * Strictly removes raw base64 data strings before saving to Firestore.
 */
export async function sanitizeScanImagesForFirestore(scan: any, userId: string): Promise<any> {
  if (!scan) return scan;
  const scanId = scan.id || "scan-" + Date.now();
  const sanitized = { ...scan };

  // 1. Process main image thumbnail
  if (isBase64Image(sanitized.imageThumbnail)) {
    const storagePath = `scans/${userId}/${scanId}/thumbnail.jpg`;
    const uploadedUrl = await uploadBase64ToFirebaseStorage(sanitized.imageThumbnail, storagePath);
    if (uploadedUrl) {
      sanitized.imageThumbnail = uploadedUrl;
    }
  }

  // 2. Process all multi-photo images array
  if (Array.isArray(sanitized.allImages) && sanitized.allImages.length > 0) {
    sanitized.allImages = await Promise.all(
      sanitized.allImages.map(async (img: any, index: number) => {
        const item = { ...img };
        const rawBase64 = item.base64 || (isBase64Image(item.url) ? item.url : null);

        if (rawBase64 && isBase64Image(rawBase64)) {
          const typeName = (item.type || `angle_${index}`).replace(/[^a-zA-Z0-9_-]/g, "_");
          const storagePath = `scans/${userId}/${scanId}/photo_${index}_${typeName}.jpg`;
          const uploadedUrl = await uploadBase64ToFirebaseStorage(rawBase64, storagePath);
          if (uploadedUrl) {
            item.url = uploadedUrl;
          }
        }

        // CRITICAL: Strip raw base64 strings so document fields in Firestore only contain metadata & URL
        delete item.base64;
        return item;
      })
    );
  }

  // 3. Process follow-up log images
  if (Array.isArray(sanitized.followUps) && sanitized.followUps.length > 0) {
    sanitized.followUps = await Promise.all(
      sanitized.followUps.map(async (fl: any, index: number) => {
        const followUp = { ...fl };
        const rawImg = followUp.followUpImageBase64 || (isBase64Image(followUp.followUpImage) ? followUp.followUpImage : null);

        if (rawImg && isBase64Image(rawImg)) {
          const followUpId = followUp.id || `fl_${index}_${Date.now()}`;
          const storagePath = `followups/${userId}/${scanId}_${followUpId}.jpg`;
          const uploadedUrl = await uploadBase64ToFirebaseStorage(rawImg, storagePath);
          if (uploadedUrl) {
            followUp.followUpImage = uploadedUrl;
          }
        }

        // CRITICAL: Strip raw base64 fields from follow-up sub-objects
        delete followUp.followUpImageBase64;
        return followUp;
      })
    );
  }

  return sanitized;
}

/**
 * Ensures animal profile photo is uploaded to Firebase Storage and only the
 * download URL is stored in Firestore.
 */
export async function sanitizeAnimalImagesForFirestore(animal: any, userId: string): Promise<any> {
  if (!animal) return animal;
  const animalId = animal.id || animal.animalId || "animal-" + Date.now();
  const sanitized = { ...animal };

  if (isBase64Image(sanitized.photoUri)) {
    const storagePath = `animals/${userId}/${animalId}/photo.jpg`;
    const uploadedUrl = await uploadBase64ToFirebaseStorage(sanitized.photoUri, storagePath);
    if (uploadedUrl) {
      sanitized.photoUri = uploadedUrl;
    }
  }

  return sanitized;
}
