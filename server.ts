import express from "express";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import vetPlacesRouter from "./src/server/placesRoute";
import notificationRouter from "./src/server/notificationRoutes";
import apiRoutesRouter from "./src/server/apiRoutes";
import { startReminderScheduler } from "./src/server/scheduler";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// CORS configuration for Firebase Hosting frontend & local dev
const allowedOrigins = [
  "https://vetcheck.web.app",
  "https://vetcheck-a547e.web.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".web.app") || origin.endsWith(".firebaseapp.com")) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-user-id", "x-device-id"],
  })
);

// Explicit preflight handling
app.options("*", cors());

// Body parser with safe limit (50mb to handle up to 3 high-res photos)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Places endpoint for real nearby veterinary hospitals
app.use(vetPlacesRouter);

// Database API endpoints for persistent sync
app.use(apiRoutesRouter);

// Notification & Reminder Scheduler endpoints
app.use(notificationRouter);

// Safe helper to obtain active Gemini Model candidates
function getCandidateModels(): string[] {
  const envModel = (process.env.GEMINI_MODEL || "")
    .replace(/^["']|["']$/g, "")
    .trim();

  // Official Gemini candidate multimodal models for veterinary visual screening
  const standardModels = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
  ];

  const models: string[] = [];
  if (envModel && envModel !== "your_model_here" && !envModel.includes("placeholder")) {
    models.push(envModel);
  }

  for (const m of standardModels) {
    if (!models.includes(m)) {
      models.push(m);
    }
  }

  return models;
}

const DEFAULT_CANDIDATE_MODELS: string[] = getCandidateModels();

// Safe helper to obtain active Gemini API Key
function getApiKey(): string {
  const envKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (envKey && typeof envKey === "string") {
    const cleaned = envKey.replace(/^["']|["']$/g, "").trim();
    if (cleaned && cleaned !== "your_gemini_api_key_here" && !cleaned.includes("placeholder")) {
      return cleaned;
    }
  }
  return "";
}

// Robust, high-performance MIME detection and base64 extraction helper without regex backtracking
function parseBase64Image(raw: string, defaultMime = "image/jpeg"): { mimeType: string; data: string } {
  if (!raw || typeof raw !== "string") {
    return { mimeType: defaultMime, data: "" };
  }
  
  if (raw.startsWith("data:")) {
    const commaIdx = raw.indexOf(",");
    if (commaIdx !== -1) {
      const header = raw.slice(5, commaIdx); // e.g. "image/jpeg;base64"
      const data = raw.slice(commaIdx + 1).trim();
      const semiIdx = header.indexOf(";");
      const mimeType = semiIdx !== -1 ? header.slice(0, semiIdx) : header || defaultMime;
      return { mimeType, data };
    }
  }

  const clean = raw.trim();
  let mime = defaultMime;
  if (clean.startsWith("/9j/")) mime = "image/jpeg";
  else if (clean.startsWith("iVBORw0KGgo")) mime = "image/png";
  else if (clean.startsWith("UklGR")) mime = "image/webp";
  else if (clean.startsWith("R0lGOD")) mime = "image/gif";
  return { mimeType: mime, data: clean };
}

// Lazy initialize GenAI client
let genAIClient: GoogleGenAI | null = null;
let lastApiKeyUsed = "";
function getGenAI(): GoogleGenAI {
  const apiKey = getApiKey();
  if (!apiKey) {
    const keyError: any = new Error("Gemini API configuration is missing or invalid. Please configure a valid GEMINI_API_KEY in .env.");
    keyError.status = 401;
    keyError.code = 401;
    throw keyError;
  }
  if (!genAIClient || lastApiKeyUsed !== apiKey) {
    lastApiKeyUsed = apiKey;
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAIClient;
}

// Helper function to call Gemini with resilient model fallback and safe diagnostic logs
async function generateWithModelFallback({
  parts,
  systemInstruction,
  jsonSchema,
  candidateModels,
}: {
  parts: any[];
  systemInstruction: string;
  jsonSchema: any;
  candidateModels?: string[];
}): Promise<{ text: string; modelUsed: string; durationMs: number }> {
  const ai = getGenAI();
  const models = candidateModels && candidateModels.length > 0 ? candidateModels : getCandidateModels();
  let lastError: any = null;

  const configuredModel = (process.env.GEMINI_MODEL || "").replace(/^["']|["']$/g, "").trim() || "default";
  console.log(`[Gemini] Configured model: ${configuredModel}`);

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const isFallback = i > 0;
    const modelStart = Date.now();

    try {
      console.log(`[Gemini] Attempting model: ${model}${isFallback ? " [Fallback]" : " [Primary]"}`);
      console.log(
        `[VetCheck Server Timing] Gemini request start (Model: ${model}, Attempt ${i + 1}/${models.length}${
          isFallback ? " [Fallback]" : " [Primary]"
        })`
      );
      
      const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: jsonSchema,
        },
      });

      const duration = Date.now() - modelStart;
      const text = response.text || "";

      if (text) {
        console.log(`[Gemini] Model succeeded: ${model} in ${duration}ms`);
        console.log(`[VetCheck Server Timing] Gemini: ${duration} ms (Model: ${model})`);
        return { text, modelUsed: model, durationMs: duration };
      } else {
        throw new Error(`Empty response received from Gemini model ${model}.`);
      }
    } catch (err: any) {
      const duration = Date.now() - modelStart;
      lastError = err;
      const msg = err?.message || String(err);
      const statusCode = typeof err?.status === "number" ? err.status : typeof err?.code === "number" ? err.code : 500;
      const errorCode = err?.code || (statusCode === 404 ? "MODEL_NOT_FOUND" : "GEMINI_ERROR");

      console.warn(`[Gemini] Model failure: ${model} | Status: ${statusCode} | Code: ${errorCode} | ${msg}`);
      console.error(`[VetCheck Server] Gemini error on model ${model} after ${duration}ms | Status: ${statusCode} | Code: ${errorCode} | Message: ${msg}`);

      // Immediate stop for non-retryable errors
      if (/safety|blocked|harm/i.test(msg)) {
        const safetyError: any = new Error("This image could not be analysed safely.");
        safetyError.code = "SAFETY_BLOCK";
        safetyError.status = 400;
        throw safetyError;
      }
      if (
        statusCode === 401 ||
        statusCode === 403 ||
        /api key|unauthorized|forbidden|PERMISSION_DENIED|API_KEY_INVALID|API_KEY_SERVICE_BLOCKED|SERVICE_DISABLED/i.test(msg)
      ) {
        const isPerm = statusCode === 403 || /PERMISSION_DENIED|SERVICE_DISABLED|API_KEY_SERVICE_BLOCKED/i.test(msg);
        const keyError: any = new Error(
          isPerm
            ? "Gemini API access is denied or disabled. Please enable Generative Language API in Google Cloud Console."
            : "Gemini API configuration is missing or invalid. Please configure a valid GEMINI_API_KEY in .env."
        );
        keyError.code = isPerm ? 403 : 401;
        keyError.status = isPerm ? 403 : 401;
        throw keyError;
      }

      // If we have a fallback model available and haven't tried it yet, try next fallback
      if (i < models.length - 1) {
        console.log(`[Gemini] Falling back to: ${models[i + 1]}`);
        console.warn(`[VetCheck Server] Switching to fallback model: ${models[i + 1]}`);
        continue;
      }
    }
  }

  throw lastError || new Error("All candidate Gemini models failed.");
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  const apiKeyConfigured = Boolean(getApiKey());
  const models = getCandidateModels();
  res.json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "VetCheck API",
    models,
    primaryModel: models[0] || "gemini-3.6-flash",
    fallbackModels: models.slice(1),
    geminiConfigured: apiKeyConfigured,
  });
});

// Dedicated Animal Image Pre-Validation Endpoint
app.post("/api/validate-image", async (req, res) => {
  const requestStartTime = Date.now();
  const { images, imageBase64, language = "en", languageName = "English" } = req.body;

  if (!getApiKey()) {
    return res.status(401).json({
      error: "Gemini API configuration is missing or invalid. Please configure a valid GEMINI_API_KEY in .env.",
      code: 401,
      allValid: false,
    });
  }

  // Parse slot images
  const inputSlots: { slotId: string; mimeType: string; data: string; slotIndex: number }[] = [];

  if (Array.isArray(images) && images.length > 0) {
    images.forEach((img: any, idx: number) => {
      const parsed = parseBase64Image(img.base64 || img.url || "", "image/jpeg");
      if (parsed.data) {
        inputSlots.push({
          slotId: img.type || img.slotId || (idx === 0 ? "close_up" : idx === 1 ? "full_body" : "angle"),
          mimeType: parsed.mimeType,
          data: parsed.data,
          slotIndex: idx + 1,
        });
      }
    });
  } else if (imageBase64) {
    const parsed = parseBase64Image(imageBase64, "image/jpeg");
    if (parsed.data) {
      inputSlots.push({
        slotId: "close_up",
        mimeType: parsed.mimeType,
        data: parsed.data,
        slotIndex: 1,
      });
    }
  }

  if (inputSlots.length === 0) {
    return res.status(400).json({
      error: "No image data provided for validation.",
      code: 400,
      allValid: false,
    });
  }

  const totalBytes = inputSlots.reduce((acc, s) => acc + Math.round((s.data.length * 3) / 4), 0);
  console.log(
    `[VetCheck Server] Validation started | Photos: ${inputSlots.length} | Total Payload: ${Math.round(
      totalBytes / 1024
    )} KB | Start: ${new Date(requestStartTime).toISOString()}`
  );
  console.log(`[VetCheck Server] Compressed image size received: ${Math.round(totalBytes / 1024)} KB`);

  // System instruction for strict animal verification with support for skin injury / wound / macro photos
  const systemInstruction = `You are a specialized veterinary visual triage validator for "VetCheck".
Your responsibility is to determine whether each provided photo contains a real domestic, farm, livestock, or wild animal, OR a visible anatomical part/lesion/wound of an animal suitable for veterinary inspection.

CRITICAL EVALUATION RULES:
1. ANIMAL & CLINICAL INJURY DETECTION (VALID & ACCEPTABLE):
   - Real domestic pets (Dog, Cat, Rabbit, etc.), livestock/farm animals (Cow, Buffalo, Goat, Sheep, Horse, Donkey, Pig, Poultry, Bird, etc.).
   - Skin injuries, open wounds, cuts, bites, rashes, redness, dermatitis, fur loss, mange, lumps, lesions, eye discharge, ear infections, paw cuts, udder lesions, surgical sites, or close-ups of animal skin/fur MUST BE ACCEPTED as valid animals (containsAnimal: true, animalClearlyVisible: true, imageSuitableForAnalysis: true, rejectionReasonCode: "none").
   - Close-up/macro photos focusing on animal fur, skin, limbs, or wounds are VALID animal photos. Do not confuse animal skin/fur with human skin.

2. REJECT HUMAN-ONLY IMAGES:
   - If the photo shows ONLY a human face, selfie, person, crowd of humans, human hands, human skin, or human medical report without any animal:
     * containsAnimal: false, containsHuman: true, animalClearlyVisible: false, imageSuitableForAnalysis: false, detectedSpecies: "Human", rejectionReasonCode: "human_only", userMessage: "Please upload a clear photo of an animal. Human photos cannot be analyzed by VetCheck."

3. REJECT UNRELATED OBJECTS:
   - If the photo is a car, vehicle, motorcycle, building, room, furniture, food, landscape, flower, sky, clothing, document, screenshot, or inanimate object:
     * containsAnimal: false, containsHuman: false, animalClearlyVisible: false, imageSuitableForAnalysis: false, detectedSpecies: "Object / Non-Animal", rejectionReasonCode: "unrelated_object", userMessage: "Please upload a clear animal photo."

4. HUMAN + ANIMAL TOGETHER:
   - If a person is holding, examining, or petting an animal:
     * As long as the animal or affected area is visible -> containsAnimal: true, animalClearlyVisible: true, imageSuitableForAnalysis: true, rejectionReasonCode: "none", userMessage: "Animal detected."

5. QUALITY & VISIBILITY:
   - Extremely blurry, unidentifiable, or severely corrupted photos -> rejectionReasonCode: "blurry", userMessage: "This photo is difficult to analyze. Please try a clearer, well-lit photo."
   - Subject too distant to discern any animal features -> rejectionReasonCode: "too_far", userMessage: "This photo is difficult to analyze. Please try a closer photo."

If multiple photos are provided, evaluate each photo slot individually in order.`;

  const validationSchema = {
    type: Type.OBJECT,
    properties: {
      allValid: {
        type: Type.BOOLEAN,
        description: "True if ALL provided photos contain clearly visible animals and pass validation, false otherwise.",
      },
      isAnimal: {
        type: Type.BOOLEAN,
        description: "True if the primary/evaluated image contains an animal or animal clinical sign.",
      },
      confidence: {
        type: Type.STRING,
        description: "Classification confidence: 'High', 'Medium', or 'Low'.",
      },
      imageQuality: {
        type: Type.STRING,
        description: "'good' | 'unclear' | 'poor'",
      },
      reason: {
        type: Type.STRING,
        description: "Specific reason if invalid or unclear, otherwise 'none'.",
      },
      slots: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            slotIndex: { type: Type.INTEGER, description: "1-indexed photo number (1, 2, 3)" },
            slotId: { type: Type.STRING, description: "Photo slot id (e.g. close_up, full_body, angle)" },
            containsAnimal: { type: Type.BOOLEAN },
            containsHuman: { type: Type.BOOLEAN },
            animalClearlyVisible: { type: Type.BOOLEAN },
            imageSuitableForAnalysis: { type: Type.BOOLEAN },
            detectedSpecies: { type: Type.STRING },
            rejectionReasonCode: {
              type: Type.STRING,
              description: "'none' | 'human_only' | 'unrelated_object' | 'blurry' | 'too_far' | 'dark' | 'obstructed'",
            },
            confidence: { type: Type.STRING },
            imageQuality: { type: Type.STRING },
          },
          required: [
            "slotIndex",
            "containsAnimal",
            "animalClearlyVisible",
            "imageSuitableForAnalysis",
            "detectedSpecies",
            "rejectionReasonCode",
          ],
        },
      },
      primaryInvalidReason: {
        type: Type.STRING,
        description: "Primary user-facing error message for the first invalid photo, or empty string if all valid.",
      },
      primaryRejectionCode: {
        type: Type.STRING,
        description: "'none' | 'human_only' | 'unrelated_object' | 'blurry' | 'too_far' | 'animal_obscured'",
      },
    },
    required: ["allValid", "isAnimal", "slots"],
  };

  const parts: any[] = [];
  inputSlots.forEach((slot) => {
    parts.push({
      inlineData: {
        mimeType: slot.mimeType,
        data: slot.data,
      },
    });
  });

  const promptText = `Validate these ${inputSlots.length} image(s) for animal presence:
${inputSlots.map((s, i) => `Photo ${i + 1} (Slot: ${s.slotId})`).join("\n")}

Respond strictly in structured JSON.`;
  parts.push({ text: promptText });

  try {
    const result = await generateWithModelFallback({
      parts,
      systemInstruction,
      jsonSchema: validationSchema,
      candidateModels: DEFAULT_CANDIDATE_MODELS,
    });

    const sanitizedRaw = result.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(sanitizedRaw);
    } catch {
      const match = sanitizedRaw.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error("Invalid response format received from AI model.");
      }
    }

    if (Array.isArray(parsed.slots)) {
      parsed.slots = parsed.slots.map((s: any, idx: number) => {
        const matchingInput = inputSlots[idx] || inputSlots[0];
        const hasAnimal = s.containsAnimal === true || s.isAnimal === true;
        const isSuitable = s.imageSuitableForAnalysis && hasAnimal && s.animalClearlyVisible && (s.rejectionReasonCode === "none" || !s.rejectionReasonCode);
        return {
          ...s,
          slotId: s.slotId || matchingInput?.slotId || `photo_${idx + 1}`,
          slotIndex: s.slotIndex || idx + 1,
          isAnimal: hasAnimal,
          confidence: s.confidence || (isSuitable ? "High" : "Medium"),
          imageQuality: s.imageQuality || (s.rejectionReasonCode === "blurry" || s.rejectionReasonCode === "too_far" ? "unclear" : "good"),
          imageSuitableForAnalysis: isSuitable,
        };
      });
      parsed.allValid = parsed.slots.every((s: any) => s.imageSuitableForAnalysis === true);
      
      const firstInvalid = parsed.slots.find((s: any) => !s.imageSuitableForAnalysis);
      if (firstInvalid) {
        parsed.primaryRejectionCode = firstInvalid.rejectionReasonCode || "unrelated_object";
        parsed.isAnimal = !!(firstInvalid.containsAnimal && firstInvalid.animalClearlyVisible);
        parsed.confidence = firstInvalid.confidence || "Medium";
        parsed.imageQuality = (firstInvalid.rejectionReasonCode === "blurry" || firstInvalid.rejectionReasonCode === "too_far") ? "unclear" : "good";
        parsed.reason = firstInvalid.rejectionReasonCode;

        if (parsed.slots.length > 1) {
          parsed.primaryInvalidReason =
            firstInvalid.rejectionReasonCode === "human_only"
              ? `Photo ${firstInvalid.slotIndex} does not appear to contain an animal. Human photos cannot be analyzed by VetCheck. Please replace it.`
              : firstInvalid.rejectionReasonCode === "blurry" || firstInvalid.rejectionReasonCode === "too_far"
              ? `Photo ${firstInvalid.slotIndex} is difficult to analyze. Please try a clearer, well-lit photo.`
              : `Photo ${firstInvalid.slotIndex} does not appear to contain an animal. Please replace it.`;
        } else {
          parsed.primaryInvalidReason =
            firstInvalid.rejectionReasonCode === "human_only"
              ? "Please upload a clear photo of an animal. Human photos cannot be analyzed by VetCheck."
              : firstInvalid.rejectionReasonCode === "blurry" || firstInvalid.rejectionReasonCode === "too_far"
              ? "This photo is difficult to analyze. Please try a clearer, well-lit photo."
              : "Please upload a clear animal photo.";
        }
      } else {
        parsed.isAnimal = true;
        parsed.confidence = parsed.confidence || "High";
        parsed.imageQuality = "good";
        parsed.reason = "none";
        parsed.primaryInvalidReason = "";
        parsed.primaryRejectionCode = "none";
      }
    } else {
      parsed.allValid = parsed.isAnimal ?? true;
      parsed.isAnimal = parsed.isAnimal ?? true;
      parsed.confidence = parsed.confidence || "High";
      parsed.imageQuality = parsed.imageQuality || "good";
      parsed.reason = parsed.reason || "none";
      parsed.primaryInvalidReason = "";
      parsed.primaryRejectionCode = "none";
    }

    const duration = Date.now() - requestStartTime;
    const detectedSpeciesSummary = parsed.slots?.map((s: any) => s.detectedSpecies).join(", ") || "Animal";
    console.log(`[VetCheck Server] Validation duration: ${duration} ms (allValid: ${parsed.allValid}, Species: ${detectedSpeciesSummary})`);

    return res.json(parsed);
  } catch (err: any) {
    const duration = Date.now() - requestStartTime;
    console.log(`[VetCheck Server] Validation duration: ${duration} ms (Failed)`);
    const statusCode = typeof err?.status === "number" ? err.status : typeof err?.code === "number" ? err.code : 500;
    const msg = err?.message || String(err);

    if (statusCode === 401 || /api key|unauthorized/i.test(msg)) {
      return res.status(401).json({
        error: "Gemini API configuration is missing or invalid. Please configure a valid GEMINI_API_KEY in .env.",
        code: 401,
        allValid: false,
      });
    }

    if (statusCode === 403 || /forbidden|PERMISSION_DENIED|SERVICE_DISABLED|API_KEY_SERVICE_BLOCKED/i.test(msg)) {
      return res.status(403).json({
        error: "Gemini API access is denied or disabled. Please enable Generative Language API in Google Cloud Console.",
        code: 403,
        allValid: false,
      });
    }

    if (statusCode === 504 || statusCode === 408 || /timeout|could not finish in time/i.test(msg)) {
      console.warn(`[VetCheck Server] Validation timeout after ${duration}ms:`, msg);
      return res.status(504).json({
        error: "Analysis took longer than expected. Please try again.",
        code: 504,
        isTimeout: true,
        technicalFailure: true,
      });
    }

    if (statusCode === 429 || /rate limit|usage limit/i.test(msg)) {
      console.warn(`[VetCheck Server] Validation rate limit after ${duration}ms:`, msg);
      return res.status(429).json({
        error: "Usage limit reached. Please wait and retry.",
        code: 429,
        technicalFailure: true,
      });
    }

    if (statusCode === 503 || /busy|high demand|unavailable/i.test(msg)) {
      console.warn(`[VetCheck Server] Validation service busy after ${duration}ms:`, msg);
      return res.status(503).json({
        error: "Upstream AI service is temporarily unavailable. Please try again shortly.",
        code: 503,
        technicalFailure: true,
      });
    }

    console.error(`[VetCheck Server] Validation technical error after ${duration}ms:`, err);
    return res.status(500).json({
      error: "We couldn't analyze the photo right now. Please try again shortly.",
      code: 500,
      technicalFailure: true,
    });
  }
});

// Veterinary Image Screening Analysis Endpoint (Streamlined Single Multimodal Request)
app.post("/api/analyze", async (req, res) => {
  const requestStartTime = Date.now();
  console.log(`[VetCheck Server Timing] Request received`);

  const {
    imageBase64,
    images,
    mimeType = "image/jpeg",
    selectedAnimal,
    bodyArea,
    symptoms,
    language = "en",
    languageName = "English",
  } = req.body;

  if (!getApiKey()) {
    console.error("[VetCheck] Gemini error status: 401 | Reason: GEMINI_API_KEY is missing or unconfigured");
    console.log(`[VetCheck Server Timing] Total: ${Date.now() - requestStartTime} ms | Status: 401`);
    return res.status(401).json({
      success: false,
      code: "API_KEY_MISSING",
      error: "Gemini API configuration is missing or invalid. Please configure a valid GEMINI_API_KEY in .env.",
      message: "Gemini API configuration is missing or invalid. Please configure a valid GEMINI_API_KEY in .env.",
    });
  }

  const imagePrepStart = Date.now();
  // Collect all provided unique images (up to 3) for the multimodal request with fast MIME detection
  const imageParts: any[] = [];
  const mimeTypes: string[] = [];

  if (Array.isArray(images) && images.length > 0) {
    for (const img of images.slice(0, 3)) {
      const parsed = parseBase64Image(img.base64 || img.url || "", mimeType || "image/jpeg");
      if (parsed.data) {
        imageParts.push({
          inlineData: {
            mimeType: parsed.mimeType,
            data: parsed.data,
          },
        });
        mimeTypes.push(parsed.mimeType);
      }
    }
  }

  // Fallback to imageBase64 if images array was empty
  if (imageParts.length === 0 && imageBase64) {
    const parsed = parseBase64Image(imageBase64, mimeType || "image/jpeg");
    if (parsed.data) {
      imageParts.push({
        inlineData: {
          mimeType: parsed.mimeType,
          data: parsed.data,
        },
      });
      mimeTypes.push(parsed.mimeType);
    }
  }

  const imagePrepDuration = Date.now() - imagePrepStart;
  console.log(`[VetCheck Server Timing] Image preparation: ${imagePrepDuration} ms`);

  if (imageParts.length === 0) {
    console.warn(`[VetCheck Server Timing] Total: ${Date.now() - requestStartTime} ms | Status: 400 (0 valid images)`);
    return res.status(400).json({
      success: false,
      code: "INVALID_PAYLOAD",
      error: "The selected image could not be processed.",
      details: "No valid image data was provided.",
      message: "No valid image data was provided.",
    });
  }

  const totalImageBytes = imageParts.reduce((acc, part) => acc + Math.round((part.inlineData.data.length * 3) / 4), 0);

  console.log(
    `[VetCheck Server] ANALYZE request processing | Images: ${imageParts.length} | MIMEs: [${mimeTypes.join(", ")}] | Size: ~${Math.round(
      totalImageBytes / 1024
    )} KB | Animal: ${selectedAnimal || "not specified"} | Lang: ${language} (${languageName})`
  );

  // 1. Precise Analysis Instruction with Animal & Clinical Injury Screening (Token Optimized)
  let systemInstruction = `Perform preliminary visual health screening of the animal in the provided photos.
CRITICAL RULES:
- Strictly animal health screening: Domestic pets (Dogs, Cats, Rabbits), Livestock/Farm animals (Cows, Buffaloes, Goats, Sheep, Horses, Donkeys, Pigs, Poultry, Ducks), and working animals.
- Close-up/macro photos of skin lesions, wounds, rashes, infections, eye/ear/mouth/paw injuries MUST be accepted and screened.
- If human is present or holding animal, focus ONLY on the animal. Never diagnose humans.
- If image contains ONLY a human OR ONLY an inanimate object, set validImage: false, isHumanOnly: true (if human), detectedAnimal: "None", possibleConditions: [], visibleSigns: [], immediateCare: [], warningSigns: [].
- If animal/lesion is visible: Provide observable visible signs and cautious differential conditions with confidence ratings. Do not provide confirmed diagnosis or prescription medication dosages. Return strictly structured JSON.`;

  if (language && language !== "en" && languageName && languageName !== "English") {
    systemInstruction += ` Translate all user-facing string values into ${languageName}. Keep all JSON property names in English.`;
  }

  // 2. Concise User Context
  let userText = "Perform preliminary visual health screening for this animal photo.";
  if (selectedAnimal && typeof selectedAnimal === "string" && selectedAnimal.trim()) {
    userText += `\nAnimal: ${selectedAnimal.trim()}`;
  }
  if (bodyArea && typeof bodyArea === "string" && bodyArea.trim()) {
    userText += `\nAffected Area: ${bodyArea.trim()}`;
  }
  if (symptoms && typeof symptoms === "string" && symptoms.trim()) {
    userText += `\nReported Symptoms: ${symptoms.trim()}`;
  }

  // 3. Small Structured JSON Schema (Strictly constrained limits for fast token generation)
  const jsonSchema = {
    type: Type.OBJECT,
    properties: {
      validImage: {
        type: Type.BOOLEAN,
        description: "True ONLY if a real, clearly visible animal is present in the image, false if human-only, object, or no animal.",
      },
      isHumanOnly: {
        type: Type.BOOLEAN,
        description: "True if the image contains only a human or person without any animal.",
      },
      detectedAnimal: {
        type: Type.STRING,
        description: "Name of the animal species observed (e.g. Dog, Cattle, Cat, Goat, Bird, Buffalo, or 'None').",
      },
      affectedArea: {
        type: Type.STRING,
        description: "Primary anatomical body region observed (e.g. Skin, Eye, Ear, Paw, Mouth, Udder).",
      },
      visibleSigns: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Maximum 4 direct observable physical signs in short sentences.",
      },
      possibleConditions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Cautious name of possible condition (maximum 2-3 conditions total)." },
            reason: { type: Type.STRING, description: "Brief justification based on visible signs." },
            confidence: { type: Type.STRING, description: "'Low', 'Medium', or 'High'" },
          },
          required: ["name", "reason", "confidence"],
        },
        description: "Maximum 2-3 possible differential conditions.",
      },
      severity: {
        type: Type.STRING,
        description: "Severity level: 'Mild', 'Moderate', 'Serious', or 'Emergency'.",
      },
      immediateCare: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Maximum 3-4 safe non-medicinal immediate care steps.",
      },
      warningSigns: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Maximum 3-4 red-flag progression warning signs.",
      },
      veterinaryAdvice: {
        type: Type.STRING,
        description: "Clear guidance on when to seek in-person veterinary care.",
      },
      limitations: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Limitations of photo-based screening.",
      },
      disclaimer: {
        type: Type.STRING,
        description: "Standard non-diagnosis veterinary disclaimer.",
      },
    },
    required: [
      "validImage",
      "isHumanOnly",
      "detectedAnimal",
      "affectedArea",
      "visibleSigns",
      "possibleConditions",
      "severity",
      "immediateCare",
      "warningSigns",
      "veterinaryAdvice",
      "limitations",
      "disclaimer",
    ],
  };

  const parts = [
    ...imageParts,
    { text: userText },
  ];

  let rawResponseText = "";
  let modelUsed = DEFAULT_CANDIDATE_MODELS[0] || "gemini-2.5-flash";
  let geminiDuration = 0;

  try {
    const result = await generateWithModelFallback({
      parts,
      systemInstruction,
      jsonSchema,
      candidateModels: DEFAULT_CANDIDATE_MODELS,
    });
    rawResponseText = result.text;
    modelUsed = result.modelUsed;
    geminiDuration = result.durationMs;
  } catch (err: any) {
    const statusCode = typeof err?.status === "number" ? err.status : typeof err?.code === "number" ? err.code : 500;
    const msg = err?.message || "Analysis could not be completed.";
    const duration = Date.now() - requestStartTime;

    console.error(`[VetCheck Server] Gemini analysis failed after ${duration}ms | Status: ${statusCode} | Error: ${msg}`);
    console.log(`[VetCheck Server Timing] Total: ${duration} ms | Failed`);

    if (err?.code === "SAFETY_BLOCK" || /safety|blocked|harm/i.test(msg)) {
      return res.status(400).json({
        success: false,
        code: "SAFETY_BLOCK",
        error: "This image could not be analysed safely.",
        message: "This image could not be analysed safely.",
      });
    }

    if (statusCode === 401 || /api key|unauthorized/i.test(msg)) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        error: "Gemini API configuration is missing or invalid. Please configure a valid GEMINI_API_KEY in .env.",
        message: "Gemini API configuration is missing or invalid. Please configure a valid GEMINI_API_KEY in .env.",
      });
    }

    if (statusCode === 403 || /forbidden|PERMISSION_DENIED|SERVICE_DISABLED|API_KEY_SERVICE_BLOCKED/i.test(msg)) {
      return res.status(403).json({
        success: false,
        code: "PERMISSION_DENIED",
        error: "Gemini API access is denied or disabled. Please enable Generative Language API in Google Cloud Console.",
        message: "Gemini API access is denied or disabled. Please enable Generative Language API in Google Cloud Console.",
      });
    }

    if (statusCode === 404 || /not found/i.test(msg)) {
      return res.status(404).json({
        success: false,
        code: "MODEL_NOT_FOUND",
        error: "Configured Gemini model is not available.",
        message: "Configured Gemini model is not available.",
      });
    }

    if (statusCode === 429 || /rate limit|usage limit|RESOURCE_EXHAUSTED/i.test(msg)) {
      return res.status(429).json({
        success: false,
        code: "RATE_LIMIT_EXCEEDED",
        error: "Gemini quota or rate limit exceeded. Please wait a moment and retry.",
        message: "Usage limit reached. Please wait and retry.",
      });
    }

    if (statusCode === 504 || statusCode === 408 || /timeout|could not finish in time|aborted/i.test(msg)) {
      console.warn(`[VetCheck Server] Analysis timed out after ${duration}ms:`, msg);
      return res.status(504).json({
        success: false,
        code: "TIMEOUT",
        error: "Analysis took longer than expected. Please try again.",
        message: "Analysis took longer than expected. Please try again.",
        isTimeout: true,
      });
    }

    if (statusCode === 503 || /busy|high demand|unavailable/i.test(msg)) {
      return res.status(503).json({
        success: false,
        code: "SERVICE_UNAVAILABLE",
        error: "Upstream AI service is temporarily unavailable. Please try again shortly.",
        message: "Upstream AI service is temporarily unavailable. Please try again shortly.",
      });
    }

    console.error(`[VetCheck Server] Analysis error after ${duration}ms:`, err);
    return res.status(500).json({
      success: false,
      code: "INTERNAL_SERVER_ERROR",
      error: "We couldn't analyze the photo right now. Please try again shortly.",
      message: "We couldn't analyze the photo right now. Please try again shortly.",
    });
  }

  if (!rawResponseText) {
    console.error(`[VetCheck Server] Gemini empty AI response`);
    console.log(`[VetCheck Server Timing] Total: ${Date.now() - requestStartTime} ms`);
    return res.status(500).json({
      success: false,
      code: "EMPTY_RESPONSE",
      error: "We couldn't analyze the photo right now. Please try again shortly.",
      message: "We couldn't analyze the photo right now. Please try again shortly.",
    });
  }

  try {
    const responseProcessingStart = Date.now();
    let parsed: any;
    const sanitizedRaw = rawResponseText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    try {
      parsed = JSON.parse(sanitizedRaw);
    } catch {
      const match = sanitizedRaw.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error("Invalid response format received from AI model.");
      }
    }

    // Dangerous medication and chemical sanitizer
    const DANGEROUS_SUBSTANCE_REGEX = /(ivermectin|amoxicillin|enrofloxacin|oxytetracycline|dexamethasone|prednisolone|meloxicam\s+\d+|paracetamol|ibuprofen|tylenol|aspirin|motor\s+oil|engine\s+oil|battery\s+acid|brake\s+fluid|kerosene|diesel|caustic)/gi;
    const sanitize = (text: string) => (text ? String(text).replace(DANGEROUS_SUBSTANCE_REGEX, "[veterinary-prescribed treatment only]") : "");
    const sanitizeArr = (arr: any[]) => (Array.isArray(arr) ? arr.map((item) => sanitize(String(item))) : []);

    const isHumanOnly = parsed.isHumanOnly === true || parsed.detectedAnimal?.toLowerCase?.().includes("human");
    const isInvalid =
      parsed.validImage === false ||
      isHumanOnly ||
      parsed.detectedAnimal === "None" ||
      parsed.detectedAnimal?.toLowerCase?.().includes("object") ||
      parsed.detectedAnimal?.toLowerCase?.().includes("non-animal") ||
      parsed.detectedAnimal?.toLowerCase?.().includes("unclear");

    if (isInvalid) {
      const errMsg = isHumanOnly
        ? "Please upload a clear photo of an animal. Human photos cannot be analyzed by VetCheck."
        : "Please upload a clear animal photo.";

      const responseProcessingDuration = Date.now() - responseProcessingStart;
      const totalDuration = Date.now() - requestStartTime;
      console.log(`[VetCheck Server Timing] Response processing: ${responseProcessingDuration} ms`);
      console.log(`[VetCheck Server Timing] Total: ${totalDuration} ms`);
      console.warn(`[VetCheck Server] Analysis rejected non-animal image: isHumanOnly=${isHumanOnly}, detectedAnimal=${parsed.detectedAnimal}`);
      return res.status(422).json({
        success: false,
        code: isHumanOnly ? "HUMAN_ONLY" : "NON_ANIMAL",
        error: errMsg,
        message: errMsg,
        rejectionCode: isHumanOnly ? "human_only" : "unrelated_object",
        validAnimalImage: false,
        validImage: false,
        isAnimal: false,
      });
    }

    const validImg = parsed.validImage ?? true;
    const animalName = sanitize(parsed.detectedAnimal || selectedAnimal || "Animal");
    const severity = ["Mild", "Moderate", "Serious", "Emergency"].includes(parsed.severity) ? parsed.severity : "Mild";
    const isEmergency = severity === "Emergency";
    const visibleSigns = sanitizeArr(parsed.visibleSigns || []).slice(0, 5);
    const immediateCare = sanitizeArr(parsed.immediateCare || []).slice(0, 4);
    const warningSigns = sanitizeArr(parsed.warningSigns || []).slice(0, 4);
    const vetAdvice = sanitize(parsed.veterinaryAdvice || "Consult a licensed veterinarian for formal examination and diagnosis.");
    const limitations = sanitizeArr(parsed.limitations || [
      "Visual screening cannot detect internal illnesses, parasites, or fevers.",
      "A photograph cannot replace in-person veterinary examination and testing."
    ]);
    const disclaimer = sanitize(parsed.disclaimer || "This preliminary visual assessment is an AI screening tool and NOT a definitive medical diagnosis.");

    // Map possible conditions (capped at 3)
    const possibleConditions = (Array.isArray(parsed.possibleConditions) ? parsed.possibleConditions : []).slice(0, 3).map((c: any) => ({
      name: sanitize(c.name || "Possible Condition"),
      reason: sanitize(c.reason || ""),
      supportingEvidence: [sanitize(c.reason || "")],
      missingInformation: ["In-person physical examination and diagnostic swab/panel"],
      confidence: ["Low", "Medium", "High"].includes(c.confidence) ? c.confidence : "Medium",
      requiresVeterinaryConfirmation: true,
      description: sanitize(c.reason || ""),
      likelihood: ["Low", "Medium", "High"].includes(c.confidence) ? c.confidence : "Medium",
    }));

    const responseProcessingDuration = Date.now() - responseProcessingStart;
    const totalDuration = Date.now() - requestStartTime;

    console.log(`[VetCheck Server Timing] Response processing: ${responseProcessingDuration} ms`);
    console.log(`[VetCheck Server Timing] Total: ${totalDuration} ms`);

    const serverTiming = {
      imagePrepMs: imagePrepDuration,
      geminiMs: geminiDuration,
      responseProcessingMs: responseProcessingDuration,
      totalMs: totalDuration,
      modelUsed,
    };

    res.setHeader(
      "Server-Timing",
      `imgPrep;dur=${imagePrepDuration}, gemini;dur=${geminiDuration}, respProc;dur=${responseProcessingDuration}, total;dur=${totalDuration}`
    );

    const resultPayload = {
      validAnimalImage: validImg,
      validImage: validImg,
      isAnimal: validImg,
      screeningStatus: validImg ? "Completed" : "Insufficient Image",
      detectedAnimal: {
        name: animalName,
        confidence: "High" as const,
        needsConfirmation: false,
      },
      animalType: animalName,
      animalConfidence: "High" as const,
      confidence: "High" as const,
      affectedBodyArea: sanitize(parsed.affectedArea || bodyArea || "Skin / Body"),
      visibleSigns,
      possibleConditions,
      severity,
      severityReason: `Assessed as ${severity} based on visible tissue presentation.`,
      simpleExplanation: disclaimer,
      immediateCare,
      safeImmediateCareSteps: immediateCare,
      warningSigns,
      safetyPrecautions: warningSigns,
      avoidDoing: [
        "Do not administer human medications (paracetamol, ibuprofen, aspirin) or unprescribed antibiotics.",
        "Do not apply motor oil, battery fluid, kerosene, or caustic chemicals."
      ],
      whatToAvoid: [
        "Do not administer human medications (paracetamol, ibuprofen, aspirin) or unprescribed antibiotics.",
        "Do not apply motor oil, battery fluid, kerosene, or caustic chemicals."
      ],
      veterinaryHelp: vetAdvice,
      whenToSeeVet: vetAdvice,
      recommendedNextAction: isEmergency ? "Seek immediate emergency veterinary care (Dial 1962 in India)" : vetAdvice,
      emergencyWarning: {
        active: isEmergency,
        reason: isEmergency ? "Acute high-risk symptoms identified in preliminary scan." : "",
        immediateAction: isEmergency ? "Seek immediate veterinary hospital care (Dial 1962 in India)" : "",
      },
      isEmergencyAlert: isEmergency,
      actionPlan: {
        doNow: immediateCare.length > 0 ? immediateCare : ["Keep the animal in a clean, shaded area with fresh water."],
        watchFor: warningSigns.length > 0 ? warningSigns : ["Spreading redness, swelling, or sudden lethargy."],
        avoidDoing: ["Do not administer human painkillers or unprescribed antibiotics."],
        getHelp: vetAdvice,
      },
      limitations,
      disclaimer,
      imageQuality: {
        rating: "Good",
        issues: [],
        retakeRecommended: !validImg,
      },
      serverTiming,
    };

    return res.json({
      success: true,
      analysis: resultPayload,
      result: resultPayload,
      serverTiming,
      ...resultPayload,
    });
  } catch (parseError: any) {
    console.error("[VetCheck Server] JSON Parse Error:", parseError);
    const totalDuration = Date.now() - requestStartTime;
    console.log(`[VetCheck Server Timing] Total: ${totalDuration} ms | JSON Parse Error`);
    return res.status(500).json({
      success: false,
      code: "JSON_PARSE_ERROR",
      error: "Analysis could not be completed. Please try again.",
      message: "Analysis could not be completed. Please try again.",
    });
  }
});

// Dedicated Before-and-After Visual Comparison Endpoint
app.post("/api/compare", async (req, res) => {
  const {
    originalImageBase64,
    newImageBase64,
    originalDate,
    newDate,
    animalType,
    conditionName,
    language = "en",
    languageName = "English",
  } = req.body;

  if (!originalImageBase64 || !newImageBase64) {
    return res.status(400).json({
      error: "Both original screening photo and new follow-up photo are required for comparison.",
    });
  }

  const systemInstruction = `You are "VetCheck", evaluating a follow-up image comparison for an animal under preliminary visual monitoring.
CRITICAL COMPARISON GUIDELINES:
1. Compare only visible visual changes (swelling size, crusting/scabbing, discharge clarity, redness, hair regrowth).
2. Classify visible change strictly into: "Improved", "Similar", "Worsened", or "Unclear".
3. NEVER claim to diagnose clinical recovery purely from an image. Use phrasing like "visible changes may suggest improvement in surface redness/crusting".
4. State explicitly: "Visual improvement on the surface does NOT mean underlying infection or parasites are fully resolved. Never stop veterinary prescribed treatments without consulting your vet."
5. Translate all output into ${languageName} (${language}).`;

  const userPrompt = `Compare these two animal health images taken on different dates:
Original Photo Date: ${originalDate || "Initial Screening"}
Follow-Up Photo Date: ${newDate || "Today"}
Animal: ${animalType || "Animal"}
Monitored Condition: ${conditionName || "Visible Lesion"}
Language: ${languageName} (${language})

Image 1 is the original baseline photo.
Image 2 is the latest follow-up photo.

Evaluate visible changes and return strictly JSON.`;

  const jsonSchema = {
    type: Type.OBJECT,
    properties: {
      status: {
        type: Type.STRING,
        description: "'Improved', 'Similar', 'Worsened', or 'Unclear'",
      },
      summary: {
        type: Type.STRING,
        description: "Brief 1-2 sentence empathetic explanation of observable changes.",
      },
      visibleChanges: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Bullet points detailing specific visual differences (e.g. reduction in swelling, cleaner margins).",
      },
      limitations: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Limitations of photo-based progress comparison.",
      },
      recommendedNextStep: {
        type: Type.STRING,
        description: "Recommended next step for the caregiver.",
      },
    },
    required: ["status", "summary", "visibleChanges", "limitations", "recommendedNextStep"],
  };

  const parsedOriginal = parseBase64Image(originalImageBase64, "image/jpeg");
  const parsedNew = parseBase64Image(newImageBase64, "image/jpeg");

  const parts = [
    { inlineData: { mimeType: parsedOriginal.mimeType, data: parsedOriginal.data } },
    { inlineData: { mimeType: parsedNew.mimeType, data: parsedNew.data } },
    { text: userPrompt },
  ];

  try {
    const { text: responseText } = await generateWithModelFallback({
      parts,
      systemInstruction,
      jsonSchema,
      candidateModels: DEFAULT_CANDIDATE_MODELS,
    });

    let parsed: any;
    const sanitizedResponse = responseText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    try {
      parsed = JSON.parse(sanitizedResponse);
    } catch {
      const match = sanitizedResponse.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error("Malformed comparison output.");
    }

    return res.json(parsed);
  } catch (err: any) {
    console.error("Comparison error:", err);
    return res.status(500).json({
      error: err.message || "Failed to compare photos.",
      fallback: {
        status: "Unclear",
        summary: "Could not automatically assess visual difference. Please consult a veterinarian for an in-person follow-up.",
        visibleChanges: ["Differences could not be reliably determined due to lighting/angle variations."],
        limitations: ["Image comparison cannot replace a hands-on physical veterinary checkup."],
        recommendedNextStep: "Schedule a follow-up visit with your veterinarian.",
      },
    });
  }
});

// Root endpoint for API status and health check reference
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "VetCheck API Server",
    version: "1.0.0",
    health: "/api/health",
  });
});

// Explicit API 404 Handler
app.all("/api/*", (req, res) => {
  res.status(404).json({
    error: `API route not found: ${req.method} ${req.originalUrl}`,
    code: 404,
  });
});

// Setup Vite in Dev or API-only Fallback in Production
async function startServer() {
  const isProd =
    process.env.NODE_ENV === "production" ||
    (typeof __filename !== "undefined" && __filename.includes("dist"));

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
        port: PORT,
        watch: {
          ignored: [
            "**/.server-reminders.json",
            "**/.vapid-keys.json",
            "**/.env*",
            "**/*.json",
            "**/.git/**",
            "**/.firebase/**",
            "**/dist/**",
            "**/node_modules/**",
          ],
        },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  // Fallback 404 handler for unknown non-API routes in API-only mode (Render/production)
  app.use((req, res) => {
    res.status(404).json({
      error: `Not Found: ${req.method} ${req.originalUrl}`,
      message: "VetCheck backend is API-only. Frontend is hosted on Firebase Hosting.",
      code: 404,
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`VetCheck API server running on http://0.0.0.0:${PORT}`);
    startReminderScheduler(30000);
  });
}

startServer();
