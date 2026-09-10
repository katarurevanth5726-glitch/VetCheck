// VetCheck Progressive Web App Service Worker
// Version: 1.2.0 - Push Notifications & Offline Support

const CACHE_NAME = "vetcheck-pwa-cache-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.json",
];

// 1. Install Event: Cache essential assets & immediately activate
self.addEventListener("install", (event) => {
  console.log("[VetCheck SW] Service Worker installing...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[VetCheck SW] Pre-caching core shell assets");
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn("[VetCheck SW] Pre-cache warning (non-fatal):", err);
        return self.skipWaiting();
      })
  );
});

// 2. Activate Event: Clean up old caches & take immediate control of clients
self.addEventListener("activate", (event) => {
  console.log("[VetCheck SW] Service Worker activating...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              console.log("[VetCheck SW] Deleting obsolete cache:", name);
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Network first with Cache fallback for app shell
self.addEventListener("fetch", (event) => {
  // Never intercept API routes, external endpoints, or Vite dev server modules
  const url = new URL(event.request.url);
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/@") ||
    url.pathname.startsWith("/src/") ||
    url.pathname.includes("node_modules") ||
    url.pathname.endsWith(".tsx") ||
    url.pathname.endsWith(".ts") ||
    event.request.method !== "GET"
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache successful responses for static assets
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.pathname.endsWith(".js") ||
            url.pathname.endsWith(".css") ||
            url.pathname.endsWith(".svg") ||
            url.pathname.endsWith(".png") ||
            url.pathname === "/")
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Fallback to cache if offline
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate") {
          const fallback = (await caches.match("/index.html")) || (await caches.match("/"));
          if (fallback) return fallback;
        }
        return new Response("Offline", { status: 503, statusText: "Offline" });
      })
  );
});

// 4. Push Event: Background Push Notification Handler
// Triggered by Web Push / FCM even when VetCheck is completely closed
self.addEventListener("push", (event) => {
  console.log("[VetCheck SW] Push event received:", event);

  let data = {
    title: "💉 VetCheck Reminder",
    body: "You have an upcoming animal care reminder.",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: "vetcheck-general",
    data: {
      url: "/",
      animalId: "",
      reminderId: "",
      reminderType: "general",
    },
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
      if (parsed.data) {
        data.data = { ...data.data, ...parsed.data };
      }
    } catch (err) {
      console.warn("[VetCheck SW] Error parsing push data as JSON, using text fallback:", err);
      const text = event.data.text();
      if (text) {
        data.body = text;
      }
    }
  }

  const notificationOptions = {
    body: data.body,
    icon: data.icon || "/favicon.svg",
    badge: data.badge || "/favicon.svg",
    tag: data.tag || `vetcheck-${data.data?.reminderId || Date.now()}`,
    data: data.data || {},
    vibrate: [100, 50, 100, 50, 150],
    renotify: true,
    requireInteraction: false,
    actions: [
      {
        action: "open",
        title: "🐾 Open VetCheck",
      },
      {
        action: "dismiss",
        title: "Dismiss",
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions)
  );
});

// 5. Notification Click Handler: Deep Link into specific animal / reminder
self.addEventListener("notificationclick", (event) => {
  console.log("[VetCheck SW] Notification clicked:", event.notification.tag, event.action);
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const notificationData = event.notification.data || {};
  let targetUrl = "/";

  if (notificationData.animalId) {
    targetUrl = `/?tab=my-animals&animalId=${encodeURIComponent(notificationData.animalId)}&reminderId=${encodeURIComponent(notificationData.reminderId || "")}&type=${encodeURIComponent(notificationData.reminderType || "")}`;
  } else if (notificationData.url) {
    targetUrl = notificationData.url;
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // If a VetCheck window is already open, focus it and post a navigation message
      for (const client of windowClients) {
        if ("focus" in client) {
          client.postMessage({
            type: "VETCHECK_NOTIFICATION_CLICKED",
            payload: notificationData,
          });
          return client.focus();
        }
      }
      // If no window is open, open a new one pointing to the deep-linked URL
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// 6. Listen for Client Messages
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
