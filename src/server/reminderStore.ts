import fs from "fs";
import path from "path";
import {
  dbGetReminders,
  dbSaveReminder,
  dbDeleteReminder,
  dbMarkReminderSent,
} from "./db";

export type ReminderType =
  | "vaccination"
  | "deworming"
  | "vet_followup"
  | "recovery_check"
  | "checkup"
  | "wound_observation"
  | "other";

export interface StoredServerReminder {
  reminderId: string;
  userId: string;
  animalId: string;
  animalName: string;
  animalSpecies: string;
  reminderType: ReminderType;
  title: string;
  notes?: string;
  scheduledDate: string; // YYYY-MM-DD
  dueTime: string; // HH:mm (e.g. "09:00")
  timezone: string; // e.g. "Asia/Kolkata", "UTC"
  notifyAdvance: "same_day" | "1_day_before" | "7_days_before";
  scheduledTimestamp: number; // exact UTC timestamp when push should fire
  status: "pending" | "completed" | "cancelled";
  notificationSent: boolean;
  sentAt: number | null;
  language: string;
  createdAt: number;
  updatedAt: number;
}

// In-memory + persistent Firestore & file store for server reminders
const remindersMap = new Map<string, StoredServerReminder>();
const REMINDERS_FILE_PATH = path.join(process.cwd(), ".server-reminders.json");

function loadStoredRemindersFromFile() {
  try {
    if (fs.existsSync(REMINDERS_FILE_PATH)) {
      const data = JSON.parse(fs.readFileSync(REMINDERS_FILE_PATH, "utf-8"));
      if (Array.isArray(data)) {
        data.forEach((item: StoredServerReminder) => {
          remindersMap.set(item.reminderId || (item as any).id, item);
        });
      }
    }
  } catch (err) {
    console.warn("[VetCheck Reminders] Could not load persisted reminders from file:", err);
  }
}

// Hydrate reminders from Firestore database on server boot
async function hydrateRemindersFromDb() {
  try {
    const dbReminders = await dbGetReminders();
    if (dbReminders && Array.isArray(dbReminders)) {
      dbReminders.forEach((item: any) => {
        const id = item.reminderId || item.id;
        if (id) {
          remindersMap.set(id, {
            reminderId: id,
            userId: item.userId || "user-default",
            animalId: item.animalId || item.animalProfileId || "animal-default",
            animalName: item.animalName || "Animal",
            animalSpecies: item.animalSpecies || item.species || "Other",
            reminderType: item.reminderType || "vaccination",
            title: item.title,
            notes: item.notes,
            scheduledDate: item.scheduledDate || item.dueDate,
            dueTime: item.dueTime || "09:00",
            timezone: item.timezone || "Asia/Kolkata",
            notifyAdvance: item.notifyAdvance || "same_day",
            scheduledTimestamp: item.scheduledTimestamp || calculateNotificationTriggerTimestamp(
              item.scheduledDate || item.dueDate,
              item.dueTime || "09:00",
              item.notifyAdvance || "same_day",
              item.timezone || "Asia/Kolkata"
            ),
            status: item.completed ? "completed" : (item.status || "pending"),
            notificationSent: item.notificationSent ?? item.completed ?? false,
            sentAt: item.sentAt || null,
            language: item.language || "en",
            createdAt: item.createdAt || Date.now(),
            updatedAt: item.updatedAt || Date.now(),
          });
        }
      });
      console.log(`[VetCheck Reminders] Hydrated ${dbReminders.length} reminders from Firestore database.`);
    }
  } catch (err) {
    console.warn("[VetCheck Reminders] Could not hydrate reminders from database:", err);
  }
}

function persistRemindersToFile() {
  try {
    const list = Array.from(remindersMap.values());
    fs.writeFileSync(REMINDERS_FILE_PATH, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    // Non-fatal fallback
  }
}

loadStoredRemindersFromFile();
hydrateRemindersFromDb();

/**
 * Calculates the exact UTC timestamp when the notification should fire,
 * respecting the user's specific date (YYYY-MM-DD), time (HH:mm), advance notice, and timezone.
 */
export function calculateNotificationTriggerTimestamp(
  scheduledDate: string,
  dueTime: string = "09:00",
  notifyAdvance: "same_day" | "1_day_before" | "7_days_before" = "same_day",
  userTimezone: string = "UTC"
): number {
  try {
    const [yearStr, monthStr, dayStr] = (scheduledDate || "").split("-");
    const [hourStr, minStr] = (dueTime || "09:00").split(":");

    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);
    const hour = parseInt(hourStr, 10) || 9;
    const minute = parseInt(minStr, 10) || 0;

    let targetDay = day;
    if (notifyAdvance === "1_day_before") {
      targetDay -= 1;
    } else if (notifyAdvance === "7_days_before") {
      targetDay -= 7;
    }

    let targetUtcEpoch = Date.UTC(year, month, targetDay, hour, minute, 0);

    try {
      const tempDate = new Date(targetUtcEpoch);
      const tzFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: userTimezone,
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: false,
      });
      const parts = tzFormatter.formatToParts(tempDate);
      const tzYear = parseInt(parts.find((p) => p.type === "year")?.value || `${year}`, 10);
      const tzMonth = parseInt(parts.find((p) => p.type === "month")?.value || `${month + 1}`, 10) - 1;
      const tzDay = parseInt(parts.find((p) => p.type === "day")?.value || `${targetDay}`, 10);
      const tzHour = parseInt(parts.find((p) => p.type === "hour")?.value || `${hour}`, 10);
      const tzMin = parseInt(parts.find((p) => p.type === "minute")?.value || `${minute}`, 10);

      const formattedInTzAsUtc = Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMin, 0);
      const tzOffsetMs = formattedInTzAsUtc - targetUtcEpoch;
      targetUtcEpoch -= tzOffsetMs;
    } catch {
      // Fallback
    }

    return targetUtcEpoch;
  } catch (err) {
    return new Date(scheduledDate).getTime();
  }
}

export function saveServerReminder(data: Partial<StoredServerReminder> & {
  reminderId?: string;
  id?: string;
  title: string;
  scheduledDate: string;
  animalName: string;
}): StoredServerReminder {
  const reminderId = data.reminderId || data.id || "rem-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
  const existing = remindersMap.get(reminderId);
  const now = Date.now();

  const dueTime = data.dueTime || existing?.dueTime || "09:00";
  const notifyAdvance = data.notifyAdvance || existing?.notifyAdvance || "same_day";
  const timezone = data.timezone || existing?.timezone || "Asia/Kolkata";

  const scheduledTimestamp = calculateNotificationTriggerTimestamp(
    data.scheduledDate,
    dueTime,
    notifyAdvance,
    timezone
  );

  const record: StoredServerReminder = {
    reminderId,
    userId: data.userId || existing?.userId || "user-default",
    animalId: data.animalId || existing?.animalId || "animal-default",
    animalName: data.animalName,
    animalSpecies: data.animalSpecies || existing?.animalSpecies || "Dog",
    reminderType: data.reminderType || existing?.reminderType || "vaccination",
    title: data.title,
    notes: data.notes ?? existing?.notes,
    scheduledDate: data.scheduledDate,
    dueTime,
    timezone,
    notifyAdvance,
    scheduledTimestamp,
    status: data.status || existing?.status || "pending",
    notificationSent: data.status === "completed" ? true : (data.notificationSent ?? existing?.notificationSent ?? false),
    sentAt: existing?.sentAt || null,
    language: data.language || existing?.language || "en",
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  remindersMap.set(reminderId, record);
  persistRemindersToFile();

  // Async persist to Firestore database
  dbSaveReminder(record.userId, {
    ...record,
    id: reminderId,
    dueDate: record.scheduledDate,
  }).catch((err) => {
    console.warn("[VetCheck Reminders] Async Firestore reminder save error:", err);
  });

  console.log(`[VetCheck Reminders] Saved server reminder '${record.title}' for ${record.animalName} (Due: ${record.scheduledDate} ${record.dueTime} ${record.timezone})`);
  return record;
}

export function completeServerReminder(reminderId: string): StoredServerReminder | null {
  const existing = remindersMap.get(reminderId);
  if (!existing) return null;

  existing.status = "completed";
  existing.notificationSent = true;
  existing.updatedAt = Date.now();

  remindersMap.set(reminderId, existing);
  persistRemindersToFile();

  dbSaveReminder(existing.userId, {
    ...existing,
    id: reminderId,
    completed: true,
    status: "completed",
    notificationSent: true,
  }).catch((err) => {
    console.warn("[VetCheck Reminders] Async Firestore reminder complete error:", err);
  });

  console.log(`[VetCheck Reminders] Marked reminder completed: ${reminderId}. Future scheduled notifications cancelled.`);
  return existing;
}

export function deleteServerReminder(reminderId: string): boolean {
  const removed = remindersMap.delete(reminderId);
  if (removed) {
    persistRemindersToFile();
    dbDeleteReminder(reminderId).catch((err) => {
      console.warn("[VetCheck Reminders] Async Firestore reminder delete error:", err);
    });
    console.log(`[VetCheck Reminders] Deleted reminder: ${reminderId}. Scheduled notifications cancelled.`);
  }
  return removed;
}

export function deleteServerRemindersForAnimal(animalId: string, userId?: string): number {
  let count = 0;
  for (const [id, rem] of remindersMap.entries()) {
    if (
      (rem.animalId === animalId || (rem as any).animalProfileId === animalId) &&
      (!userId || rem.userId === userId)
    ) {
      remindersMap.delete(id);
      dbDeleteReminder(id).catch((err) => {
        console.warn("[VetCheck Reminders] Async Firestore reminder delete error:", err);
      });
      count++;
    }
  }
  if (count > 0) {
    persistRemindersToFile();
    console.log(`[VetCheck Reminders] Deleted ${count} server reminders for animal ${animalId}. Future scheduled notifications cancelled.`);
  }
  return count;
}

export function getDueReminders(): StoredServerReminder[] {
  const now = Date.now();
  const due: StoredServerReminder[] = [];

  for (const reminder of remindersMap.values()) {
    if (
      reminder.status === "pending" &&
      !reminder.notificationSent &&
      reminder.scheduledTimestamp <= now
    ) {
      due.push(reminder);
    }
  }

  return due;
}

export function markReminderSent(reminderId: string): void {
  const existing = remindersMap.get(reminderId);
  if (existing) {
    existing.notificationSent = true;
    existing.sentAt = Date.now();
    existing.updatedAt = Date.now();
    remindersMap.set(reminderId, existing);
    persistRemindersToFile();

    dbMarkReminderSent(reminderId).catch((err) => {
      console.warn("[VetCheck Reminders] Async Firestore markReminderSent error:", err);
    });
  }
}

export function getAllServerReminders(): StoredServerReminder[] {
  return Array.from(remindersMap.values());
}

export function syncClientReminders(clientList: any[], userId: string = "user-default", userTimezone: string = "Asia/Kolkata", language: string = "en"): StoredServerReminder[] {
  if (!Array.isArray(clientList)) return [];

  const synced: StoredServerReminder[] = [];
  const clientIds = new Set<string>();

  for (const c of clientList) {
    if (!c || !c.title || (!c.dueDate && !c.scheduledDate)) continue;

    const id = c.id || c.reminderId || "rem-" + Date.now();
    clientIds.add(id);

    let mappedType: ReminderType = "other";
    const rawType = (c.reminderType || c.type || "").toLowerCase();
    if (rawType.includes("vaccin")) mappedType = "vaccination";
    else if (rawType.includes("deworm")) mappedType = "deworming";
    else if (rawType.includes("follow") || rawType.includes("vet")) mappedType = "vet_followup";
    else if (rawType.includes("recovery") || rawType.includes("photo")) mappedType = "recovery_check";
    else if (rawType.includes("checkup")) mappedType = "checkup";

    const saved = saveServerReminder({
      reminderId: id,
      userId,
      animalId: c.animalProfileId || c.animalId || "animal-1",
      animalName: c.animalName || "My Animal",
      animalSpecies: c.species || "Animal",
      reminderType: mappedType,
      title: c.title,
      notes: c.notes,
      scheduledDate: c.dueDate || c.scheduledDate,
      dueTime: c.dueTime || "09:00",
      timezone: userTimezone,
      notifyAdvance: c.notifyAdvance || "same_day",
      status: c.completed ? "completed" : "pending",
      notificationSent: c.completed ? true : false,
      language: language,
    });

    synced.push(saved);
  }

  return synced;
}
