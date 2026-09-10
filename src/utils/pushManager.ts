import { CareReminder } from "../types";
import { getStoredReminders } from "./storage";
import { apiUrl } from "../config/api";

export interface PushCategorySettings {
  careReminders: boolean;
  vaccination: boolean;
  deworming: boolean;
  vetFollowUp: boolean;
  recovery: boolean;
}

export const DEFAULT_NOTIFICATION_CATEGORIES: PushCategorySettings = {
  careReminders: true,
  vaccination: true,
  deworming: true,
  vetFollowUp: true,
  recovery: true,
};

const PUSH_SUBSCRIBED_KEY = "vetcheck_push_subscribed_v1";
const PUSH_CATEGORIES_KEY = "vetcheck_notification_categories_v1";
const PUSH_PROMPT_DISMISSED_KEY = "vetcheck_notification_prompt_dismissed_v1";

export function isPushPromptDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PUSH_PROMPT_DISMISSED_KEY) === "true";
}

export function setPushPromptDismissed(dismissed: boolean = true) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PUSH_PROMPT_DISMISSED_KEY, dismissed ? "true" : "false");
}

export function getStoredNotificationCategories(): PushCategorySettings {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_CATEGORIES;
  try {
    const raw = localStorage.getItem(PUSH_CATEGORIES_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_CATEGORIES;
    return { ...DEFAULT_NOTIFICATION_CATEGORIES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIFICATION_CATEGORIES;
  }
}

export function saveStoredNotificationCategories(categories: PushCategorySettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PUSH_CATEGORIES_KEY, JSON.stringify(categories));
}

function urlBase64ToUint8Array(
  base64String: string
): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);

  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);

  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function checkPushNotificationSupport(): {
  isSupported: boolean;
  serviceWorkerSupported: boolean;
  pushManagerSupported: boolean;
  notificationSupported: boolean;
  permission: NotificationPermission | "unsupported";
} {
  if (typeof window === "undefined") {
    return {
      isSupported: false,
      serviceWorkerSupported: false,
      pushManagerSupported: false,
      notificationSupported: false,
      permission: "unsupported",
    };
  }

  const serviceWorkerSupported = "serviceWorker" in navigator;
  const notificationSupported = "Notification" in window;
  const pushManagerSupported = "PushManager" in window;

  const isSupported = serviceWorkerSupported && notificationSupported && pushManagerSupported;
  const permission = notificationSupported ? Notification.permission : "unsupported";

  return {
    isSupported,
    serviceWorkerSupported,
    pushManagerSupported,
    notificationSupported,
    permission,
  };
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    console.log("[VetCheck SW] Registered with scope:", registration.scope);
    return registration;
  } catch (err) {
    console.warn("[VetCheck SW] Service Worker registration failed:", err);
    return null;
  }
}

export const DEFAULT_VAPID_PUBLIC_KEY =
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBKr3qBUYhHBQFLXYp5Nkoh8U";

export async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch(apiUrl("/api/notifications/vapid-public-key"));
    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const data = await res.json();
      if (data && data.publicKey && typeof data.publicKey === "string") {
        return data.publicKey;
      }
    }
    // Fallback to configured standard public key
    return DEFAULT_VAPID_PUBLIC_KEY;
  } catch (err) {
    console.warn("[VetCheck Push] Could not retrieve VAPID key from server, using public key fallback:", err);
    return DEFAULT_VAPID_PUBLIC_KEY;
  }
}

export async function subscribeToPushNotifications(options?: {
  userId?: string;
  categories?: PushCategorySettings;
  timezone?: string;
  language?: string;
}): Promise<{
  success: boolean;
  permission: NotificationPermission;
  error?: string;
}> {
  const support = checkPushNotificationSupport();
  if (!support.isSupported) {
    return {
      success: false,
      permission: "denied",
      error: "Background push notifications are not supported by this browser or environment.",
    };
  }

  try {
    // 1. Request explicit Notification permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      localStorage.setItem(PUSH_SUBSCRIBED_KEY, "false");
      return {
        success: false,
        permission,
        error: "Notification permission was not granted.",
      };
    }

    // 2. Ensure Service Worker is registered
    const registration = await registerServiceWorker();
    if (!registration) {
      return {
        success: false,
        permission,
        error: "Service worker registration failed.",
      };
    }

    // 3. Fetch server VAPID key
    const publicKey = (await fetchVapidPublicKey()) || DEFAULT_VAPID_PUBLIC_KEY;

    // 4. Subscribe via PushManager
    const convertedKey = urlBase64ToUint8Array(publicKey);
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });
    }

    const categories = options?.categories || getStoredNotificationCategories();
    const userTimezone = options?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
    const language = options?.language || "en";

    // 5. Send subscription to server if available
    try {
      const response = await fetch(apiUrl("/api/notifications/subscribe"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userId: options?.userId || "user-default",
          timezone: userTimezone,
          language,
          categories,
        }),
      });

      if (!response.ok) {
        console.warn(`[VetCheck Push] Server subscription registration returned status ${response.status}`);
      }
    } catch (syncErr) {
      console.warn("[VetCheck Push] Server subscription sync warning (local push remains active):", syncErr);
    }

    localStorage.setItem(PUSH_SUBSCRIBED_KEY, "true");
    saveStoredNotificationCategories(categories);
    setPushPromptDismissed(true);

    // Sync any existing reminders to the server scheduler
    const existingReminders = getStoredReminders();
    if (existingReminders.length > 0) {
      syncRemindersToServer(existingReminders, options?.userId, userTimezone, language);
    }

    return {
      success: true,
      permission: "granted",
    };
  } catch (err: any) {
    console.error("[VetCheck Push] Failed to subscribe to push notifications:", err);
    return {
      success: false,
      permission: Notification.permission,
      error: err.message || "Failed to subscribe to push notifications.",
    };
  }
}

export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // Inform server
        await fetch(apiUrl("/api/notifications/unsubscribe"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
    }
    localStorage.setItem(PUSH_SUBSCRIBED_KEY, "false");
    return true;
  } catch (err) {
    console.warn("[VetCheck Push] Unsubscribe error:", err);
    return false;
  }
}

export async function sendTestPushNotification(
  animalName: string = "Rocky",
  reminderType: string = "vaccination",
  language: string = "en"
): Promise<{ success: boolean; message: string }> {
  try {
    let subJson = null;
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        subJson = subscription.toJSON();
      }
    }

    const res = await fetch(apiUrl("/api/notifications/test-push"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: subJson,
        animalName,
        reminderType,
        language,
      }),
    });

    const data = await res.json();
    return {
      success: data.success,
      message: data.message || (data.success ? "Test push sent successfully!" : "Failed to send test push."),
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Network error sending test notification.",
    };
  }
}

export async function syncRemindersToServer(
  reminders: CareReminder[],
  userId: string = "user-default",
  timezone?: string,
  language?: string
): Promise<boolean> {
  try {
    const userTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
    const res = await fetch(apiUrl("/api/reminders/sync"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reminders,
        userId,
        timezone: userTimezone,
        language: language || "en",
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn("[VetCheck Push] Background reminder sync warning:", err);
    return false;
  }
}
