import fs from "fs";
import path from "path";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeFirestore,
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Firestore,
} from "firebase/firestore";
import {
  sanitizeScanImagesForFirestore,
  sanitizeAnimalImagesForFirestore,
} from "./storageService";

let db: Firestore | null = null;
let isInitialized = false;

function loadFirebaseConfig() {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      return JSON.parse(raw);
    } catch (e) {
      console.warn("[VetCheck DB] Error parsing firebase-applet-config.json:", e);
    }
  }

  // Fallback to environment variables
  return {
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT,
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    firestoreDatabaseId: process.env.FIRESTORE_DATABASE_ID,
  };
}

export function getDatabase(): Firestore | null {
  if (db) return db;
  if (isInitialized && !db) return null;

  try {
    const config = loadFirebaseConfig();
    if (!config || !config.projectId) {
      console.warn("[VetCheck DB] No Firebase project configuration found. Running with local fallback store.");
      isInitialized = true;
      return null;
    }

    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    const databaseId = config.firestoreDatabaseId || "(default)";

    try {
      db = initializeFirestore(app, {}, databaseId);
      console.log(`[VetCheck DB] Connected to Firestore database: '${databaseId}' (Project: ${config.projectId})`);
    } catch (initErr) {
      db = getFirestore(app);
      console.log(`[VetCheck DB] Connected to default Firestore instance (Project: ${config.projectId})`);
    }

    isInitialized = true;
    return db;
  } catch (err) {
    console.warn("[VetCheck DB] Failed to initialize Firestore client:", err);
    isInitialized = true;
    return null;
  }
}

// Strip undefined values before Firestore writes
export function cleanForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      clean[key] = cleanForFirestore(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

// ----------------------------------------------------
// 1. Animals Collection
// ----------------------------------------------------
export async function dbGetAnimals(userId: string): Promise<any[]> {
  const firestore = getDatabase();
  if (!firestore) return [];

  try {
    const animalsCol = collection(firestore, "animals");
    const q = query(animalsCol, where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (err) {
    console.warn("[VetCheck DB] Error fetching animals from Firestore:", err);
    return [];
  }
}

export async function dbSaveAnimal(userId: string, animal: any): Promise<any> {
  const firestore = getDatabase();
  const animalId = animal.id || animal.animalId || "animal-" + Date.now();

  // Upload any large image binaries/base64 to Firebase Storage & obtain clean URL
  const sanitizedAnimal = await sanitizeAnimalImagesForFirestore(animal, userId);

  const docData = cleanForFirestore({
    ...sanitizedAnimal,
    id: animalId,
    userId,
    updatedAt: Date.now(),
    createdAt: animal.createdAt || Date.now(),
  });

  if (firestore) {
    try {
      const animalRef = doc(firestore, "animals", animalId);
      await setDoc(animalRef, docData, { merge: true });
    } catch (err) {
      console.warn(`[VetCheck DB] Error saving animal ${animalId} to Firestore:`, err);
    }
  }

  return docData;
}

export async function dbDeleteAnimal(userId: string, animalId: string): Promise<boolean> {
  const firestore = getDatabase();
  if (!firestore) return true;

  try {
    const animalRef = doc(firestore, "animals", animalId);
    
    // 1. Verify document ownership if userId is present
    try {
      const snap = await getDoc(animalRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.userId && userId && data.userId !== userId) {
          console.warn(`[VetCheck DB] User ${userId} unauthorized to delete animal ${animalId}`);
          return false;
        }
      }
    } catch (authErr) {
      console.warn(`[VetCheck DB] Warning checking animal ownership before delete:`, authErr);
    }

    // 2. Delete the main animal profile document
    await deleteDoc(animalRef);
    console.log(`[VetCheck DB] Deleted animal document ${animalId} from Firestore.`);

    // 3. Cascade delete all linked scans for this animal to prevent orphan records
    try {
      const scansCol = collection(firestore, "scans");
      const scansQuery = query(scansCol, where("userId", "==", userId));
      const scansSnap = await getDocs(scansQuery);
      const deleteScanPromises: Promise<void>[] = [];
      scansSnap.forEach((docSnap) => {
        const scanData = docSnap.data();
        if (scanData.animalProfileId === animalId || scanData.animalId === animalId) {
          deleteScanPromises.push(deleteDoc(docSnap.ref));
        }
      });
      if (deleteScanPromises.length > 0) {
        await Promise.all(deleteScanPromises);
        console.log(`[VetCheck DB] Cascade-deleted ${deleteScanPromises.length} linked health scans for animal ${animalId}.`);
      }
    } catch (scanErr) {
      console.warn(`[VetCheck DB] Error cleaning up linked scans for animal ${animalId}:`, scanErr);
    }

    // 4. Cascade delete all linked reminders for this animal
    try {
      const remindersCol = collection(firestore, "reminders");
      const remindersQuery = query(remindersCol, where("userId", "==", userId));
      const remindersSnap = await getDocs(remindersQuery);
      const deleteReminderPromises: Promise<void>[] = [];
      remindersSnap.forEach((docSnap) => {
        const rData = docSnap.data();
        if (rData.animalId === animalId || rData.animalProfileId === animalId) {
          deleteReminderPromises.push(deleteDoc(docSnap.ref));
        }
      });
      if (deleteReminderPromises.length > 0) {
        await Promise.all(deleteReminderPromises);
        console.log(`[VetCheck DB] Cascade-deleted ${deleteReminderPromises.length} linked care reminders for animal ${animalId}.`);
      }
    } catch (remErr) {
      console.warn(`[VetCheck DB] Error cleaning up linked reminders for animal ${animalId}:`, remErr);
    }

    // 5. Cascade delete all linked prescriptions for this animal
    try {
      const prescCol = collection(firestore, "prescriptions");
      const prescQuery = query(prescCol, where("userId", "==", userId));
      const prescSnap = await getDocs(prescQuery);
      const deletePrescPromises: Promise<void>[] = [];
      prescSnap.forEach((docSnap) => {
        const pData = docSnap.data();
        if (pData.animalProfileId === animalId || pData.animalId === animalId) {
          deletePrescPromises.push(deleteDoc(docSnap.ref));
        }
      });
      if (deletePrescPromises.length > 0) {
        await Promise.all(deletePrescPromises);
        console.log(`[VetCheck DB] Cascade-deleted ${deletePrescPromises.length} linked prescriptions for animal ${animalId}.`);
      }
    } catch (prescErr) {
      console.warn(`[VetCheck DB] Error cleaning up linked prescriptions for animal ${animalId}:`, prescErr);
    }

    // 6. Cascade delete all linked vet clinic visits for this animal
    try {
      const visitsCol = collection(firestore, "vet_visits");
      const visitsQuery = query(visitsCol, where("userId", "==", userId));
      const visitsSnap = await getDocs(visitsQuery);
      const deleteVisitPromises: Promise<void>[] = [];
      visitsSnap.forEach((docSnap) => {
        const vData = docSnap.data();
        if (vData.animalProfileId === animalId || vData.animalId === animalId) {
          deleteVisitPromises.push(deleteDoc(docSnap.ref));
        }
      });
      if (deleteVisitPromises.length > 0) {
        await Promise.all(deleteVisitPromises);
        console.log(`[VetCheck DB] Cascade-deleted ${deleteVisitPromises.length} linked vet visits for animal ${animalId}.`);
      }
    } catch (visitErr) {
      console.warn(`[VetCheck DB] Error cleaning up linked vet visits for animal ${animalId}:`, visitErr);
    }

    return true;
  } catch (err) {
    console.warn(`[VetCheck DB] Error deleting animal ${animalId} from Firestore:`, err);
    return false;
  }
}

// ----------------------------------------------------
// 2. Health Scans Collection
// ----------------------------------------------------
export async function dbGetScans(userId: string): Promise<any[]> {
  const firestore = getDatabase();
  if (!firestore) return [];

  try {
    const scansCol = collection(firestore, "scans");
    const q = query(scansCol, where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (err) {
    console.warn("[VetCheck DB] Error fetching scans from Firestore:", err);
    return [];
  }
}

export async function dbSaveScan(userId: string, scan: any): Promise<any> {
  const firestore = getDatabase();
  const scanId = scan.id || "scan-" + Date.now();

  // Upload any large image binaries to Firebase Storage & replace with download URL references
  // Strips all base64 data strings before saving to Firestore collection
  const sanitizedScan = await sanitizeScanImagesForFirestore(scan, userId);

  const docData = cleanForFirestore({
    ...sanitizedScan,
    id: scanId,
    userId,
    updatedAt: Date.now(),
    timestamp: scan.timestamp || Date.now(),
  });

  if (firestore) {
    try {
      const scanRef = doc(firestore, "scans", scanId);
      await setDoc(scanRef, docData, { merge: true });
    } catch (err) {
      console.warn(`[VetCheck DB] Error saving scan ${scanId} to Firestore:`, err);
    }
  }

  return docData;
}

export async function dbDeleteScan(userId: string, scanId: string): Promise<boolean> {
  const firestore = getDatabase();
  if (!firestore) return true;

  try {
    const scanRef = doc(firestore, "scans", scanId);
    await deleteDoc(scanRef);
    return true;
  } catch (err) {
    console.warn(`[VetCheck DB] Error deleting scan ${scanId} from Firestore:`, err);
    return false;
  }
}

// ----------------------------------------------------
// 3. Reminders Collection (Persistent Scheduler Source)
// ----------------------------------------------------
export async function dbGetReminders(userId?: string): Promise<any[]> {
  const firestore = getDatabase();
  if (!firestore) return [];

  try {
    const remindersCol = collection(firestore, "reminders");
    let q = query(remindersCol);
    if (userId) {
      q = query(remindersCol, where("userId", "==", userId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (err) {
    console.warn("[VetCheck DB] Error fetching reminders from Firestore:", err);
    return [];
  }
}

export async function dbSaveReminder(userId: string, reminder: any): Promise<any> {
  const firestore = getDatabase();
  const reminderId = reminder.id || reminder.reminderId || "rem-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
  const docData = cleanForFirestore({
    ...reminder,
    id: reminderId,
    reminderId,
    userId: reminder.userId || userId,
    updatedAt: Date.now(),
    createdAt: reminder.createdAt || Date.now(),
  });

  if (firestore) {
    try {
      const reminderRef = doc(firestore, "reminders", reminderId);
      await setDoc(reminderRef, docData, { merge: true });
    } catch (err) {
      console.warn(`[VetCheck DB] Error saving reminder ${reminderId} to Firestore:`, err);
    }
  }

  return docData;
}

export async function dbDeleteReminder(reminderId: string): Promise<boolean> {
  const firestore = getDatabase();
  if (!firestore) return true;

  try {
    const reminderRef = doc(firestore, "reminders", reminderId);
    await deleteDoc(reminderRef);
    return true;
  } catch (err) {
    console.warn(`[VetCheck DB] Error deleting reminder ${reminderId} from Firestore:`, err);
    return false;
  }
}

export async function dbMarkReminderSent(reminderId: string): Promise<void> {
  const firestore = getDatabase();
  if (!firestore) return;

  try {
    const reminderRef = doc(firestore, "reminders", reminderId);
    await updateDoc(reminderRef, {
      notificationSent: true,
      sentAt: Date.now(),
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.warn(`[VetCheck DB] Error updating reminder ${reminderId} status in Firestore:`, err);
  }
}

// ----------------------------------------------------
// 4. Prescriptions Collection
// ----------------------------------------------------
export async function dbGetPrescriptions(userId: string): Promise<any[]> {
  const firestore = getDatabase();
  if (!firestore) return [];

  try {
    const prescriptionsCol = collection(firestore, "prescriptions");
    const q = query(prescriptionsCol, where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (err) {
    console.warn("[VetCheck DB] Error fetching prescriptions from Firestore:", err);
    return [];
  }
}

export async function dbSavePrescription(userId: string, prescription: any): Promise<any> {
  const firestore = getDatabase();
  const prescriptionId = prescription.id || "presc-" + Date.now();
  const docData = cleanForFirestore({
    ...prescription,
    id: prescriptionId,
    userId,
    updatedAt: Date.now(),
    createdAt: prescription.createdAt || Date.now(),
  });

  if (firestore) {
    try {
      const prescRef = doc(firestore, "prescriptions", prescriptionId);
      await setDoc(prescRef, docData, { merge: true });
    } catch (err) {
      console.warn(`[VetCheck DB] Error saving prescription ${prescriptionId} to Firestore:`, err);
    }
  }

  return docData;
}

export async function dbDeletePrescription(prescriptionId: string): Promise<boolean> {
  const firestore = getDatabase();
  if (!firestore) return true;

  try {
    const prescRef = doc(firestore, "prescriptions", prescriptionId);
    await deleteDoc(prescRef);
    return true;
  } catch (err) {
    console.warn(`[VetCheck DB] Error deleting prescription ${prescriptionId} from Firestore:`, err);
    return false;
  }
}

// ----------------------------------------------------
// 5. Vet Visits Collection
// ----------------------------------------------------
export async function dbGetVetVisits(userId: string): Promise<any[]> {
  const firestore = getDatabase();
  if (!firestore) return [];

  try {
    const visitsCol = collection(firestore, "vet_visits");
    const q = query(visitsCol, where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (err) {
    console.warn("[VetCheck DB] Error fetching vet visits from Firestore:", err);
    return [];
  }
}

export async function dbSaveVetVisit(userId: string, visit: any): Promise<any> {
  const firestore = getDatabase();
  const visitId = visit.id || "visit-" + Date.now();
  const docData = cleanForFirestore({
    ...visit,
    id: visitId,
    userId,
    updatedAt: Date.now(),
    createdAt: visit.createdAt || Date.now(),
  });

  if (firestore) {
    try {
      const visitRef = doc(firestore, "vet_visits", visitId);
      await setDoc(visitRef, docData, { merge: true });
    } catch (err) {
      console.warn(`[VetCheck DB] Error saving vet visit ${visitId} to Firestore:`, err);
    }
  }

  return docData;
}

export async function dbDeleteVetVisit(visitId: string): Promise<boolean> {
  const firestore = getDatabase();
  if (!firestore) return true;

  try {
    const visitRef = doc(firestore, "vet_visits", visitId);
    await deleteDoc(visitRef);
    return true;
  } catch (err) {
    console.warn(`[VetCheck DB] Error deleting vet visit ${visitId} from Firestore:`, err);
    return false;
  }
}

// ----------------------------------------------------
// 6. Push Subscriptions Collection (Persistent Across Restarts)
// ----------------------------------------------------
export async function dbGetPushSubscriptions(): Promise<any[]> {
  const firestore = getDatabase();
  if (!firestore) return [];

  try {
    const subsCol = collection(firestore, "push_subscriptions");
    const snapshot = await getDocs(subsCol);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (err) {
    console.warn("[VetCheck DB] Error loading push subscriptions from Firestore:", err);
    return [];
  }
}

export async function dbSavePushSubscription(sub: any): Promise<any> {
  const firestore = getDatabase();
  // Use a stable document ID derived from the endpoint
  const endpointHash = Buffer.from(sub.endpoint || "").toString("base64url").slice(-64) || "sub-" + Date.now();
  const subId = sub.id || endpointHash;

  const docData = cleanForFirestore({
    ...sub,
    id: subId,
    updatedAt: Date.now(),
  });

  if (firestore) {
    try {
      const subRef = doc(firestore, "push_subscriptions", subId);
      await setDoc(subRef, docData, { merge: true });
    } catch (err) {
      console.warn(`[VetCheck DB] Error saving push subscription ${subId} to Firestore:`, err);
    }
  }

  return docData;
}

export async function dbDeletePushSubscription(endpoint: string): Promise<boolean> {
  const firestore = getDatabase();
  if (!firestore) return true;

  try {
    const endpointHash = Buffer.from(endpoint || "").toString("base64url").slice(-64);
    const subRef = doc(firestore, "push_subscriptions", endpointHash);
    await deleteDoc(subRef);
    return true;
  } catch (err) {
    console.warn(`[VetCheck DB] Error deleting push subscription from Firestore:`, err);
    return false;
  }
}
