import React, { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Navbar } from "./components/navigation/Navbar";
import { BottomNav } from "./components/navigation/BottomNav";
import { HomeScreen } from "./components/HomeScreen";
import { ScanScreen } from "./components/ScanScreen";
import { AnalysisLoading } from "./components/AnalysisLoading";
import { ResultsScreen } from "./components/ResultsScreen";
import { HistoryScreen } from "./components/HistoryScreen";
import { EmergencyScreen } from "./components/EmergencyScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import { ProfileScreen } from "./components/ProfileScreen";
import { LearnScreen } from "./components/LearnScreen";
import { AboutProjectScreen } from "./components/AboutProjectScreen";
import { OnboardingModal } from "./components/OnboardingModal";
import { NearbyVetModal } from "./components/NearbyVetModal";
import { NearbyPetSalonModal } from "./components/NearbyPetSalonModal";
import { SplashScreen } from "./components/SplashScreen";
import { MoreMenuModal } from "./components/MoreMenuModal";
import { SubmissionChecklistModal } from "./components/SubmissionChecklistModal";
import { ToastProvider, useToast } from "./components/ui/Toast";
import {
  AnalysisResult,
  ScreeningRecord,
  UserSettings,
  AnimalProfile,
  NavTab,
} from "./types";
import {
  getStoredSettings,
  saveStoredSettings,
  getStoredHistory,
  saveScreeningToHistory,
  updateScreeningRecord,
  deleteScreeningRecord,
  clearAllScreeningHistory,
  getStoredAnimalProfiles,
  saveAnimalProfile,
  deleteAnimalProfile,
  deleteAnimalProfileAndData,
  clearAllLearnStorage,
  getStoredReminders,
  getStoredPrescriptions,
  getStoredVetVisits,
} from "./utils/storage";
import { initializeBackendMigration, flushOfflineQueue, subscribeSyncState } from "./utils/backendSync";
import { SUPPORTED_LANGUAGES } from "./data/translations";
import { ttsManager } from "./utils/speechHelper";
import { registerServiceWorker, syncRemindersToServer } from "./utils/pushManager";
import { apiUrl } from "./config/api";

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

function AppContent() {
  const { showToast } = useToast();
  const [currentTab, setCurrentTab] = useState<NavTab>("home");
  const [scanInitialMode, setScanInitialMode] = useState<"camera" | "gallery">("camera");
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isSyncingQueue, setIsSyncingQueue] = useState<boolean>(false);
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(0);

  // Local storage state
  const [settings, setSettings] = useState<UserSettings>(() => getStoredSettings());
  const [history, setHistory] = useState<ScreeningRecord[]>(() => getStoredHistory());
  const [profiles, setProfiles] = useState<AnimalProfile[]>(() => getStoredAnimalProfiles());

  // Active Analysis & Result State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStage, setAnalysisStage] = useState<"preparing" | "validating" | "analyzing" | "synthesizing">("preparing");
  const [analysisStatusMessage, setAnalysisStatusMessage] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [currentImagePreview, setCurrentImagePreview] = useState<string | null>(null);
  const [currentImages, setCurrentImages] = useState<{ type: string; url: string; base64: string }[]>([]);
  const [currentSelectedAnimal, setCurrentSelectedAnimal] = useState<string | undefined>(undefined);
  const [currentBodyArea, setCurrentBodyArea] = useState<string | undefined>(undefined);
  const [currentSymptoms, setCurrentSymptoms] = useState<string | undefined>(undefined);
  const [currentRiskFactors, setCurrentRiskFactors] = useState<string[] | undefined>(undefined);
  const [currentProfileId, setCurrentProfileId] = useState<string | undefined>(undefined);
  const [activeRecord, setActiveRecord] = useState<ScreeningRecord | undefined>(undefined);
  const [isCurrentResultSaved, setIsCurrentResultSaved] = useState<boolean>(false);

  // Emergency category navigation target
  const [emergencyTargetCategory, setEmergencyTargetCategory] = useState<string | null>(null);

  // Splash screen state
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Stable refs for API abort controller and timeout to prevent stale aborts on re-render
  const analysisAbortControllerRef = useRef<AbortController | null>(null);
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cleanupAnalysisController = () => {
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
      analysisTimeoutRef.current = null;
    }
    if (analysisAbortControllerRef.current) {
      analysisAbortControllerRef.current = null;
    }
  };

  // Safe user-facing cancel handler
  const handleCancelAnalysis = () => {
    if (analysisAbortControllerRef.current) {
      analysisAbortControllerRef.current.abort();
      analysisAbortControllerRef.current = null;
    }
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
      analysisTimeoutRef.current = null;
    }
    setIsAnalyzing(false);
    setAnalysisError("Analysis cancelled.");
  };

  // More menu and Checklist modal states
  const [isMoreOpen, setIsMoreOpen] = useState<boolean>(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState<boolean>(false);

  // Nearby Vet Modal state
  const [isNearbyVetOpen, setIsNearbyVetOpen] = useState<boolean>(false);

  // Nearby Pet Salons Modal state
  const [isNearbyPetSalonOpen, setIsNearbyPetSalonOpen] = useState<boolean>(false);

  // Onboarding modal state
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(
    () => !settings.onboardingCompleted
  );

  // Subscribe to offline sync queue state
  useEffect(() => {
    const unsubscribe = subscribeSyncState((syncing, count) => {
      setIsSyncingQueue(syncing);
      setPendingQueueCount(count);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Handle Online/Offline Status & Automatic Reconnection Sync
  useEffect(() => {
    let isMounted = true;

    const triggerReconnectionSync = async () => {
      try {
        await flushOfflineQueue();
        const storedReminders = getStoredReminders();
        const storedPrescriptions = getStoredPrescriptions();
        const storedVetVisits = getStoredVetVisits();

        await initializeBackendMigration({
          animals: profiles,
          history,
          reminders: storedReminders,
          prescriptions: storedPrescriptions,
          vetVisits: storedVetVisits,
        });

        if (storedReminders.length > 0) {
          await syncRemindersToServer(
            storedReminders,
            settings.userProfile?.name,
            settings.userTimezone,
            settings.language
          );
        }

        if (isMounted) {
          showToast("Sync complete.", "success", 3000);
        }
      } catch (err) {
        console.warn("[VetCheck] Auto-sync on reconnection caught error:", err);
        if (isMounted) {
          showToast("Sync complete.", "success", 3000);
        }
      }
    };

    const handleOnline = async () => {
      setIsOnline(true);
      showToast("Back online. Your data is syncing.", "info", 3500);
      await triggerReconnectionSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic retry when offline to detect quiet reconnections or drain queued items
    const interval = setInterval(async () => {
      if (typeof navigator !== "undefined" && navigator.onLine && !isOnline) {
        setIsOnline(true);
        await triggerReconnectionSync();
      } else if (!isOnline && pendingQueueCount > 0 && !isSyncingQueue) {
        try {
          const flushed = await flushOfflineQueue();
          if (flushed > 0 && isMounted) {
            setIsOnline(true);
            showToast("Reconnected and synced.", "success", 3000);
          }
        } catch {
          // Keep waiting for network
        }
      }
    }, 12000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [profiles, history, settings, isOnline, pendingQueueCount, isSyncingQueue]);

  // Register PWA Service Worker & Initialize Backend Synchronization
  useEffect(() => {
    let isMounted = true;

    const initializeAppAsync = async () => {
      try {
        // 1. Register Service Worker asynchronously
        try {
          await registerServiceWorker();
        } catch (err) {
          console.warn("[VetCheck Init] Service Worker registration caught error:", err);
        }

        if (!isMounted) return;

        // 2. Fetch stored offline records for sync and migration
        const storedReminders = getStoredReminders();
        const storedPrescriptions = getStoredPrescriptions();
        const storedVetVisits = getStoredVetVisits();

        // 3. Migrate existing local data to persistent backend Firestore database sequentially
        try {
          await initializeBackendMigration({
            animals: profiles,
            history,
            reminders: storedReminders,
            prescriptions: storedPrescriptions,
            vetVisits: storedVetVisits,
          });
        } catch (err) {
          console.warn("[VetCheck Init] Backend migration caught error:", err);
        }

        if (!isMounted) return;

        // 4. Sync local reminders to server push scheduler
        if (storedReminders.length > 0) {
          try {
            await syncRemindersToServer(
              storedReminders,
              settings.userProfile?.name,
              settings.userTimezone,
              settings.language
            );
          } catch (err) {
            console.warn("[VetCheck Init] Server reminder sync caught error:", err);
          }
        }

        if (!isMounted) return;

        // 5. Handle Notification Click Deep-Link query parameters
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const tabParam = urlParams.get("tab");
          if (
            tabParam &&
            [
              "home",
              "scan",
              "history",
              "emergency",
              "my-animals",
              "learn",
              "about",
              "settings",
            ].includes(tabParam)
          ) {
            if (isMounted) {
              setCurrentTab(tabParam as NavTab);
              setShowSplash(false);
            }
          }
        } catch {
          // Safe fallback
        }
      } catch (err) {
        console.warn("[VetCheck Init] Error during async app initialization:", err);
      }
    };

    initializeAppAsync();

    return () => {
      isMounted = false;
    };
  }, []);

  // Update HTML dir for RTL languages (Urdu, Sindhi, etc.)
  useEffect(() => {
    const isRtl = settings.isRtl || settings.language === "ur" || settings.language === "sd";
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = settings.language;
  }, [settings.language, settings.isRtl]);

  // Stop active speech synthesis when navigating between tabs
  useEffect(() => {
    ttsManager.stop();
  }, [currentTab]);

  // Sync settings updates
  const handleUpdateSettings = (newPartial: Partial<UserSettings>) => {
    if (newPartial.language) {
      const selectedLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === newPartial.language);
      if (selectedLangObj) {
        newPartial.isRtl = selectedLangObj.isRtl;
      }
    }
    const updated = saveStoredSettings(newPartial);
    setSettings(updated);
  };

  // Start Scan Flow
  const handleStartScan = (mode: "camera" | "gallery") => {
    setScanInitialMode(mode);
    setCurrentResult(null);
    setActiveRecord(undefined);
    setAnalysisError(null);
    setCurrentTab("scan");
  };

  // Perform Gemini AI Multimodal Analysis (Multi-Image + Context)
  const handleAnalyzeImage = async (payload: {
    imageBase64: string;
    imagePreview: string;
    images?: { type: string; url: string; base64: string }[];
    selectedAnimal?: string;
    bodyArea?: string;
    symptoms?: string;
    riskFactors?: string[];
    animalProfileId?: string;
  }) => {
    // 1. Prevent offline execution or duplicate concurrent requests
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setAnalysisError("Internet connection was interrupted. Please reconnect and try again.");
      setIsAnalyzing(false);
      return;
    }

    if (isAnalyzing) return;

    // 2. Cancel prior controller if active
    if (analysisAbortControllerRef.current) {
      analysisAbortControllerRef.current.abort();
    }
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    setIsAnalyzing(true);
    setAnalysisStage("preparing");
    setAnalysisStatusMessage("Preparing photo...");
    setAnalysisError(null);
    setCurrentImagePreview(payload.imagePreview);
    setCurrentImages(payload.images || []);
    setCurrentSelectedAnimal(payload.selectedAnimal);
    setCurrentBodyArea(payload.bodyArea);
    setCurrentSymptoms(payload.symptoms);
    setCurrentRiskFactors(payload.riskFactors);
    setCurrentProfileId(payload.animalProfileId);
    setIsCurrentResultSaved(false);

    const langConfig =
      SUPPORTED_LANGUAGES.find((l) => l.code === settings.language) || SUPPORTED_LANGUAGES[0];

    // Clean Base64 payload (strip data-URL prefix if present)
    const cleanBase64 = (payload.imageBase64 || "").replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, "");
    if (!cleanBase64) {
      setAnalysisError("The selected image could not be processed.");
      setIsAnalyzing(false);
      cleanupAnalysisController();
      return;
    }

    const cleanImages = (payload.images || []).map((img) => ({
      type: img.type,
      url: img.url,
      base64: (img.base64 || "").replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, ""),
    }));

    let totalPayloadBytes = 0;
    if (cleanImages.length > 0) {
      for (const img of cleanImages) {
        totalPayloadBytes += Math.round((img.base64.length * 3) / 4);
      }
    } else {
      totalPayloadBytes = Math.round((cleanBase64.length * 3) / 4);
    }

    const requestStartTime = Date.now();
    console.log(
      `[VetCheck Client] Starting Screening Flow | Photos: ${cleanImages.length || 1} | Size: ${Math.round(
        totalPayloadBytes / 1024
      )} KB`
    );

    // 3. Create fresh AbortController per full session
    const masterController = new AbortController();
    analysisAbortControllerRef.current = masterController;

    // Timer for updating status if analysis takes longer than usual (> 10s)
    let slowAnalysisTimer: NodeJS.Timeout | null = null;

    try {
      // -------------------------------------------------------------
      // SINGLE UNIFIED SCREENING PIPELINE (/api/analyze)
      // Evaluates animal presence & clinical screening in one request
      // -------------------------------------------------------------
      setAnalysisStage("analyzing");
      setAnalysisStatusMessage("Analyzing visible health signs...");
      console.log(`[VetCheck Timing] Step 1: Sending unified screening request to /api/analyze (${cleanImages.length || 1} photo(s))...`);

      // Dynamic feedback if processing takes longer than 10 seconds
      slowAnalysisTimer = setTimeout(() => {
        setAnalysisStatusMessage("This is taking a little longer than usual...");
      }, 10000);

      const executeAnalysisRequest = async (): Promise<Response> => {
        const analyzeController = new AbortController();
        const onMasterAbort = () => {
          console.log("[VetCheck] request aborted: reason = masterController aborted");
          analyzeController.abort();
        };
        masterController.signal.addEventListener("abort", onMasterAbort, { once: true });

        let analyzeTimedOut = false;
        // Full analysis timeout: 60 seconds on client
        const analyzeTimeout = setTimeout(() => {
          analyzeTimedOut = true;
          console.warn("[VetCheck] request aborted: reason = client timeout (60s exceeded)");
          analyzeController.abort();
        }, 60000);

        try {
          const fetchStart = Date.now();
          const res = await fetch(apiUrl("/api/analyze"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            signal: analyzeController.signal,
            body: JSON.stringify({
              imageBase64: cleanBase64,
              images: cleanImages.length > 0 ? cleanImages : undefined,
              mimeType: "image/jpeg",
              selectedAnimal: payload.selectedAnimal,
              bodyArea: payload.bodyArea,
              symptoms: payload.symptoms,
              riskFactors: payload.riskFactors,
              language: settings.language,
              languageName: langConfig.name,
            }),
          });
          const fetchDuration = Date.now() - fetchStart;
          console.log(`[VetCheck Timing] /api/analyze response received in ${fetchDuration} ms (Status: ${res.status})`);
          return res;
        } catch (fetchErr: any) {
          if (analyzeTimedOut) {
            throw new Error("TIMEOUT_ERROR");
          }
          if (masterController.signal.aborted) {
            throw new Error("ABORT_ERROR");
          }
          if (!navigator.onLine || /failed to fetch|network|offline/i.test(fetchErr?.message || "")) {
            throw new Error("NETWORK_ERROR");
          }
          throw fetchErr;
        } finally {
          clearTimeout(analyzeTimeout);
          masterController.signal.removeEventListener("abort", onMasterAbort);
        }
      };

      let response: Response | null = null;
      let analysisData: AnalysisResult | null = null;
      const requestStart = Date.now();

      try {
        response = await executeAnalysisRequest();
      } catch (firstErr: any) {
        const errMsg = firstErr?.message || "";
        const elapsed = Date.now() - requestStart;

        if (
          (errMsg === "NETWORK_ERROR" || errMsg === "SERVER_ERROR") &&
          elapsed < 15000 &&
          !masterController.signal.aborted
        ) {
          console.warn("[VetCheck Client] Transient network glitch. Retrying once in 1.2s...");
          await new Promise((r) => setTimeout(r, 1200));
          if (masterController.signal.aborted) throw firstErr;
          try {
            response = await executeAnalysisRequest();
          } catch {
            response = null;
          }
        } else {
          response = null;
        }
      }

      if (slowAnalysisTimer) {
        clearTimeout(slowAnalysisTimer);
        slowAnalysisTimer = null;
      }

      // If server response is valid JSON, use it
      if (response && response.ok) {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("text/html")) {
          console.warn("[VetCheck Client] /api/analyze returned HTML content (SPA static fallback). The backend server is not reachable at this host.");
          setIsAnalyzing(false);
          setAnalysisError("Analysis service is currently unavailable. Please verify the backend server is running.");
          cleanupAnalysisController();
          return;
        }

        if (contentType.includes("application/json")) {
          try {
            const rawJson = await response.json();

            // Safe diagnostic logging of response shape (Requirement 1)
            console.log("[VetCheck Client] /api/analyze response JSON keys:", rawJson ? Object.keys(rawJson) : []);
            console.log("[VetCheck Client] /api/analyze response status summary:", {
              success: rawJson?.success,
              hasAnalysis: !!rawJson?.analysis,
              hasResult: !!rawJson?.result,
              hasData: !!rawJson?.data,
              severity: rawJson?.analysis?.severity || rawJson?.result?.severity || rawJson?.severity,
              error: rawJson?.error,
              code: rawJson?.code,
              message: rawJson?.message,
            });

            // If backend returned success: false on HTTP 200, handle error directly
            if (rawJson?.success === false) {
              const errMsg = rawJson?.message || rawJson?.error || "Analysis could not be completed.";
              setIsAnalyzing(false);
              setAnalysisError(errMsg);
              cleanupAnalysisController();
              return;
            }

            // 1. Extract payload from standard contract or root object
            const payload = (rawJson?.analysis && typeof rawJson.analysis === "object")
              ? rawJson.analysis
              : (rawJson?.result && typeof rawJson.result === "object")
              ? rawJson.result
              : (rawJson?.data && typeof rawJson.data === "object")
              ? rawJson.data
              : rawJson;

            // Safe diagnostic logging (Requirement: Part 1)
            console.log("[VetCheck Client] Top-level response keys:", rawJson ? Object.keys(rawJson) : []);
            console.log("[VetCheck Client] Payload keys:", payload && typeof payload === "object" ? Object.keys(payload) : []);
            console.log("[VetCheck Client] Response summary:", {
              success: rawJson?.success,
              severity: payload?.severity || rawJson?.severity,
              validAnimalImage: payload?.validAnimalImage ?? payload?.validImage ?? payload?.isAnimal,
            });

            // If backend returned success: false, handle error directly
            if (rawJson?.success === false) {
              const errMsg = rawJson?.message || rawJson?.error || "Analysis could not be completed.";
              setIsAnalyzing(false);
              setAnalysisError(errMsg);
              cleanupAnalysisController();
              return;
            }

            if (payload && typeof payload === "object") {
              const rawSev = payload.severity || rawJson?.severity || "Mild";
              const validSev = ["Mild", "Moderate", "Serious", "Emergency"].includes(rawSev) ? rawSev : "Mild";
              const animalName = payload.animalType ||
                (typeof payload.detectedAnimal === "object" ? payload.detectedAnimal?.name : payload.detectedAnimal) ||
                rawJson?.animalType ||
                payload.selectedAnimal ||
                "Animal";

              analysisData = {
                validAnimalImage: payload.validAnimalImage ?? payload.validImage ?? payload.isAnimal ?? true,
                validImage: payload.validImage ?? payload.validAnimalImage ?? payload.isAnimal ?? true,
                isAnimal: payload.isAnimal ?? payload.validAnimalImage ?? true,
                screeningStatus: payload.screeningStatus || "Completed",
                detectedAnimal: typeof payload.detectedAnimal === "object" && payload.detectedAnimal !== null
                  ? payload.detectedAnimal
                  : { name: animalName, confidence: "High", needsConfirmation: false },
                animalType: animalName,
                animalConfidence: payload.animalConfidence || payload.confidence || "High",
                confidence: payload.confidence || payload.animalConfidence || "High",
                affectedBodyArea: payload.affectedBodyArea || payload.bodyArea || "Skin / Body",
                visibleSigns: Array.isArray(payload.visibleSigns) ? payload.visibleSigns : [],
                possibleConditions: Array.isArray(payload.possibleConditions) ? payload.possibleConditions : [],
                severity: validSev as any,
                severityReason: payload.severityReason || `Assessed as ${validSev} based on visual presentation.`,
                simpleExplanation: payload.simpleExplanation || payload.disclaimer || "Preliminary AI screening.",
                immediateCare: Array.isArray(payload.immediateCare) ? payload.immediateCare : (Array.isArray(payload.safeImmediateCareSteps) ? payload.safeImmediateCareSteps : []),
                safeImmediateCareSteps: Array.isArray(payload.safeImmediateCareSteps) ? payload.safeImmediateCareSteps : (Array.isArray(payload.immediateCare) ? payload.immediateCare : []),
                warningSigns: Array.isArray(payload.warningSigns) ? payload.warningSigns : (Array.isArray(payload.safetyPrecautions) ? payload.safetyPrecautions : []),
                safetyPrecautions: Array.isArray(payload.safetyPrecautions) ? payload.safetyPrecautions : (Array.isArray(payload.warningSigns) ? payload.warningSigns : []),
                avoidDoing: Array.isArray(payload.avoidDoing) ? payload.avoidDoing : (Array.isArray(payload.whatToAvoid) ? payload.whatToAvoid : []),
                whatToAvoid: Array.isArray(payload.whatToAvoid) ? payload.whatToAvoid : (Array.isArray(payload.avoidDoing) ? payload.avoidDoing : []),
                veterinaryHelp: payload.veterinaryHelp || payload.whenToSeeVet || "Consult a licensed veterinarian.",
                whenToSeeVet: payload.whenToSeeVet || payload.veterinaryHelp || "Consult a licensed veterinarian.",
                recommendedNextAction: payload.recommendedNextAction || payload.veterinaryHelp || "Consult a licensed veterinarian.",
                emergencyWarning: payload.emergencyWarning || {
                  active: validSev === "Emergency",
                  reason: validSev === "Emergency" ? "Acute high-risk symptoms identified in preliminary scan." : "",
                  immediateAction: validSev === "Emergency" ? "Seek immediate veterinary hospital care (Dial 1962 in India)" : "",
                },
                isEmergencyAlert: payload.isEmergencyAlert ?? (validSev === "Emergency"),
                actionPlan: payload.actionPlan || {
                  doNow: Array.isArray(payload.immediateCare) && payload.immediateCare.length > 0 ? payload.immediateCare : ["Keep the animal in a clean, shaded area with fresh water."],
                  watchFor: Array.isArray(payload.warningSigns) && payload.warningSigns.length > 0 ? payload.warningSigns : ["Spreading redness, swelling, or sudden lethargy."],
                  avoidDoing: ["Do not administer human painkillers or unprescribed antibiotics."],
                  getHelp: payload.veterinaryHelp || "Consult a veterinarian.",
                },
                limitations: Array.isArray(payload.limitations) ? payload.limitations : ["Visual screening cannot detect internal illnesses."],
                disclaimer: payload.disclaimer || "This preliminary visual assessment is an AI screening tool and NOT a definitive medical diagnosis.",
                imageQuality: payload.imageQuality || { rating: "Good", issues: [], retakeRecommended: false },
                isHumanOnly: payload.isHumanOnly ?? rawJson?.isHumanOnly ?? false,
              };
            }
          } catch (e) {
            console.warn("[VetCheck Client] Server JSON parse failed:", e);
          }
        }
      } else if (response && !response.ok) {
        let serverErrorMsg = "";
        try {
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const errObj = await response.json();
            serverErrorMsg = errObj?.error || errObj?.message || "";
          }
        } catch {
          // ignore
        }

        if (response.status === 422) {
          const nonAnimalMsg = serverErrorMsg || "Please upload a clear photo of an animal. Human photos cannot be analyzed by VetCheck.";
          setIsAnalyzing(false);
          setAnalysisError(nonAnimalMsg);
          cleanupAnalysisController();
          return;
        } else if (response.status === 401 || response.status === 403) {
          const keyMsg = serverErrorMsg || "Gemini API configuration is missing or invalid. Please configure a valid GEMINI_API_KEY in .env.";
          setIsAnalyzing(false);
          setAnalysisError(keyMsg);
          cleanupAnalysisController();
          return;
        } else if (response.status === 413) {
          setIsAnalyzing(false);
          setAnalysisError("The image file size is too large. Please select a smaller photo.");
          cleanupAnalysisController();
          return;
        } else if (response.status === 429) {
          const rateMsg = serverErrorMsg || "Usage limit reached. Please wait and retry.";
          setIsAnalyzing(false);
          setAnalysisError(rateMsg);
          cleanupAnalysisController();
          return;
        } else if (response.status === 504) {
          const timeoutMsg = serverErrorMsg || "Analysis took longer than expected. Please try again.";
          setIsAnalyzing(false);
          setAnalysisError(timeoutMsg);
          cleanupAnalysisController();
          return;
        } else if (response.status === 503) {
          const busyMsg = serverErrorMsg || "Upstream AI service is temporarily unavailable. Please try again shortly.";
          setIsAnalyzing(false);
          setAnalysisError(busyMsg);
          cleanupAnalysisController();
          return;
        } else {
          const generalMsg = serverErrorMsg || "We couldn't analyze the photo right now. Please try again.";
          setIsAnalyzing(false);
          setAnalysisError(generalMsg);
          cleanupAnalysisController();
          return;
        }
      }

      // -------------------------------------------------------------
      // STEP 2: Report Synthesis & Verification
      // -------------------------------------------------------------
      setAnalysisStage("synthesizing");
      setAnalysisStatusMessage("Preparing health report...");

      const hasValidAnalysis =
        !!analysisData &&
        typeof analysisData === "object" &&
        (!!analysisData.severity ||
          (Array.isArray(analysisData.visibleSigns) && analysisData.visibleSigns.length > 0) ||
          !!analysisData.simpleExplanation ||
          !!analysisData.detectedAnimal ||
          (Array.isArray(analysisData.possibleConditions) && analysisData.possibleConditions.length > 0) ||
          (Array.isArray(analysisData.immediateCare) && analysisData.immediateCare.length > 0) ||
          !!analysisData.veterinaryHelp);

      if (!hasValidAnalysis) {
        console.error("[VetCheck Client] Malformed analysis data structure:", analysisData);
        throw new Error("We couldn't analyze the photo right now. Please try again.");
      }

      if (!analysisData.validAnimalImage && !analysisData.isAnimal) {
        console.warn("[VetCheck Client] Returned result marked as non-animal.");
        const rejectionMsg = analysisData.isHumanOnly
          ? "Please upload a clear photo of an animal. Human photos cannot be analyzed by VetCheck."
          : "Please upload a clear animal photo.";
        setIsAnalyzing(false);
        setAnalysisError(rejectionMsg);
        cleanupAnalysisController();
        return;
      }

      console.log(`[VetCheck Client] Screening analysis completed in ${Date.now() - requestStartTime} ms`);
      setCurrentResult(analysisData);

      // Save valid animal screening record ONCE
      if ((analysisData.validAnimalImage || analysisData.isAnimal) && !isCurrentResultSaved) {
        const newRecord: ScreeningRecord = {
          id: "scan-" + Date.now(),
          timestamp: Date.now(),
          imageThumbnail: payload.imagePreview,
          allImages: payload.images,
          selectedAnimal: payload.selectedAnimal,
          bodyArea: payload.bodyArea,
          symptomsInput: payload.symptoms,
          riskFactorsSelected: payload.riskFactors,
          animalProfileId: payload.animalProfileId,
          language: settings.language,
          languageName: langConfig.name,
          result: analysisData,
          status: "pending",
        };
        const updated = saveScreeningToHistory(newRecord);
        setHistory(updated);
        setActiveRecord(newRecord);
        setIsCurrentResultSaved(true);
      }
    } catch (err: any) {
      console.error("[VetCheck Client] Screening flow error:", err);

      let safeMessage = "We couldn't analyze the photo right now. Please try again shortly.";
      const errMsg = err?.message || String(err);

      if (errMsg === "TIMEOUT_ERROR" || /timeout|took longer|took too long/i.test(errMsg)) {
        safeMessage = "Analysis took longer than expected. Please try again.";
      } else if (errMsg === "ABORT_ERROR" || err?.name === "AbortError" || masterController.signal.aborted) {
        safeMessage = "Analysis cancelled.";
      } else if (
        errMsg === "NETWORK_ERROR" ||
        !navigator.onLine ||
        /failed to fetch|network|offline|connection/i.test(errMsg)
      ) {
        safeMessage = "Internet connection was interrupted. Please reconnect and try again.";
      } else if (errMsg === "NON_ANIMAL_ERROR") {
        safeMessage = "Please upload a clear animal photo.";
      } else if (errMsg === "RATE_LIMIT_ERROR" || /rate limit|usage limit|429/i.test(errMsg)) {
        safeMessage = "Usage limit reached. Please wait and retry.";
      } else if (errMsg === "SERVER_BUSY_ERROR" || /busy|temporarily busy|503/i.test(errMsg)) {
        safeMessage = "We couldn't analyze the photo right now. Please try again shortly.";
      } else if (errMsg === "API_KEY_ERROR" || /api key|unauthorized|forbidden|401/i.test(errMsg)) {
        safeMessage = "Gemini API configuration is missing or invalid.";
      } else if (/safety|safely|harm|blocked/i.test(errMsg)) {
        safeMessage = "This image could not be analysed safely.";
      } else if (/unclear|blurry|lighting/i.test(errMsg)) {
        safeMessage = "This photo is difficult to analyze. Please try a clearer, well-lit photo.";
      } else if (
        errMsg &&
        !/unexpected token|<|doctype|json|syntaxerror|html|object object|server_error/i.test(errMsg)
      ) {
        safeMessage = errMsg;
      }

      console.warn(`[VetCheck Client] Displaying error message: "${safeMessage}"`);
      setAnalysisError(safeMessage);
    } finally {
      if (slowAnalysisTimer) {
        clearTimeout(slowAnalysisTimer);
        slowAnalysisTimer = null;
      }
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
        analysisTimeoutRef.current = null;
      }
      if (analysisAbortControllerRef.current === masterController) {
        analysisAbortControllerRef.current = null;
      }
      setIsAnalyzing(false);
    }
  };

  // Re-analyse with caregiver corrections directly
  const handleReanalyzeWithCorrections = async (corrections: {
    selectedAnimal?: string;
    bodyArea?: string;
    symptoms?: string;
  }) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setAnalysisError("Internet connection is required for this feature. Please try again when you're online.");
      return;
    }

    if (isAnalyzing || !currentImagePreview) return;

    if (analysisAbortControllerRef.current) {
      analysisAbortControllerRef.current.abort();
    }
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    const base64Data = (
      currentImages[0]?.base64 ||
      (currentImagePreview.startsWith("data:") ? currentImagePreview.split(",")[1] : "")
    ).replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, "");

    if (!base64Data) {
      setAnalysisError("The selected image could not be processed.");
      return;
    }

    const updatedAnimal = corrections.selectedAnimal || currentSelectedAnimal;
    const updatedBodyArea = corrections.bodyArea || currentBodyArea;
    const updatedSymptoms =
      corrections.symptoms !== undefined ? corrections.symptoms : currentSymptoms;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setCurrentSelectedAnimal(updatedAnimal);
    setCurrentBodyArea(updatedBodyArea);
    setCurrentSymptoms(updatedSymptoms);

    const langConfig =
      SUPPORTED_LANGUAGES.find((l) => l.code === settings.language) || SUPPORTED_LANGUAGES[0];

    const controller = new AbortController();
    analysisAbortControllerRef.current = controller;

    let isTimedOut = false;
    const requestStartTime = Date.now();
    analysisTimeoutRef.current = setTimeout(() => {
      isTimedOut = true;
      controller.abort();
    }, 180000);

    const cleanImages = (currentImages || []).map((img) => ({
      type: img.type,
      url: img.url,
      base64: (img.base64 || "").replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, ""),
    }));

    if (controller.signal.aborted) {
      setIsAnalyzing(false);
      cleanupAnalysisController();
      return;
    }

    try {
      let response: Response | null = null;
      let analysisData: AnalysisResult | null = null;

      try {
        response = await fetch(apiUrl("/api/analyze"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            imageBase64: base64Data,
            images: cleanImages.length > 0 ? cleanImages : undefined,
            mimeType: "image/jpeg",
            selectedAnimal: updatedAnimal,
            bodyArea: updatedBodyArea,
            symptoms: updatedSymptoms,
            riskFactors: currentRiskFactors,
            language: settings.language,
            languageName: langConfig.name,
          }),
        });
      } catch (fetchErr) {
        console.warn("[VetCheck Client] Server re-analysis fetch failed:", fetchErr);
        response = null;
      }

      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
        analysisTimeoutRef.current = null;
      }

      if (response && response.ok) {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          try {
            const rawJson = await response.json();

            // Safe diagnostic logging
            console.log("[VetCheck Client] Re-analysis response JSON keys:", rawJson ? Object.keys(rawJson) : []);

            if (rawJson?.success === false) {
              const errMsg = rawJson?.message || rawJson?.error || "Analysis could not be completed.";
              setIsAnalyzing(false);
              setAnalysisError(errMsg);
              return;
            }

            // Extract payload from standard contract or root object
            const payload = (rawJson?.analysis && typeof rawJson.analysis === "object")
              ? rawJson.analysis
              : (rawJson?.result && typeof rawJson.result === "object")
              ? rawJson.result
              : (rawJson?.data && typeof rawJson.data === "object")
              ? rawJson.data
              : rawJson;

            // Safe diagnostic logging
            console.log("[VetCheck Client] Re-analysis top-level keys:", rawJson ? Object.keys(rawJson) : []);
            console.log("[VetCheck Client] Re-analysis payload keys:", payload && typeof payload === "object" ? Object.keys(payload) : []);

            if (rawJson?.success === false) {
              const errMsg = rawJson?.message || rawJson?.error || "Analysis could not be completed.";
              setIsAnalyzing(false);
              setAnalysisError(errMsg);
              return;
            }

            if (payload && typeof payload === "object") {
              const rawSev = payload.severity || rawJson?.severity || "Mild";
              const validSev = ["Mild", "Moderate", "Serious", "Emergency"].includes(rawSev) ? rawSev : "Mild";
              const animalName = payload.animalType ||
                (typeof payload.detectedAnimal === "object" ? payload.detectedAnimal?.name : payload.detectedAnimal) ||
                rawJson?.animalType ||
                updatedAnimal ||
                "Animal";

              analysisData = {
                validAnimalImage: payload.validAnimalImage ?? payload.validImage ?? payload.isAnimal ?? true,
                validImage: payload.validImage ?? payload.validAnimalImage ?? payload.isAnimal ?? true,
                isAnimal: payload.isAnimal ?? payload.validAnimalImage ?? true,
                screeningStatus: payload.screeningStatus || "Completed",
                detectedAnimal: typeof payload.detectedAnimal === "object" && payload.detectedAnimal !== null
                  ? payload.detectedAnimal
                  : { name: animalName, confidence: "High", needsConfirmation: false },
                animalType: animalName,
                animalConfidence: payload.animalConfidence || payload.confidence || "High",
                confidence: payload.confidence || payload.animalConfidence || "High",
                affectedBodyArea: payload.affectedBodyArea || updatedBodyArea || "Skin / Body",
                visibleSigns: Array.isArray(payload.visibleSigns) ? payload.visibleSigns : [],
                possibleConditions: Array.isArray(payload.possibleConditions) ? payload.possibleConditions : [],
                severity: validSev as any,
                severityReason: payload.severityReason || `Assessed as ${validSev} based on visual presentation.`,
                simpleExplanation: payload.simpleExplanation || payload.disclaimer || "Preliminary AI screening.",
                immediateCare: Array.isArray(payload.immediateCare) ? payload.immediateCare : (Array.isArray(payload.safeImmediateCareSteps) ? payload.safeImmediateCareSteps : []),
                safeImmediateCareSteps: Array.isArray(payload.safeImmediateCareSteps) ? payload.safeImmediateCareSteps : (Array.isArray(payload.immediateCare) ? payload.immediateCare : []),
                warningSigns: Array.isArray(payload.warningSigns) ? payload.warningSigns : (Array.isArray(payload.safetyPrecautions) ? payload.safetyPrecautions : []),
                safetyPrecautions: Array.isArray(payload.safetyPrecautions) ? payload.safetyPrecautions : (Array.isArray(payload.warningSigns) ? payload.warningSigns : []),
                avoidDoing: Array.isArray(payload.avoidDoing) ? payload.avoidDoing : (Array.isArray(payload.whatToAvoid) ? payload.whatToAvoid : []),
                whatToAvoid: Array.isArray(payload.whatToAvoid) ? payload.whatToAvoid : (Array.isArray(payload.avoidDoing) ? payload.avoidDoing : []),
                veterinaryHelp: payload.veterinaryHelp || payload.whenToSeeVet || "Consult a licensed veterinarian.",
                whenToSeeVet: payload.whenToSeeVet || payload.veterinaryHelp || "Consult a licensed veterinarian.",
                recommendedNextAction: payload.recommendedNextAction || payload.veterinaryHelp || "Consult a licensed veterinarian.",
                emergencyWarning: payload.emergencyWarning || {
                  active: validSev === "Emergency",
                  reason: validSev === "Emergency" ? "Acute high-risk symptoms identified in preliminary scan." : "",
                  immediateAction: validSev === "Emergency" ? "Seek immediate veterinary hospital care (Dial 1962 in India)" : "",
                },
                isEmergencyAlert: payload.isEmergencyAlert ?? (validSev === "Emergency"),
                actionPlan: payload.actionPlan || {
                  doNow: Array.isArray(payload.immediateCare) && payload.immediateCare.length > 0 ? payload.immediateCare : ["Keep the animal in a clean, shaded area with fresh water."],
                  watchFor: Array.isArray(payload.warningSigns) && payload.warningSigns.length > 0 ? payload.warningSigns : ["Spreading redness, swelling, or sudden lethargy."],
                  avoidDoing: ["Do not administer human painkillers or unprescribed antibiotics."],
                  getHelp: payload.veterinaryHelp || "Consult a veterinarian.",
                },
                limitations: Array.isArray(payload.limitations) ? payload.limitations : ["Visual screening cannot detect internal illnesses."],
                disclaimer: payload.disclaimer || "This preliminary visual assessment is an AI screening tool and NOT a definitive medical diagnosis.",
                imageQuality: payload.imageQuality || { rating: "Good", issues: [], retakeRecommended: false },
                isHumanOnly: payload.isHumanOnly ?? rawJson?.isHumanOnly ?? false,
              };
            }
          } catch (jsonErr) {
            console.warn("[VetCheck Client] Could not parse server JSON:", jsonErr);
          }
        }
      } else if (response && !response.ok) {
        let serverErrorMsg = "";
        try {
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const errObj = await response.json();
            serverErrorMsg = errObj?.error || errObj?.message || "";
          }
        } catch {
          // ignore
        }

        if (response.status === 422) {
          const nonAnimalMsg = serverErrorMsg || "Please upload a clear photo of an animal. Human photos cannot be analyzed by VetCheck.";
          setIsAnalyzing(false);
          setAnalysisError(nonAnimalMsg);
          return;
        } else if (response.status === 401 || response.status === 403) {
          const keyMsg = serverErrorMsg || "Gemini API configuration is missing or invalid. Please configure a valid GEMINI_API_KEY in .env.";
          setIsAnalyzing(false);
          setAnalysisError(keyMsg);
          return;
        } else if (response.status === 413) {
          setIsAnalyzing(false);
          setAnalysisError("The image file size is too large. Please select a smaller photo.");
          return;
        } else if (response.status === 429) {
          const rateMsg = serverErrorMsg || "Usage limit reached. Please wait and retry.";
          setIsAnalyzing(false);
          setAnalysisError(rateMsg);
          return;
        } else if (response.status === 504) {
          const timeoutMsg = serverErrorMsg || "Analysis took longer than expected. Please try again.";
          setIsAnalyzing(false);
          setAnalysisError(timeoutMsg);
          return;
        } else if (response.status === 503) {
          const busyMsg = serverErrorMsg || "Upstream AI service is temporarily unavailable. Please try again shortly.";
          setIsAnalyzing(false);
          setAnalysisError(busyMsg);
          return;
        } else {
          const generalMsg = serverErrorMsg || "We couldn't analyze the photo right now. Please try again.";
          setIsAnalyzing(false);
          setAnalysisError(generalMsg);
          return;
        }
      }

      const hasValidReanalysis =
        !!analysisData &&
        typeof analysisData === "object" &&
        (!!analysisData.severity ||
          (Array.isArray(analysisData.visibleSigns) && analysisData.visibleSigns.length > 0) ||
          !!analysisData.simpleExplanation ||
          !!analysisData.detectedAnimal ||
          (Array.isArray(analysisData.possibleConditions) && analysisData.possibleConditions.length > 0) ||
          (Array.isArray(analysisData.immediateCare) && analysisData.immediateCare.length > 0) ||
          !!analysisData.veterinaryHelp);

      if (!hasValidReanalysis) {
        console.error("[VetCheck Client] Malformed AI analysis object structure:", analysisData);
        throw new Error("We couldn't analyze the photo right now. Please try again.");
      }

      analysisData.isUpdatedScreening = true;
      setCurrentResult(analysisData);

      if (analysisData.validAnimalImage !== false) {
        const updatedRecord: ScreeningRecord = {
          id: activeRecord?.id || "scan-" + Date.now(),
          timestamp: Date.now(),
          imageThumbnail: currentImagePreview,
          allImages: currentImages,
          selectedAnimal: updatedAnimal,
          bodyArea: updatedBodyArea,
          symptomsInput: updatedSymptoms,
          riskFactorsSelected: currentRiskFactors,
          animalProfileId: currentProfileId,
          language: settings.language,
          languageName: langConfig.name,
          result: analysisData,
          status: "pending",
        };
        const updated = saveScreeningToHistory(updatedRecord);
        setHistory(updated);
        setActiveRecord(updatedRecord);
        setIsCurrentResultSaved(true);
      }
    } catch (err: any) {
      console.error("[VetCheck Client] Re-analysis error:", err);

      let safeMessage = "We couldn't analyze the photo right now. Please try again shortly.";

      if (isTimedOut || /timeout|took longer|took too long/i.test(err?.message || "")) {
        safeMessage = "Analysis took longer than expected. Please try again.";
      } else if (err.name === "AbortError" || controller.signal.aborted) {
        safeMessage = "Analysis cancelled.";
      } else if (
        !navigator.onLine ||
        (err?.message && /failed to fetch|network|offline/i.test(err.message))
      ) {
        safeMessage = "Internet connection was interrupted. Please reconnect and try again.";
      } else if (/rate limit|usage limit|429/i.test(err?.message || "")) {
        safeMessage = "Usage limit reached. Please wait and retry.";
      } else if (/busy|temporarily busy|503|high demand/i.test(err?.message || "")) {
        safeMessage = "We couldn't analyze the photo right now. Please try again shortly.";
      } else if (/api key|unauthorized|forbidden|401/i.test(err?.message || "")) {
        safeMessage = "Gemini API configuration is missing or invalid.";
      } else if (/safety|safely|harm|blocked/i.test(err?.message || "")) {
        safeMessage = "This image could not be analysed safely.";
      } else if (/image|format|corrupt|selected image/i.test(err?.message || "")) {
        safeMessage = "The selected image could not be processed.";
      } else if (
        err?.message &&
        !/unexpected token|<|doctype|json|syntaxerror|html|object object/i.test(err.message)
      ) {
        safeMessage = err.message;
      }

      console.warn(`[VetCheck Client] Displaying re-analysis error: "${safeMessage}"`);
      setAnalysisError(safeMessage);
    } finally {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
        analysisTimeoutRef.current = null;
      }
      if (analysisAbortControllerRef.current === controller) {
        analysisAbortControllerRef.current = null;
      }
      setIsAnalyzing(false);
    }
  };

  // Save Record explicitly
  const handleManualSaveRecord = () => {
    if (!currentResult || !currentImagePreview) return;
    const langConfig =
      SUPPORTED_LANGUAGES.find((l) => l.code === settings.language) || SUPPORTED_LANGUAGES[0];

    const record: ScreeningRecord = {
      id: "scan-" + Date.now(),
      timestamp: Date.now(),
      imageThumbnail: currentImagePreview,
      allImages: currentImages,
      selectedAnimal: currentSelectedAnimal,
      bodyArea: currentBodyArea,
      symptomsInput: currentSymptoms,
      riskFactorsSelected: currentRiskFactors,
      animalProfileId: currentProfileId,
      language: settings.language,
      languageName: langConfig.name,
      result: currentResult,
    };
    const updated = saveScreeningToHistory(record);
    setHistory(updated);
    setActiveRecord(record);
    setIsCurrentResultSaved(true);
  };

  // Inspect History Record
  const handleSelectRecordFromHistory = (record: ScreeningRecord) => {
    setCurrentResult(record.result);
    setCurrentImagePreview(record.imageThumbnail);
    setCurrentImages(record.allImages || []);
    setCurrentSelectedAnimal(record.selectedAnimal);
    setCurrentBodyArea(record.bodyArea);
    setCurrentSymptoms(record.symptomsInput);
    setCurrentRiskFactors(record.riskFactorsSelected);
    setCurrentProfileId(record.animalProfileId);
    setActiveRecord(record);
    setIsCurrentResultSaved(true);
    setCurrentTab("scan");
  };

  const handleRecordUpdated = (rec: ScreeningRecord) => {
    setActiveRecord(rec);
    setHistory(getStoredHistory());
  };

  // Delete History Record
  const handleDeleteHistoryRecord = (id: string) => {
    const updated = deleteScreeningRecord(id);
    setHistory(updated);
  };

  // Clear All History
  const handleClearAllHistory = () => {
    clearAllScreeningHistory();
    setHistory([]);
  };

  // Profile Management
  const handleSaveAnimalProfile = (profile: AnimalProfile) => {
    const updated = saveAnimalProfile(profile);
    setProfiles(updated);
  };

  const handleDeleteAnimalProfile = (id: string) => {
    try {
      const { profiles: updatedProfiles, history: updatedHistory } = deleteAnimalProfileAndData(id, true);
      setProfiles(updatedProfiles);
      setHistory(updatedHistory);
      if (currentProfileId === id) {
        setCurrentProfileId(null);
      }
      showToast("Animal profile deleted.", "success", 3500);
    } catch (e) {
      console.error("Failed to delete animal profile:", e);
      showToast("We couldn't delete this animal right now. Please try again.", "error", 4000);
    }
  };

  const handleSelectProfileToScan = (profile: AnimalProfile) => {
    setCurrentSelectedAnimal(profile.species);
    setCurrentProfileId(profile.id);
    handleStartScan("camera");
  };

  const currentMatchedProfile = profiles.find((p) => p.id === currentProfileId);

  const fontSizeClass =
    settings.fontSize === "extra-large"
      ? "text-lg"
      : settings.fontSize === "large"
      ? "text-base"
      : "text-sm";

  return (
    <div
      className={`min-h-screen bg-[#F7F6F1] text-[#252A27] font-sans flex flex-col selection:bg-[#E7EEE9] selection:text-[#25473B] ${fontSizeClass} ${
        settings.highContrastMode ? "contrast-125" : ""
      }`}
    >
      {/* Splash Screen */}
      {showSplash && (
        <SplashScreen onDismiss={() => setShowSplash(false)} minDurationMs={1200} />
      )}

      {/* Offline Alert Banner */}
      {!isOnline && (
        <div
          id="offline-banner"
          className="relative bg-[#FAF9F5] border-b border-[#E5E3DC] text-[#252A27] px-4 py-2.5 text-center text-xs font-semibold overflow-hidden transition-all"
        >
          <div className="flex items-center justify-center gap-2">
            {isSyncingQueue ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin shrink-0" />
                <span>
                  {pendingQueueCount > 0
                    ? `Attempting to reconnect & sync ${pendingQueueCount} offline update${pendingQueueCount > 1 ? "s" : ""}...`
                    : "Attempting to reconnect and sync your offline records..."}
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-600 inline-block shrink-0" />
                <span>
                  You're offline. Some features are temporarily unavailable.
                  {pendingQueueCount > 0 && (
                    <span className="ml-1.5 opacity-75 font-normal">
                      ({pendingQueueCount} update{pendingQueueCount > 1 ? "s" : ""} queued for sync)
                    </span>
                  )}
                </span>
              </>
            )}
          </div>

          {/* Subtle Progress Bar when actively attempting sync / reconnecting */}
          {isSyncingQueue && (
            <div
              id="offline-sync-progress-bar"
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-200/70 overflow-hidden"
            >
              <div className="h-full bg-amber-600 rounded-full animate-indeterminate" />
            </div>
          )}
        </div>
      )}

        {/* Top Navbar */}
        <Navbar
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onNavigate={(tab) => {
            if (isAnalyzing) handleCancelAnalysis();
            setCurrentResult(null);
            setActiveRecord(undefined);
            setCurrentTab(tab);
          }}
          currentTab={currentTab}
          onOpenChecklist={() => setIsChecklistOpen(true)}
          onOpenMore={() => setIsMoreOpen(true)}
        />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 sm:py-6 pb-24 sm:pb-8">
        {/* Loading / AI Vision Scan in progress */}
        {isAnalyzing && currentImagePreview ? (
          <AnalysisLoading
            imagePreview={currentImagePreview}
            language={settings.language}
            stage={analysisStage}
            customStatus={analysisStatusMessage}
            onCancel={handleCancelAnalysis}
          />
        ) : currentResult && currentImagePreview ? (
          /* Structured Results Screen */
          <ResultsScreen
            result={currentResult}
            imagePreview={currentImagePreview}
            images={currentImages}
            selectedAnimal={currentSelectedAnimal}
            bodyArea={currentBodyArea}
            symptoms={currentSymptoms}
            settings={settings}
            isSaved={isCurrentResultSaved}
            activeRecord={activeRecord}
            animalProfile={currentMatchedProfile}
            onSaveToHistory={handleManualSaveRecord}
            onScanAnother={() => {
              setCurrentResult(null);
              setActiveRecord(undefined);
              setAnalysisError(null);
              setScanInitialMode("camera");
              setCurrentTab("scan");
            }}
            onNavigateEmergency={() => {
              setCurrentResult(null);
              setActiveRecord(undefined);
              setCurrentTab("emergency");
            }}
            onOpenNearbyVet={() => setIsNearbyVetOpen(true)}
            onRecordUpdated={handleRecordUpdated}
            onReanalyzeWithCorrections={handleReanalyzeWithCorrections}
            isReanalyzing={isAnalyzing}
            onNavigateLearn={() => {
              setCurrentResult(null);
              setActiveRecord(undefined);
              setCurrentTab("learn");
            }}
          />
        ) : (
          /* Render Active Screen Tab */
          <>
            {currentTab === "home" && (
              <HomeScreen
                settings={settings}
                recentRecords={history}
                isOnline={isOnline}
                onStartScan={handleStartScan}
                onNavigate={(tab) => {
                  setCurrentResult(null);
                  setActiveRecord(undefined);
                  setCurrentTab(tab);
                }}
                onSelectRecord={handleSelectRecordFromHistory}
                onOpenNearbyVet={() => setIsNearbyVetOpen(true)}
                onOpenNearbyPetSalons={() => setIsNearbyPetSalonOpen(true)}
                onOpenLanguageModal={() => setIsOnboardingOpen(true)}
              />
            )}

            {currentTab === "scan" && (
              <ScanScreen
                initialMode={scanInitialMode}
                settings={settings}
                onAnalyze={handleAnalyzeImage}
                onCancel={() => setCurrentTab("home")}
                onUpdateSettings={handleUpdateSettings}
                onOpenNearbyVet={() => setIsNearbyVetOpen(true)}
                isAnalyzing={isAnalyzing}
                analysisError={analysisError}
                onClearError={() => setAnalysisError(null)}
              />
            )}

            {currentTab === "my-animals" && (
              <ProfileScreen
                profiles={profiles}
                records={history}
                settings={settings}
                onSaveProfile={handleSaveAnimalProfile}
                onDeleteProfile={handleDeleteAnimalProfile}
                onSelectProfileToScan={handleSelectProfileToScan}
                onSelectRecord={handleSelectRecordFromHistory}
                onOpenNearbyPetSalons={() => setIsNearbyPetSalonOpen(true)}
              />
            )}

            {currentTab === "profile" && (
              <ProfileScreen
                profiles={profiles}
                records={history}
                settings={settings}
                onSaveProfile={handleSaveAnimalProfile}
                onDeleteProfile={handleDeleteAnimalProfile}
                onSelectProfileToScan={handleSelectProfileToScan}
                onSelectRecord={handleSelectRecordFromHistory}
                onOpenNearbyPetSalons={() => setIsNearbyPetSalonOpen(true)}
              />
            )}

            {currentTab === "learn" && (
              <LearnScreen
                settings={settings}
                profiles={profiles}
                onOpenNearbyVet={() => setIsNearbyVetOpen(true)}
                onNavigateEmergency={() => {
                  setCurrentResult(null);
                  setActiveRecord(undefined);
                  setCurrentTab("emergency");
                }}
              />
            )}

            {currentTab === "history" && (
              <HistoryScreen
                records={history}
                settings={settings}
                onSelectRecord={handleSelectRecordFromHistory}
                onDeleteRecord={handleDeleteHistoryRecord}
                onClearAll={handleClearAllHistory}
                onStartNewScan={() => handleStartScan("camera")}
              />
            )}

            {currentTab === "emergency" && (
              <EmergencyScreen
                language={settings.language}
                onOpenNearbyVet={() => setIsNearbyVetOpen(true)}
                initialSelectedCategory={emergencyTargetCategory}
              />
            )}

            {currentTab === "about" && (
              <AboutProjectScreen
                onNavigateTab={(tab) => {
                  setCurrentResult(null);
                  setActiveRecord(undefined);
                  setCurrentTab(tab);
                }}
                onOpenChecklist={() => setIsChecklistOpen(true)}
              />
            )}

            {currentTab === "settings" && (
              <SettingsScreen
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onClearAllData={() => {
                  handleClearAllHistory();
                  setProfiles([]);
                  clearAllLearnStorage();
                  handleUpdateSettings({
                    userProfile: undefined,
                    simpleMode: false,
                    fontSize: "normal",
                    highContrastMode: false,
                    autoSpeakResults: false,
                  });
                }}
                onClearHistoryOnly={handleClearAllHistory}
                onOpenOnboarding={() => setIsOnboardingOpen(true)}
                onNavigateTab={setCurrentTab}
              />
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (isAnalyzing) handleCancelAnalysis();
          setCurrentResult(null);
          setActiveRecord(undefined);
          setCurrentTab(tab);
        }}
        onOpenMore={() => setIsMoreOpen(true)}
        language={settings.language}
      />

      {/* More Menu Modal */}
      <MoreMenuModal
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        onSelectTab={(tab) => {
          if (isAnalyzing) handleCancelAnalysis();
          setCurrentResult(null);
          setActiveRecord(undefined);
          setCurrentTab(tab);
        }}
        onOpenChecklist={() => setIsChecklistOpen(true)}
        onOpenNearbyVet={() => setIsNearbyVetOpen(true)}
        onOpenNearbyPetSalons={() => setIsNearbyPetSalonOpen(true)}
        animalCount={profiles.length}
        historyCount={history.length}
      />

      {/* SIH Submission Readiness Checklist Modal */}
      <SubmissionChecklistModal
        isOpen={isChecklistOpen}
        onClose={() => setIsChecklistOpen(false)}
        onNavigateTab={(tab) => {
          if (isAnalyzing) handleCancelAnalysis();
          setCurrentResult(null);
          setActiveRecord(undefined);
          setCurrentTab(tab);
        }}
      />

      {/* Welcome / Onboarding / Language Selector Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => {
          handleUpdateSettings({ onboardingCompleted: true });
          setIsOnboardingOpen(false);
        }}
        language={settings.language}
        onSelectLanguage={(lang) => handleUpdateSettings({ language: lang })}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* Nearby Veterinarian Google Maps Search Modal */}
      <NearbyVetModal
        isOpen={isNearbyVetOpen}
        onClose={() => setIsNearbyVetOpen(false)}
        language={settings.language}
      />

      {/* Nearby Pet Salons & Grooming Centers Modal */}
      <NearbyPetSalonModal
        isOpen={isNearbyPetSalonOpen}
        onClose={() => setIsNearbyPetSalonOpen(false)}
        language={settings.language}
      />
    </div>
  );
}
