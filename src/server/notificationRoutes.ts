import express from "express";
import {
  getVapidPublicKey,
  saveSubscription,
  removeSubscription,
  getAllSubscriptions,
  sendWebPushToSubscription,
  broadcastPush,
} from "./pushService";
import {
  saveServerReminder,
  deleteServerReminder,
  completeServerReminder,
  syncClientReminders,
  getAllServerReminders,
} from "./reminderStore";
import { processDueReminders } from "./scheduler";

const router = express.Router();

/**
 * GET /api/notifications/vapid-public-key
 * Returns the VAPID public key needed by client's PushManager.subscribe()
 */
router.get("/api/notifications/vapid-public-key", (req, res) => {
  const publicKey = getVapidPublicKey();
  res.json({
    publicKey,
    configured: Boolean(publicKey),
    subject: "mailto:support@vetcheck.app",
  });
});

/**
 * POST /api/notifications/subscribe
 * Registers or updates a client push subscription
 */
router.post("/api/notifications/subscribe", (req, res) => {
  const { subscription, userId, deviceId, timezone, language, categories } = req.body;

  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({ error: "Invalid push subscription object provided." });
  }

  const saved = saveSubscription({
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    userId,
    deviceId,
    timezone,
    language,
    categories,
  });

  res.json({
    success: true,
    subscriptionId: saved.id,
    message: "Push subscription registered for background care reminders.",
  });
});

/**
 * POST /api/notifications/unsubscribe
 * Unregisters a client push subscription
 */
router.post("/api/notifications/unsubscribe", (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    return res.status(400).json({ error: "Missing endpoint for unsubscribe." });
  }

  const removed = removeSubscription(endpoint);
  res.json({ success: true, removed });
});

/**
 * POST /api/notifications/test-push
 * Dispatches an instant test push notification to verify background delivery
 */
router.post("/api/notifications/test-push", async (req, res) => {
  const { subscription, animalName = "Rocky", reminderType = "vaccination", language = "en" } = req.body;

  const testPayload = {
    title: "💉 Test Care Reminder",
    body: `${animalName}'s vaccination reminder is working! You will receive background alerts on schedule.`,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: `vetcheck-test-${Date.now()}`,
    data: {
      url: "/?tab=my-animals",
      animalName,
      reminderType,
      targetTab: "my-animals",
    },
  };

  if (subscription && subscription.endpoint && subscription.keys) {
    const result = await sendWebPushToSubscription(subscription, testPayload);
    return res.json({
      success: result.success,
      statusCode: result.statusCode,
      error: result.error,
      message: result.success
        ? "Test notification dispatched to your device."
        : "Failed to deliver test notification.",
    });
  }

  // If no single subscription passed, broadcast to all active device subscriptions
  const broadcastResult = await broadcastPush(testPayload);
  res.json({
    success: broadcastResult.sent > 0,
    sentCount: broadcastResult.sent,
    failedCount: broadcastResult.failed,
    message: `Dispatched test push to ${broadcastResult.sent} active device(s).`,
  });
});

/**
 * GET /api/notifications/status
 * Returns system push status and active subscription count
 */
router.get("/api/notifications/status", (req, res) => {
  const subs = getAllSubscriptions();
  const reminders = getAllServerReminders();
  const pendingReminders = reminders.filter((r) => r.status === "pending" && !r.notificationSent);

  res.json({
    pushSupported: true,
    vapidConfigured: Boolean(getVapidPublicKey()),
    activeSubscriptionsCount: subs.length,
    totalTrackedReminders: reminders.length,
    pendingDueReminders: pendingReminders.length,
    schedulerRunning: true,
  });
});

/**
 * POST /api/reminders/sync
 * Syncs the client's local care reminders list to the server scheduler
 */
router.post("/api/reminders/sync", (req, res) => {
  const { reminders, userId, timezone, language } = req.body;

  if (!Array.isArray(reminders)) {
    return res.status(400).json({ error: "Reminders must be an array." });
  }

  const synced = syncClientReminders(reminders, userId, timezone, language);
  res.json({
    success: true,
    syncedCount: synced.length,
    reminders: synced,
  });
});

/**
 * POST /api/reminders/create
 * Creates a single server-scheduled reminder
 */
router.post("/api/reminders/create", (req, res) => {
  const reminderData = req.body;
  if (!reminderData.title || !reminderData.scheduledDate || !reminderData.animalName) {
    return res.status(400).json({ error: "Missing title, scheduledDate, or animalName." });
  }

  const saved = saveServerReminder(reminderData);
  res.json({ success: true, reminder: saved });
});

/**
 * PUT /api/reminders/:id
 * Updates a server-scheduled reminder
 */
router.put("/api/reminders/:id", (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const saved = saveServerReminder({ ...updates, reminderId: id });
  res.json({ success: true, reminder: saved });
});

/**
 * DELETE /api/reminders/:id
 * Deletes a scheduled reminder and cancels notifications
 */
router.delete("/api/reminders/:id", (req, res) => {
  const { id } = req.params;
  const removed = deleteServerReminder(id);
  res.json({ success: true, removed });
});

/**
 * POST /api/reminders/:id/complete
 * Marks a reminder completed and cancels future push notifications
 */
router.post("/api/reminders/:id/complete", (req, res) => {
  const { id } = req.params;
  const completed = completeServerReminder(id);
  res.json({ success: true, reminder: completed });
});

/**
 * POST /api/reminders/trigger-check
 * Manually invokes the scheduler loop for immediate testing
 */
router.post("/api/reminders/trigger-check", async (req, res) => {
  const result = await processDueReminders();
  res.json({
    success: true,
    processedCount: result.processedCount,
    notificationsSent: result.notificationsSent,
  });
});

export default router;
