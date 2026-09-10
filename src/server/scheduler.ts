import {
  getDueReminders,
  markReminderSent,
  advanceMedicineReminder,
  StoredServerReminder,
} from "./reminderStore";
import {
  getSubscriptionsForUser,
  getAllSubscriptions,
  sendWebPushToSubscription,
  PushNotificationPayload,
} from "./pushService";

let schedulerInterval: NodeJS.Timeout | null = null;
let isChecking = false;

// Multilingual Notification Templates for VetCheck
interface NotificationCopy {
  title: string;
  body: (animal: string, item: string) => string;
}

const TEMPLATES_BY_LANG: Record<string, Record<string, NotificationCopy>> = {
  en: {
    medicine: {
      title: "💊 Medicine Reminder",
      body: (a, item) => `Animal: ${a}\nTime for the scheduled medicine.${item ? ` (${item})` : ""}`,
    },
    vaccination: {
      title: "💉 Vaccination Due",
      body: (a, item) => `${a}'s ${item || "vaccine"} is due today.`,
    },
    deworming: {
      title: "💊 Deworming Due",
      body: (a) => `${a}'s deworming is due today.`,
    },
    vet_followup: {
      title: "🩺 Vet Follow-Up",
      body: (a) => `${a}'s veterinary follow-up is today.`,
    },
    recovery_check: {
      title: "📷 Recovery Check",
      body: (a) => `It's time to add ${a}'s recovery photo.`,
    },
    general: {
      title: "🐾 Care Reminder",
      body: (a, item) => `${a}: ${item || "Care reminder due."}`,
    },
  },
  hi: {
    medicine: {
      title: "💊 दवा का समय",
      body: (a, item) => `पशु: ${a}\nदवा देने का समय हो गया है।${item ? ` (${item})` : ""}`,
    },
    vaccination: {
      title: "💉 टीकाकरण का समय",
      body: (a, item) => `${a} का ${item || "टीका"} आज देय है।`,
    },
    deworming: {
      title: "💊 पेट के कीड़ों की दवा (डिवॉर्मिंग)",
      body: (a) => `${a} की डिवॉर्मिंग आज देय है।`,
    },
    vet_followup: {
      title: "🩺 पशु चिकित्सक फॉलो-अप",
      body: (a) => `${a} का डॉक्टर फॉलो-अप आज है।`,
    },
    recovery_check: {
      title: "📷 स्वास्थ्य सुधार फोटो",
      body: (a) => `${a} की नई रिकवरी फोटो लेने का समय हो गया है।`,
    },
    general: {
      title: "🐾 देखभाल अनुस्मारक",
      body: (a, item) => `${a}: ${item || "देखभाल अनुस्मारक।"}`,
    },
  },
  te: {
    medicine: {
      title: "💊 మందుల సమయం",
      body: (a, item) => `జంతువు: ${a}\nషెడ్యూల్ చేసిన మందు వేయాల్సిన సమయం.${item ? ` (${item})` : ""}`,
    },
    vaccination: {
      title: "💉 టీకా సమయం",
      body: (a, item) => `${a} కు ${item || "టీకా"} ఈరోజు వేయించాలి.`,
    },
    deworming: {
      title: "💊 నులిపురుగుల మందు (డీవార్మింగ్)",
      body: (a) => `${a} కు డీవార్మింగ్ మందు వేయించే సమయం.`,
    },
    vet_followup: {
      title: "🩺 పశువైద్యుని ఫాలో-అప్",
      body: (a) => `${a} వెటర్నరీ చెకప్ ఈరోజు ఉంది.`,
    },
    recovery_check: {
      title: "📷 రికవరీ ఫోటో",
      body: (a) => `${a} రికవరీ ఫోటో జోడించండి.`,
    },
    general: {
      title: "🐾 సంరక్షణ రిమైండర్",
      body: (a, item) => `${a}: ${item || "రిమైండర్"}`,
    },
  },
};

function formatNotificationPayload(reminder: StoredServerReminder, lang: string = "en"): PushNotificationPayload {
  const animalName = reminder.animalName || "Your Animal";
  const itemTitle = (
    reminder.medicineName ||
    reminder.title?.replace(/^(Vaccination|Deworming|Follow-Up|Medicine|Reminder):\s*/i, "").trim() ||
    ""
  );
  const langKey = TEMPLATES_BY_LANG[lang] ? lang : "en";
  const typeTemplates = TEMPLATES_BY_LANG[langKey] || TEMPLATES_BY_LANG["en"];

  let template = typeTemplates[reminder.reminderType] || typeTemplates["general"];
  if (!template) {
    template = TEMPLATES_BY_LANG["en"][reminder.reminderType] || TEMPLATES_BY_LANG["en"]["general"];
  }

  let title = template.title;
  if (reminder.reminderType === "medicine" && reminder.medicineName) {
    title = `💊 Medicine: ${reminder.medicineName}`;
  }

  const body = template.body(animalName, itemTitle);

  let targetTab = "my-animals";
  if (reminder.reminderType === "recovery_check") {
    targetTab = "my-animals";
  }

  const tag = reminder.reminderType === "medicine"
    ? `vetcheck-med-${reminder.reminderId}-${reminder.scheduledTimestamp}`
    : `vetcheck-${reminder.reminderId}`;

  return {
    title,
    body,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag,
    data: {
      url: `/?tab=${targetTab}&animalId=${encodeURIComponent(reminder.animalId)}&reminderId=${encodeURIComponent(reminder.reminderId)}&type=${encodeURIComponent(reminder.reminderType)}`,
      animalId: reminder.animalId,
      animalName: reminder.animalName,
      reminderId: reminder.reminderId,
      reminderType: reminder.reminderType,
      targetTab,
    },
  };
}

export async function processDueReminders(): Promise<{ processedCount: number; notificationsSent: number }> {
  if (isChecking) return { processedCount: 0, notificationsSent: 0 };
  isChecking = true;

  try {
    const dueReminders = getDueReminders();
    if (dueReminders.length === 0) {
      return { processedCount: 0, notificationsSent: 0 };
    }

    console.log(`[VetCheck Scheduler] Found ${dueReminders.length} due reminders to dispatch.`);
    let sentCount = 0;

    for (const reminder of dueReminders) {
      // Find subscriptions for this specific user or active devices
      let targetSubs = getSubscriptionsForUser(reminder.userId);

      // If no specific user sub found, broadcast to active device subscriptions (single user app scenario)
      if (targetSubs.length === 0) {
        targetSubs = getAllSubscriptions();
      }

      if (targetSubs.length === 0) {
        console.log(`[VetCheck Scheduler] Reminder '${reminder.title}' due, but no active push subscription registered.`);
        if (reminder.reminderType === "medicine") {
          advanceMedicineReminder(reminder.reminderId);
        } else {
          markReminderSent(reminder.reminderId);
        }
        continue;
      }

      let deliveredToAny = false;

      for (const sub of targetSubs) {
        // Check category permission
        if (!sub.categories.careReminders) continue;

        if (reminder.reminderType === "vaccination" && !sub.categories.vaccination) continue;
        if (reminder.reminderType === "deworming" && !sub.categories.deworming) continue;
        if (reminder.reminderType === "vet_followup" && !sub.categories.vetFollowUp) continue;
        if (reminder.reminderType === "recovery_check" && !sub.categories.recovery) continue;

        const effectiveLang = sub.language || reminder.language || "en";
        const payload = formatNotificationPayload(reminder, effectiveLang);

        const result = await sendWebPushToSubscription(sub, payload);
        if (result.success) {
          deliveredToAny = true;
          sentCount++;
        }
      }

      // If repeating medicine reminder, advance interval & check duration completion; otherwise mark sent
      if (reminder.reminderType === "medicine") {
        advanceMedicineReminder(reminder.reminderId);
      } else {
        markReminderSent(reminder.reminderId);
      }

      console.log(`[VetCheck Scheduler] Reminder '${reminder.title}' processed for ${reminder.animalName}. Delivered: ${deliveredToAny}`);
    }

    return { processedCount: dueReminders.length, notificationsSent: sentCount };
  } catch (err) {
    console.error("[VetCheck Scheduler] Error executing reminder scheduler loop:", err);
    return { processedCount: 0, notificationsSent: 0 };
  } finally {
    isChecking = false;
  }
}

export function startReminderScheduler(intervalMs: number = 30000) {
  if (schedulerInterval) return;

  console.log(`[VetCheck Scheduler] Starting background reminder scheduler (checking every ${intervalMs / 1000}s)...`);

  // Run initial check after short warmup delay
  setTimeout(() => {
    processDueReminders();
  }, 3000);

  schedulerInterval = setInterval(() => {
    processDueReminders();
  }, intervalMs);
}

export function stopReminderScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[VetCheck Scheduler] Stopped reminder scheduler.");
  }
}
