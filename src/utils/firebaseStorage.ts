import { initializeApp, getApps, getApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import firebaseConfig from "../../firebase-applet-config.json";
import { apiUrl } from "../config/api";
import { getOrCreateAnonymousUserId } from "./backendSync";

let clientStorage: any = null;

function getClientFirebaseStorage() {
  if (clientStorage) return clientStorage;
  if (typeof window === "undefined") return null;

  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const bucket = firebaseConfig.storageBucket || `${firebaseConfig.projectId}.firebasestorage.app`;
    clientStorage = getStorage(app, bucket ? `gs://${bucket}` : undefined);
    return clientStorage;
  } catch (err) {
    console.warn("[VetCheck Client Storage] Firebase storage init error:", err);
    return null;
  }
}

/**
 * Uploads a base64 image data URL to Firebase Storage.
 * Falls back to server upload route if client direct upload is blocked.
 */
export async function uploadImageToStorage(
  imageBase64: string,
  folder: string = "scans",
  filename?: string
): Promise<string | null> {
  if (!imageBase64 || typeof imageBase64 !== "string") return null;

  // If already a remote URL (http/https), return as is
  if (imageBase64.startsWith("http://") || imageBase64.startsWith("https://")) {
    return imageBase64;
  }

  const userId = getOrCreateAnonymousUserId();
  const safeFilename = filename || `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.jpg`;
  const storagePath = `${folder}/${userId}/${safeFilename}`;

  // 1. Try client Firebase Storage SDK
  try {
    const storage = getClientFirebaseStorage();
    if (storage) {
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, "");
      const binaryStr = window.atob(cleanBase64);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "image/jpeg" });
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, blob, {
        contentType: "image/jpeg",
        customMetadata: { uploadedAt: new Date().toISOString() },
      });

      const downloadUrl = await getDownloadURL(storageRef);
      console.log(`[VetCheck Client Storage] Uploaded to Firebase Storage: ${downloadUrl}`);
      return downloadUrl;
    }
  } catch (clientErr) {
    console.warn("[VetCheck Client Storage] Client SDK upload failed, trying server API route:", clientErr);
  }

  // 2. Fallback to server /api/storage/upload route
  try {
    const res = await fetch(apiUrl("/api/storage/upload"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({
        imageBase64,
        folder,
        filename: safeFilename,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        return data.url;
      }
    }
  } catch (serverErr) {
    console.warn("[VetCheck Storage] Server route upload error:", serverErr);
  }

  return null;
}
