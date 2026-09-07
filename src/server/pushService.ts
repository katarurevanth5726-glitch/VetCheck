import webpush from "web-push";
import fs from "fs";
import path from "path";
import {
  dbGetPushSubscriptions,
  dbSavePushSubscription,
  dbDeletePushSubscription,
} from "./db";

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface StoredPushSubscription {
  id: string;
  userId?: string;
  deviceId?: string;
  endpoint: string;
  keys: PushSubscriptionKeys;
  timezone: string;
  language: string;
  categories: {
    careReminders: boolean;
    vaccination: boolean;
    deworming: boolean;
    vetFollowUp: boolean;
    recovery: boolean;
  };
  createdAt: number;
  lastActive: number;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url?: string;
    animalId?: string;
    animalName?: string;
    reminderId?: string;
    reminderType?: string;
    targetTab?: string;
  };
}

// In-memory subscriptions store for high performance
const subscriptionsMap = new Map<string, StoredPushSubscription>();

// Normalize and ensure unpadded URL-safe base64 string for VAPID public/private keys
function cleanVapidKey(key?: string, type?: "public" | "private"): string {
  if (!key || typeof key !== "string") return "";
  let raw = key.trim();

  // 1. If input is a JSON object or string, attempt to parse or extract fields
  if (raw.startsWith("{") && raw.endsWith("}")) {
    try {
      const parsed = JSON.parse(raw);
      if (type === "public" && parsed.publicKey) raw = parsed.publicKey;
      else if (type === "private" && parsed.privateKey) raw = parsed.privateKey;
      else if (parsed.key) raw = parsed.key;
    } catch {
      // ignore JSON parse error and proceed with regex extraction
    }
  }

  // 2. Extract from JSON-like or key-value fragments (e.g. `privateKey":"..."` or `publicKey: "..."`)
  if (type === "private") {
    const jsonMatch = raw.match(/"?privateKey"?\s*[:=]\s*["\x27]?([A-Za-z0-9\-_+/=]+)["\x27]?/i);
    if (jsonMatch && jsonMatch[1]) raw = jsonMatch[1];
  } else if (type === "public") {
    const jsonMatch = raw.match(/"?publicKey"?\s*[:=]\s*["\x27]?([A-Za-z0-9\-_+/=]+)["\x27]?/i);
    if (jsonMatch && jsonMatch[1]) raw = jsonMatch[1];
  }

  // 3. Remove escaped quotes, surrounding quotes, whitespace, and convert standard Base64 to URL-Safe Base64
  let cleaned = raw
    .replace(/\\"/g, "")
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
    .trim();

  // 4. Exact length extraction if type is specified
  if (type === "private") {
    // 32-byte scalar encoded in base64url is 43 characters
    const match = cleaned.match(/[A-Za-z0-9\-_]{43}/);
    if (match) {
      try {
        const buf = Buffer.from(match[0], "base64url");
        if (buf.length === 32) return match[0];
      } catch {
        // continue
      }
    }
  } else if (type === "public") {
    // 65-byte uncompressed EC point encoded in base64url is 87 characters
    const match = cleaned.match(/[A-Za-z0-9\-_]{87}/);
    if (match) {
      try {
        const buf = Buffer.from(match[0], "base64url");
        if (buf.length === 65) return match[0];
      } catch {
        // continue
      }
    }
  }

  // 5. Clean any non-URL-safe base64 characters
  return cleaned.replace(/[^A-Za-z0-9\-_]/g, "");
}

// VAPID Keys Initialization
let vapidPublicKey = cleanVapidKey(process.env.VAPID_PUBLIC_KEY, "public");
let vapidPrivateKey = cleanVapidKey(process.env.VAPID_PRIVATE_KEY, "private");
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:support@vetcheck.app";

// Cached VAPID keys file for local fallback
const VAPID_CACHE_PATH = path.join(process.cwd(), ".vapid-keys.json");

function trySetVapidDetails(pub: string, priv: string): boolean {
  const cleanPub = cleanVapidKey(pub, "public");
  const cleanPriv = cleanVapidKey(priv, "private");
  if (!cleanPub || !cleanPriv) return false;
  try {
    webpush.setVapidDetails(vapidSubject, cleanPub, cleanPriv);
    vapidPublicKey = cleanPub;
    vapidPrivateKey = cleanPriv;
    return true;
  } catch (err) {
    console.warn("[VetCheck Push] VAPID pair validation notice:", (err as Error)?.message || err);
    return false;
  }
}

function initVapidKeys() {
  // 1. Try environment variables
  if (vapidPublicKey && vapidPrivateKey) {
    if (trySetVapidDetails(vapidPublicKey, vapidPrivateKey)) {
      console.log("[VetCheck Push] VAPID keys from environment configured successfully.");
      return;
    }
  }

  // 2. Try cached keys file
  try {
    if (fs.existsSync(VAPID_CACHE_PATH)) {
      const cached = JSON.parse(fs.readFileSync(VAPID_CACHE_PATH, "utf-8"));
      if (cached.publicKey && cached.privateKey) {
        if (trySetVapidDetails(cached.publicKey, cached.privateKey)) {
          console.log("[VetCheck Push] Loaded and validated cached VAPID keys from .vapid-keys.json");
          return;
        }
      }
    }
  } catch (e) {
    console.warn("[VetCheck Push] Could not read cached VAPID file, generating fresh pair:", e);
  }

  // 3. Generate fresh valid pair
  try {
    const generated = webpush.generateVAPIDKeys();
    const cleanPub = cleanVapidKey(generated.publicKey, "public");
    const cleanPriv = cleanVapidKey(generated.privateKey, "private");

    if (trySetVapidDetails(cleanPub, cleanPriv)) {
      console.log("[VetCheck Push] Generated and set fresh runtime VAPID keys.");
      try {
        fs.writeFileSync(
          VAPID_CACHE_PATH,
          JSON.stringify({ publicKey: cleanPub, privateKey: cleanPriv }, null, 2),
          "utf-8"
        );
      } catch (err) {
        console.warn("[VetCheck Push] Note: Could not write .vapid-keys.json (using memory store):", err);
      }
    }
  } catch (err) {
    console.error("[VetCheck Push] Failed to generate VAPID keys:", err);
  }
}

initVapidKeys();

// Hydrate push subscriptions from persistent Firestore on startup
async function hydratePushSubscriptionsFromDb() {
  try {
    const dbSubs = await dbGetPushSubscriptions();
    if (dbSubs && Array.isArray(dbSubs)) {
      dbSubs.forEach((sub: StoredPushSubscription) => {
        if (sub && sub.endpoint) {
          subscriptionsMap.set(sub.endpoint, sub);
        }
      });
      console.log(`[VetCheck Push] Hydrated ${dbSubs.length} push subscriptions from Firestore database.`);
    }
  } catch (err) {
    console.warn("[VetCheck Push] Could not hydrate subscriptions from database:", err);
  }
}

// Kick off hydration asynchronously
hydratePushSubscriptionsFromDb();

export function getVapidPublicKey(): string {
  return vapidPublicKey;
}

export function saveSubscription(payload: {
  endpoint: string;
  keys: PushSubscriptionKeys;
  userId?: string;
  deviceId?: string;
  timezone?: string;
  language?: string;
  categories?: {
    careReminders?: boolean;
    vaccination?: boolean;
    deworming?: boolean;
    vetFollowUp?: boolean;
    recovery?: boolean;
  };
}): StoredPushSubscription {
  const existing = subscriptionsMap.get(payload.endpoint);
  const now = Date.now();

  const record: StoredPushSubscription = {
    id: existing?.id || "sub-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
    userId: payload.userId || existing?.userId || "user-default",
    deviceId: payload.deviceId || existing?.deviceId || "device-default",
    endpoint: payload.endpoint,
    keys: payload.keys,
    timezone: payload.timezone || existing?.timezone || "UTC",
    language: payload.language || existing?.language || "en",
    categories: {
      careReminders: payload.categories?.careReminders ?? existing?.categories?.careReminders ?? true,
      vaccination: payload.categories?.vaccination ?? existing?.categories?.vaccination ?? true,
      deworming: payload.categories?.deworming ?? existing?.categories?.deworming ?? true,
      vetFollowUp: payload.categories?.vetFollowUp ?? existing?.categories?.vetFollowUp ?? true,
      recovery: payload.categories?.recovery ?? existing?.categories?.recovery ?? true,
    },
    createdAt: existing?.createdAt || now,
    lastActive: now,
  };

  subscriptionsMap.set(payload.endpoint, record);
  // Persist asynchronously to Firestore
  dbSavePushSubscription(record).catch((err) => {
    console.warn("[VetCheck Push] Async Firestore subscription save error:", err);
  });

  console.log(`[VetCheck Push] Saved subscription for user: ${record.userId} (Total active: ${subscriptionsMap.size})`);
  return record;
}

export function removeSubscription(endpoint: string): boolean {
  const removed = subscriptionsMap.delete(endpoint);
  if (removed) {
    dbDeletePushSubscription(endpoint).catch((err) => {
      console.warn("[VetCheck Push] Async Firestore subscription delete error:", err);
    });
    console.log(`[VetCheck Push] Removed subscription: ${endpoint.substring(0, 30)}... (Remaining: ${subscriptionsMap.size})`);
  }
  return removed;
}

export function getAllSubscriptions(): StoredPushSubscription[] {
  return Array.from(subscriptionsMap.values());
}

export function getSubscriptionsForUser(userId: string): StoredPushSubscription[] {
  return Array.from(subscriptionsMap.values()).filter((s) => s.userId === userId);
}

export async function sendWebPushToSubscription(
  sub: StoredPushSubscription | { endpoint: string; keys: PushSubscriptionKeys },
  payload: PushNotificationPayload
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: sub.keys,
    };

    const pushOptions = {
      TTL: 60 * 60 * 24, // 24 hours
      urgency: "high" as const,
    };

    const result = await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload),
      pushOptions
    );

    console.log(`[VetCheck Push] Successfully delivered push to ${sub.endpoint.substring(0, 30)}... Status: ${result.statusCode}`);
    return { success: true, statusCode: result.statusCode };
  } catch (err: any) {
    const statusCode = err?.statusCode || err?.status || 500;
    console.warn(`[VetCheck Push] Push dispatch failed (${statusCode}):`, err?.message || err);

    // If subscription is 404 or 410 (Gone), clean up obsolete subscription
    if (statusCode === 404 || statusCode === 410) {
      console.log(`[VetCheck Push] Subscription expired / unsubscribed. Removing from active store.`);
      removeSubscription(sub.endpoint);
    }

    return {
      success: false,
      statusCode,
      error: err?.message || "Failed to deliver push notification.",
    };
  }
}

export async function broadcastPush(
  payload: PushNotificationPayload,
  filterCategory?: "vaccination" | "deworming" | "vetFollowUp" | "recovery" | "careReminders"
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  const targets = Array.from(subscriptionsMap.values()).filter((sub) => {
    if (!sub.categories.careReminders) return false;
    if (filterCategory && !sub.categories[filterCategory]) return false;
    return true;
  });

  console.log(`[VetCheck Push] Broadcasting push to ${targets.length} target subscriptions.`);

  await Promise.all(
    targets.map(async (sub) => {
      const res = await sendWebPushToSubscription(sub, payload);
      if (res.success) sent++;
      else failed++;
    })
  );

  return { sent, failed };
}
