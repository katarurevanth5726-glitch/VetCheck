import express from "express";
import {
  dbGetAnimals,
  dbSaveAnimal,
  dbDeleteAnimal,
  dbGetScans,
  dbSaveScan,
  dbDeleteScan,
  dbGetReminders,
  dbSaveReminder,
  dbDeleteReminder,
  dbGetPrescriptions,
  dbSavePrescription,
  dbDeletePrescription,
  dbGetVetVisits,
  dbSaveVetVisit,
  dbDeleteVetVisit,
} from "./db";
import { saveServerReminder, deleteServerReminder, deleteServerRemindersForAnimal } from "./reminderStore";
import { uploadBase64ToFirebaseStorage } from "./storageService";

const router = express.Router();

function getUserId(req: express.Request): string {
  const headerUserId = req.headers["x-user-id"] || req.headers["x-device-id"];
  if (headerUserId && typeof headerUserId === "string") {
    return headerUserId.trim();
  }
  if (req.query.userId && typeof req.query.userId === "string") {
    return req.query.userId.trim();
  }
  if (req.body?.userId && typeof req.body.userId === "string") {
    return req.body.userId.trim();
  }
  return "user-default";
}

// ----------------------------------------------------
// Firebase Storage Upload Endpoint
// ----------------------------------------------------
router.post("/api/storage/upload", async (req, res) => {
  const userId = getUserId(req);
  const { imageBase64, folder = "scans", filename } = req.body;

  if (!imageBase64 || typeof imageBase64 !== "string") {
    return res.status(400).json({ error: "Missing or invalid imageBase64 string." });
  }

  const safeFilename = (filename || `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.jpg`).replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${folder.replace(/[^a-zA-Z0-9_-]/g, "_")}/${userId}/${safeFilename}`;

  try {
    const downloadUrl = await uploadBase64ToFirebaseStorage(imageBase64, storagePath);
    if (!downloadUrl) {
      return res.status(500).json({ error: "Failed to upload image to Firebase Storage." });
    }

    res.json({
      success: true,
      url: downloadUrl,
      storagePath,
    });
  } catch (err: any) {
    console.error("[VetCheck Storage API] Upload error:", err);
    res.status(500).json({ error: "Error during image upload.", details: err?.message });
  }
});

// ----------------------------------------------------
// Animals Endpoints
// ----------------------------------------------------
router.get("/api/animals", async (req, res) => {
  const userId = getUserId(req);
  const animals = await dbGetAnimals(userId);
  res.json({ success: true, animals });
});

router.post("/api/animals", async (req, res) => {
  const userId = getUserId(req);
  const animalData = req.body;
  if (!animalData || !animalData.name) {
    return res.status(400).json({ error: "Animal name is required." });
  }

  const saved = await dbSaveAnimal(userId, animalData);
  res.json({ success: true, animal: saved });
});

router.put("/api/animals/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const updates = req.body;

  const saved = await dbSaveAnimal(userId, { ...updates, id });
  res.json({ success: true, animal: saved });
});

router.delete("/api/animals/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const deleted = await dbDeleteAnimal(userId, id);
  deleteServerRemindersForAnimal(id, userId);
  res.json({ success: deleted });
});

// ----------------------------------------------------
// Health Scans Endpoints
// ----------------------------------------------------
router.get("/api/scans", async (req, res) => {
  const userId = getUserId(req);
  const scans = await dbGetScans(userId);
  res.json({ success: true, scans });
});

router.post("/api/scans", async (req, res) => {
  const userId = getUserId(req);
  const scanData = req.body;
  if (!scanData || !scanData.id) {
    return res.status(400).json({ error: "Scan record requires an ID." });
  }

  const saved = await dbSaveScan(userId, scanData);
  res.json({ success: true, scan: saved });
});

router.put("/api/scans/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const updates = req.body;

  const saved = await dbSaveScan(userId, { ...updates, id });
  res.json({ success: true, scan: saved });
});

router.delete("/api/scans/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const deleted = await dbDeleteScan(userId, id);
  res.json({ success: deleted });
});

// ----------------------------------------------------
// Care Reminders Endpoints
// ----------------------------------------------------
router.get("/api/reminders", async (req, res) => {
  const userId = getUserId(req);
  const reminders = await dbGetReminders(userId);
  res.json({ success: true, reminders });
});

router.post("/api/reminders", async (req, res) => {
  const userId = getUserId(req);
  const reminderData = req.body;
  if (!reminderData || !reminderData.title || !reminderData.dueDate) {
    return res.status(400).json({ error: "Title and dueDate are required." });
  }

  const savedInDb = await dbSaveReminder(userId, reminderData);
  // Also sync with server in-memory scheduler cache
  saveServerReminder({ ...savedInDb, scheduledDate: savedInDb.dueDate || savedInDb.scheduledDate });

  res.json({ success: true, reminder: savedInDb });
});

router.put("/api/reminders/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const updates = req.body;

  const savedInDb = await dbSaveReminder(userId, { ...updates, id });
  saveServerReminder({ ...savedInDb, scheduledDate: savedInDb.dueDate || savedInDb.scheduledDate });

  res.json({ success: true, reminder: savedInDb });
});

router.delete("/api/reminders/:id", async (req, res) => {
  const { id } = req.params;
  const deleted = await dbDeleteReminder(id);
  deleteServerReminder(id);
  res.json({ success: deleted });
});

// ----------------------------------------------------
// Prescriptions Endpoints
// ----------------------------------------------------
router.get("/api/prescriptions", async (req, res) => {
  const userId = getUserId(req);
  const prescriptions = await dbGetPrescriptions(userId);
  res.json({ success: true, prescriptions });
});

router.post("/api/prescriptions", async (req, res) => {
  const userId = getUserId(req);
  const prescData = req.body;
  if (!prescData || !prescData.animalName) {
    return res.status(400).json({ error: "Animal name is required for prescription." });
  }

  const saved = await dbSavePrescription(userId, prescData);
  res.json({ success: true, prescription: saved });
});

router.put("/api/prescriptions/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const updates = req.body;

  const saved = await dbSavePrescription(userId, { ...updates, id });
  res.json({ success: true, prescription: saved });
});

router.delete("/api/prescriptions/:id", async (req, res) => {
  const { id } = req.params;
  const deleted = await dbDeletePrescription(id);
  res.json({ success: deleted });
});

// ----------------------------------------------------
// Vet Visits Endpoints
// ----------------------------------------------------
router.get("/api/vet-visits", async (req, res) => {
  const userId = getUserId(req);
  const visits = await dbGetVetVisits(userId);
  res.json({ success: true, visits });
});

router.post("/api/vet-visits", async (req, res) => {
  const userId = getUserId(req);
  const visitData = req.body;
  const saved = await dbSaveVetVisit(userId, visitData);
  res.json({ success: true, visit: saved });
});

router.delete("/api/vet-visits/:id", async (req, res) => {
  const { id } = req.params;
  const deleted = await dbDeleteVetVisit(id);
  res.json({ success: deleted });
});

// ----------------------------------------------------
// Batch Sync & Initial Migration Endpoint
// ----------------------------------------------------
router.post("/api/sync/all", async (req, res) => {
  const userId = getUserId(req);
  const { animals, history, reminders, prescriptions, vetVisits } = req.body;

  let animalCount = 0;
  let scanCount = 0;
  let reminderCount = 0;
  let prescriptionCount = 0;
  let visitCount = 0;

  try {
    if (Array.isArray(animals)) {
      for (const a of animals) {
        if (a && a.id) {
          await dbSaveAnimal(userId, a);
          animalCount++;
        }
      }
    }

    if (Array.isArray(history)) {
      for (const s of history) {
        if (s && s.id) {
          await dbSaveScan(userId, s);
          scanCount++;
        }
      }
    }

    if (Array.isArray(reminders)) {
      for (const r of reminders) {
        if (r && r.id) {
          const savedR = await dbSaveReminder(userId, r);
          saveServerReminder({ ...savedR, scheduledDate: savedR.dueDate || savedR.scheduledDate });
          reminderCount++;
        }
      }
    }

    if (Array.isArray(prescriptions)) {
      for (const p of prescriptions) {
        if (p && p.id) {
          await dbSavePrescription(userId, p);
          prescriptionCount++;
        }
      }
    }

    if (Array.isArray(vetVisits)) {
      for (const v of vetVisits) {
        if (v && v.id) {
          await dbSaveVetVisit(userId, v);
          visitCount++;
        }
      }
    }

    res.json({
      success: true,
      migrated: {
        animals: animalCount,
        scans: scanCount,
        reminders: reminderCount,
        prescriptions: prescriptionCount,
        vetVisits: visitCount,
      },
      message: "Data successfully synced with persistent backend database.",
    });
  } catch (err: any) {
    console.error("[VetCheck API] Error during batch sync:", err);
    res.status(500).json({ error: "Failed to complete batch sync.", details: err?.message });
  }
});

export default router;
