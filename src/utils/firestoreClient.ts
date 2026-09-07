import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  Firestore,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import {
  AnimalProfile,
  ScreeningRecord,
  CareReminder,
  VeterinaryPrescription,
  VetVisit,
} from "../types";

let clientDb: Firestore | null = null;

export function getClientFirestore(): Firestore | null {
  if (clientDb) return clientDb;
  if (typeof window === "undefined") return null;

  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const databaseId = (firebaseConfig as any).firestoreDatabaseId || "(default)";
    clientDb = getFirestore(app);
    return clientDb;
  } catch (err) {
    console.warn("[VetCheck Client Firestore] Init warning:", err);
    return null;
  }
}

export async function directSaveAnimalToFirestore(animal: AnimalProfile, userId: string): Promise<boolean> {
  try {
    const db = getClientFirestore();
    if (!db) return false;
    const docRef = doc(db, "animals", animal.id);
    await setDoc(docRef, { ...animal, userId, updatedAt: Date.now() }, { merge: true });
    return true;
  } catch (err) {
    console.warn("[VetCheck Client Firestore] Save animal error:", err);
    return false;
  }
}

export async function directDeleteAnimalFromFirestore(animalId: string): Promise<boolean> {
  try {
    const db = getClientFirestore();
    if (!db) return false;
    const docRef = doc(db, "animals", animalId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn("[VetCheck Client Firestore] Delete animal error:", err);
    return false;
  }
}

export async function directSaveScanToFirestore(scan: ScreeningRecord, userId: string): Promise<boolean> {
  try {
    const db = getClientFirestore();
    if (!db) return false;
    const docRef = doc(db, "scans", scan.id);
    const safeScan = {
      ...scan,
      userId,
      // Omit oversized dataUrls from Firestore document to stay within 1MB limit
      imageThumbnail: scan.imageThumbnail?.startsWith("data:") ? scan.imageThumbnail.substring(0, 1000) : scan.imageThumbnail,
      allImages: scan.allImages?.map((img) => ({
        type: img.type,
        url: img.url,
      })),
      updatedAt: Date.now(),
    };
    await setDoc(docRef, safeScan, { merge: true });
    return true;
  } catch (err) {
    console.warn("[VetCheck Client Firestore] Save scan error:", err);
    return false;
  }
}

export async function directSaveReminderToFirestore(reminder: CareReminder, userId: string): Promise<boolean> {
  try {
    const db = getClientFirestore();
    if (!db) return false;
    const docRef = doc(db, "reminders", reminder.id);
    await setDoc(docRef, { ...reminder, userId, updatedAt: Date.now() }, { merge: true });
    return true;
  } catch (err) {
    console.warn("[VetCheck Client Firestore] Save reminder error:", err);
    return false;
  }
}

export async function directDeleteReminderFromFirestore(reminderId: string): Promise<boolean> {
  try {
    const db = getClientFirestore();
    if (!db) return false;
    const docRef = doc(db, "reminders", reminderId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn("[VetCheck Client Firestore] Delete reminder error:", err);
    return false;
  }
}

export async function directSavePrescriptionToFirestore(p: VeterinaryPrescription, userId: string): Promise<boolean> {
  try {
    const db = getClientFirestore();
    if (!db) return false;
    const docRef = doc(db, "prescriptions", p.id);
    await setDoc(docRef, { ...p, userId, updatedAt: Date.now() }, { merge: true });
    return true;
  } catch (err) {
    console.warn("[VetCheck Client Firestore] Save prescription error:", err);
    return false;
  }
}

export async function directSaveVetVisitToFirestore(v: VetVisit, userId: string): Promise<boolean> {
  try {
    const db = getClientFirestore();
    if (!db) return false;
    const docRef = doc(db, "vet_visits", v.id);
    await setDoc(docRef, { ...v, userId, updatedAt: Date.now() }, { merge: true });
    return true;
  } catch (err) {
    console.warn("[VetCheck Client Firestore] Save vet visit error:", err);
    return false;
  }
}

export async function directFetchUserDataFromFirestore(userId: string): Promise<{
  animals: AnimalProfile[];
  history: ScreeningRecord[];
  reminders: CareReminder[];
  prescriptions: VeterinaryPrescription[];
  vetVisits: VetVisit[];
} | null> {
  try {
    const db = getClientFirestore();
    if (!db) return null;

    const animalsQuery = query(collection(db, "animals"), where("userId", "==", userId));
    const scansQuery = query(collection(db, "scans"), where("userId", "==", userId));
    const remindersQuery = query(collection(db, "reminders"), where("userId", "==", userId));
    const prescriptionsQuery = query(collection(db, "prescriptions"), where("userId", "==", userId));
    const visitsQuery = query(collection(db, "vet_visits"), where("userId", "==", userId));

    const [animalsSnap, scansSnap, remindersSnap, presSnap, visitsSnap] = await Promise.all([
      getDocs(animalsQuery),
      getDocs(scansQuery),
      getDocs(remindersQuery),
      getDocs(prescriptionsQuery),
      getDocs(visitsQuery),
    ]);

    const animals: AnimalProfile[] = [];
    animalsSnap.forEach((d) => animals.push(d.data() as AnimalProfile));

    const history: ScreeningRecord[] = [];
    scansSnap.forEach((d) => history.push(d.data() as ScreeningRecord));

    const reminders: CareReminder[] = [];
    remindersSnap.forEach((d) => reminders.push(d.data() as CareReminder));

    const prescriptions: VeterinaryPrescription[] = [];
    presSnap.forEach((d) => prescriptions.push(d.data() as VeterinaryPrescription));

    const vetVisits: VetVisit[] = [];
    visitsSnap.forEach((d) => vetVisits.push(d.data() as VetVisit));

    return { animals, history, reminders, prescriptions, vetVisits };
  } catch (err) {
    console.warn("[VetCheck Client Firestore] Fetch user data error:", err);
    return null;
  }
}
