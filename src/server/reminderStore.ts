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
  | "medicine"
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
  status: "pending" | "active" | "paused" | "completed" | "cancelled";
  notificationSent: boolean;
  sentAt: number | null;
  language: string;
  createdAt: number;
  updatedAt: number;

  // Medicine reminder specific fields
  medicineName?: string;
  startDate?: string;
  startTime?: string;
  intervalValue?: number;
  intervalUnit?: "minutes" | "hours" | "days";
  durationType?: "indefinite" | "doses" | "days" | "end_date";
  durationValue?: number;
  endDate?: string;
  active?: boolean;
  dosesGiven?: number;
  lastTriggeredAt?: number;
  nextTriggerTimestamp?: number;
  // Compatibility aliases
  id?: string;
  animalProfileId?: string;
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
          remindersMap.set(item.reminderId || item.id || "", item);
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
          const isMedicine = item.reminderType === "medicine" || item.type === "medicine";
          const rawStatus = item.status || (item.completed ? "completed" : (isMedicine ? "active" : "pending"));
          remindersMap.set(id, {
            reminderId: id,
            userId: item.userId || "user-default",
            animalId: item.animalId || item.animalProfileId || "animal-default",
            animalName: item.animalName || "Animal",
            animalSpecies: item.animalSpecies || item.species || "Other",
            reminderType: item.reminderType || (isMedicine ? "medicine" : "vaccination"),
            title: item.title,
            notes: item.notes,
            scheduledDate: item.scheduledDate || item.startDate || item.dueDate,
            dueTime: item.dueTime || item.startTime || "09:00",
            timezone: item.timezone || "Asia/Kolkata",
            notifyAdvance: item.notifyAdvance || "same_day",
            scheduledTimestamp: item.scheduledTimestamp || (isMedicine && item.intervalValue
              ? calculateNextMedicineTriggerTimestamp(
                  item.startDate || item.scheduledDate || item.dueDate,
                  item.dueTime || item.startTime || "09:00",
                  item.intervalValue || 4,
                  item.intervalUnit || "hours",
                  item.timezone || "Asia/Kolkata"
                )
              : calculateNotificationTriggerTimestamp(
                  item.scheduledDate || item.dueDate,
                  item.dueTime || "09:00",
                  item.notifyAdvance || "same_day",
                  item.timezone || "Asia/Kolkata"
                )),
            status: item.completed ? "completed" : rawStatus,
            notificationSent: item.completed ? true : (item.notificationSent ?? false),
            sentAt: item.sentAt || null,
            language: item.language || "en",
            createdAt: item.createdAt || Date.now(),
            updatedAt: item.updatedAt || Date.now(),
            medicineName: item.medicineName,
            startDate: item.startDate || item.scheduledDate || item.dueDate,
            startTime: item.startTime || item.dueTime || "09:00",
            intervalValue: item.intervalValue,
            intervalUnit: item.intervalUnit,
            durationType: item.durationType,
            durationValue: item.durationValue,
            endDate: item.endDate,
            active: item.active !== undefined ? item.active : !item.completed,
            dosesGiven: item.dosesGiven || 0,
            lastTriggeredAt: item.lastTriggeredAt,
            nextTriggerTimestamp: item.nextTriggerTimestamp,
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

/**
 * Calculates the next UTC timestamp for repeating medicine reminders based on interval.
 */
export function calculateNextMedicineTriggerTimestamp(
  startDateStr: string,
  startTimeStr: string = "08:00",
  intervalValue: number = 4,
  intervalUnit: "minutes" | "hours" | "days" = "hours",
  userTimezone: string = "Asia/Kolkata",
  fromTimestamp?: number
): number {
  try {
    const [year, month, day] = (startDateStr || new Date().toISOString().split("T")[0]).split("-").map(Number);
    const [hour, minute] = (startTimeStr || "08:00").split(":").map(Number);

    let targetUtcEpoch = Date.UTC(year, month - 1, day, hour || 0, minute || 0, 0);

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
      const tzMonth = parseInt(parts.find((p) => p.type === "month")?.value || `${month}`, 10) - 1;
      const tzDay = parseInt(parts.find((p) => p.type === "day")?.value || `${day}`, 10);
      const tzHour = parseInt(parts.find((p) => p.type === "hour")?.value || `${hour}`, 10);
      const tzMin = parseInt(parts.find((p) => p.type === "minute")?.value || `${minute}`, 10);

      const formattedInTzAsUtc = Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMin, 0);
      const tzOffsetMs = formattedInTzAsUtc - targetUtcEpoch;
      targetUtcEpoch -= tzOffsetMs;
    } catch {
      // Fallback
    }

    let stepMs = intervalValue * 60 * 60 * 1000;
    if (intervalUnit === "minutes") stepMs = intervalValue * 60 * 1000;
    else if (intervalUnit === "days") stepMs = intervalValue * 24 * 60 * 60 * 1000;
    if (stepMs <= 0) stepMs = 60 * 60 * 1000;

    const now = fromTimestamp !== undefined ? fromTimestamp : Date.now();
    let current = targetUtcEpoch;
    if (current < now) {
      const elapsed = now - current;
      const stepsToSkip = Math.floor(elapsed / stepMs) + 1;
      current += stepsToSkip * stepMs;
    }

    return current;
  } catch (err) {
    return Date.now() + 60000;
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

  const dueTime = data.dueTime || data.startTime || existing?.dueTime || "09:00";
  const notifyAdvance = data.notifyAdvance || existing?.notifyAdvance || "same_day";
  const timezone = data.timezone || existing?.timezone || "Asia/Kolkata";
  const reminderType = data.reminderType || existing?.reminderType || "vaccination";
  const isMedicine = reminderType === "medicine";

  let scheduledTimestamp = data.scheduledTimestamp;
  if (!scheduledTimestamp) {
    if (isMedicine) {
      scheduledTimestamp = calculateNextMedicineTriggerTimestamp(
        data.startDate || data.scheduledDate,
        dueTime,
        data.intervalValue || 4,
        data.intervalUnit || "hours",
        timezone
      );
    } else {
      scheduledTimestamp = calculateNotificationTriggerTimestamp(
        data.scheduledDate,
        dueTime,
        notifyAdvance,
        timezone
      );
    }
  }

  const status = data.status || (data.notificationSent ? "completed" : (isMedicine ? "active" : "pending"));
  const active = data.active !== undefined ? data.active : (status === "active" || status === "pending");

  const record: StoredServerReminder = {
    reminderId,
    userId: data.userId || existing?.userId || "user-default",
    animalId: data.animalId || existing?.animalId || "animal-default",
    animalName: data.animalName,
    animalSpecies: data.animalSpecies || existing?.animalSpecies || "Dog",
    reminderType,
    title: data.title,
    notes: data.notes ?? existing?.notes,
    scheduledDate: data.scheduledDate || data.startDate || existing?.scheduledDate || new Date().toISOString().split("T")[0],
    dueTime,
    timezone,
    notifyAdvance,
    scheduledTimestamp,
    status,
    notificationSent: status === "completed" ? true : (data.notificationSent ?? existing?.notificationSent ?? false),
    sentAt: existing?.sentAt || null,
    language: data.language || existing?.language || "en",
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    medicineName: data.medicineName || existing?.medicineName,
    startDate: data.startDate || existing?.startDate || data.scheduledDate,
    startTime: data.startTime || existing?.startTime || dueTime,
    intervalValue: data.intervalValue ?? existing?.intervalValue,
    intervalUnit: data.intervalUnit || existing?.intervalUnit || "hours",
    durationType: data.durationType || existing?.durationType || "indefinite",
    durationValue: data.durationValue ?? existing?.durationValue,
    endDate: data.endDate || existing?.endDate,
    active,
    dosesGiven: data.dosesGiven ?? existing?.dosesGiven ?? 0,
    lastTriggeredAt: data.lastTriggeredAt ?? existing?.lastTriggeredAt,
    nextTriggerTimestamp: data.nextTriggerTimestamp ?? scheduledTimestamp,
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

  console.log(`[VetCheck Reminders] Saved server reminder '${record.title}' for ${record.animalName} (Type: ${record.reminderType}, Next: ${new Date(record.scheduledTimestamp).toISOString()})`);
  return record;
}

export function pauseServerReminder(reminderId: string): StoredServerReminder | null {
  const existing = remindersMap.get(reminderId);
  if (!existing) return null;

  existing.status = "paused";
  existing.active = false;
  existing.updatedAt = Date.now();

  remindersMap.set(reminderId, existing);
  persistRemindersToFile();

  dbSaveReminder(existing.userId, {
    ...existing,
    id: reminderId,
    status: "paused",
    active: false,
  }).catch((err) => {
    console.warn("[VetCheck Reminders] Async Firestore reminder pause error:", err);
  });

  console.log(`[VetCheck Reminders] Paused reminder: ${reminderId}. Future scheduled notifications paused.`);
  return existing;
}

export function resumeServerReminder(reminderId: string): StoredServerReminder | null {
  const existing = remindersMap.get(reminderId);
  if (!existing) return null;

  existing.status = "active";
  existing.active = true;
  existing.notificationSent = false;
  if (existing.reminderType === "medicine") {
    existing.scheduledTimestamp = calculateNextMedicineTriggerTimestamp(
      existing.startDate || existing.scheduledDate,
      existing.startTime || existing.dueTime || "08:00",
      existing.intervalValue || 4,
      existing.intervalUnit || "hours",
      existing.timezone
    );
  }
  existing.updatedAt = Date.now();

  remindersMap.set(reminderId, existing);
  persistRemindersToFile();

  dbSaveReminder(existing.userId, {
    ...existing,
    id: reminderId,
    status: "active",
    active: true,
    scheduledTimestamp: existing.scheduledTimestamp,
    notificationSent: false,
  }).catch((err) => {
    console.warn("[VetCheck Reminders] Async Firestore reminder resume error:", err);
  });

  console.log(`[VetCheck Reminders] Resumed reminder: ${reminderId}. Next trigger at ${new Date(existing.scheduledTimestamp).toISOString()}.`);
  return existing;
}

export function completeServerReminder(reminderId: string): StoredServerReminder | null {
  const existing = remindersMap.get(reminderId);
  if (!existing) return null;

  existing.status = "completed";
  existing.active = false;
  existing.notificationSent = true;
  existing.updatedAt = Date.now();

  remindersMap.set(reminderId, existing);
  persistRemindersToFile();

  dbSaveReminder(existing.userId, {
    ...existing,
    id: reminderId,
    completed: true,
    status: "completed",
    active: false,
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
      (rem.animalId === animalId || rem.animalProfileId === animalId) &&
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
    if (reminder.reminderType === "medicine") {
      if (
        (reminder.status === "active" || reminder.status === "pending") &&
        reminder.active !== false &&
        reminder.scheduledTimestamp <= now
      ) {
        due.push(reminder);
      }
    } else {
      if (
        reminder.status === "pending" &&
        !reminder.notificationSent &&
        reminder.scheduledTimestamp <= now
      ) {
        due.push(reminder);
      }
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

export function advanceMedicineReminder(reminderId: string): StoredServerReminder | null {
  const existing = remindersMap.get(reminderId);
  if (!existing || existing.reminderType !== "medicine") return null;

  const now = Date.now();
  const newDosesGiven = (existing.dosesGiven || 0) + 1;
  existing.dosesGiven = newDosesGiven;
  existing.lastTriggeredAt = now;
  existing.sentAt = now;
  existing.updatedAt = now;

  // Check duration completion conditions
  let isComplete = false;
  if (existing.durationType === "doses" && existing.durationValue && newDosesGiven >= existing.durationValue) {
    isComplete = true;
  } else if (existing.durationType === "days" && existing.durationValue && existing.startDate) {
    const [sY, sM, sD] = existing.startDate.split("-").map(Number);
    const startEpoch = new Date(sY, sM - 1, sD).getTime();
    const endEpoch = startEpoch + existing.durationValue * 24 * 60 * 60 * 1000;
    if (now >= endEpoch) isComplete = true;
  } else if (existing.durationType === "end_date" && existing.endDate) {
    const [eY, eM, eD] = existing.endDate.split("-").map(Number);
    const endEpoch = new Date(eY, eM - 1, eD, 23, 59, 59).getTime();
    if (now >= endEpoch) isComplete = true;
  }

  if (isComplete) {
    existing.status = "completed";
    existing.active = false;
    existing.notificationSent = true;
    console.log(`[VetCheck Reminders] Medicine reminder ${reminderId} completed duration condition.`);
  } else {
    // Advance to next upcoming trigger timestamp in future
    existing.scheduledTimestamp = calculateNextMedicineTriggerTimestamp(
      existing.startDate || existing.scheduledDate,
      existing.startTime || existing.dueTime || "08:00",
      existing.intervalValue || 4,
      existing.intervalUnit || "hours",
      existing.timezone,
      now + 1000
    );
    existing.nextTriggerTimestamp = existing.scheduledTimestamp;
    existing.notificationSent = false;
    console.log(`[VetCheck Reminders] Medicine reminder ${reminderId} advanced to next trigger: ${new Date(existing.scheduledTimestamp).toISOString()}`);
  }

  remindersMap.set(reminderId, existing);
  persistRemindersToFile();

  dbSaveReminder(existing.userId, {
    ...existing,
    id: reminderId,
  }).catch((err) => {
    console.warn("[VetCheck Reminders] Async Firestore reminder advance error:", err);
  });

  return existing;
}

export function getAllServerReminders(): StoredServerReminder[] {
  return Array.from(remindersMap.values());
}

export function syncClientReminders(clientList: any[], userId: string = "user-default", userTimezone: string = "Asia/Kolkata", language: string = "en"): StoredServerReminder[] {
  if (!Array.isArray(clientList)) return [];

  const synced: StoredServerReminder[] = [];
  const clientIds = new Set<string>();

  for (const c of clientList) {
    if (!c || !c.title || (!c.dueDate && !c.scheduledDate && !c.startDate)) continue;

    const id = c.id || c.reminderId || "rem-" + Date.now();
    clientIds.add(id);

    let mappedType: ReminderType = "other";
    const rawType = (c.reminderType || c.type || "").toLowerCase();
    if (rawType.includes("med") || c.medicineName) mappedType = "medicine";
    else if (rawType.includes("vaccin")) mappedType = "vaccination";
    else if (rawType.includes("deworm")) mappedType = "deworming";
    else if (rawType.includes("follow") || rawType.includes("vet")) mappedType = "vet_followup";
    else if (rawType.includes("recovery") || rawType.includes("photo")) mappedType = "recovery_check";
    else if (rawType.includes("checkup")) mappedType = "checkup";

    const isMedicine = mappedType === "medicine";
    const saved = saveServerReminder({
      reminderId: id,
      userId,
      animalId: c.animalProfileId || c.animalId || "animal-1",
      animalName: c.animalName || "My Animal",
      animalSpecies: c.species || "Animal",
      reminderType: mappedType,
      title: c.title,
      notes: c.notes,
      scheduledDate: c.dueDate || c.scheduledDate || c.startDate,
      dueTime: c.dueTime || c.startTime || "09:00",
      timezone: userTimezone,
      notifyAdvance: c.notifyAdvance || "same_day",
      status: c.completed ? "completed" : (c.status || (isMedicine ? "active" : "pending")),
      notificationSent: c.completed ? true : false,
      language: language,
      medicineName: c.medicineName,
      startDate: c.startDate || c.dueDate || c.scheduledDate,
      startTime: c.startTime || c.dueTime || "09:00",
      intervalValue: c.intervalValue,
      intervalUnit: c.intervalUnit,
      durationType: c.durationType,
      durationValue: c.durationValue,
      endDate: c.endDate,
      active: c.active !== undefined ? c.active : !c.completed,
      dosesGiven: c.dosesGiven || 0,
      lastTriggeredAt: c.lastTriggeredAt,
      nextTriggerTimestamp: c.nextTriggerTimestamp,
    });

    synced.push(saved);
  }

  return synced;
}
