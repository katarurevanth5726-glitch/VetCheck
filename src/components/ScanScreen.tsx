import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Upload,
  ImagePlus,
  RefreshCw,
  RotateCw,
  Mic,
  MicOff,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  X,
  Sparkles,
  ChevronRight,
  Zap,
  ShieldCheck,
  ShieldAlert,
  Sun,
  Eye,
  Heart,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Plus,
  Trash2,
  PhoneCall,
  MapPin,
  PawPrint,
  Check,
} from "lucide-react";
import { compressImage } from "../utils/imageCompressor";
import { VoiceRecognizer } from "../utils/speechHelper";
import { getTranslation } from "../data/translations";
import { UserSettings, MultiImageSlot, AnimalProfile } from "../types";
import { checkImageQuality, rotateImage90, DetailedImageQuality } from "../utils/imageQuality";
import { getStoredAnimalProfiles } from "../utils/storage";
import { useModalHistory } from "../utils/useModalHistory";

interface ScanScreenProps {
  initialMode?: "camera" | "gallery";
  settings: UserSettings;
  onAnalyze: (payload: {
    imageBase64: string;
    imagePreview: string;
    images?: { type: string; url: string; base64: string }[];
    selectedAnimal?: string;
    bodyArea?: string;
    symptoms?: string;
    riskFactors?: string[];
    animalProfileId?: string;
  }) => void;
  onCancel?: () => void;
  onUpdateSettings?: (updated: Partial<UserSettings>) => void;
  onOpenNearbyVet?: () => void;
  isAnalyzing?: boolean;
  analysisError?: string | null;
  onClearError?: () => void;
}

const COMMON_ANIMALS = [
  { id: "cow", label: "Cattle / Cow (गाय)", icon: "🐄" },
  { id: "buffalo", label: "Buffalo (भैंस)", icon: "🐃" },
  { id: "goat_sheep", label: "Goat / Sheep (बकरी/भेड़)", icon: "🐐" },
  { id: "dog", label: "Dog (कुत्ता)", icon: "🐕" },
  { id: "cat", label: "Cat (बिल्ली)", icon: "🐈" },
  { id: "poultry", label: "Poultry / Chicken (मुर्गी)", icon: "🐓" },
  { id: "horse", label: "Horse / Donkey (घोड़ा/गधा)", icon: "🐎" },
  { id: "other", label: "Other / Auto-detect (अन्य)", icon: "🐾" },
];

const BODY_AREAS = [
  { id: "skin_coat", label: "Skin or coat", icon: "🧴" },
  { id: "eyes", label: "Eyes", icon: "👁️" },
  { id: "ears", label: "Ears", icon: "👂" },
  { id: "mouth_teeth", label: "Mouth or teeth", icon: "🦷" },
  { id: "nose", label: "Nose", icon: "👃" },
  { id: "legs_paws", label: "Legs or paws", icon: "🐾" },
  { id: "hooves", label: "Hooves", icon: "🪵" },
  { id: "udder", label: "Udder", icon: "🥛" },
  { id: "abdomen", label: "Abdomen", icon: "🫄" },
  { id: "tail", label: "Tail", icon: "🐕" },
  { id: "wound_injury", label: "Wound or injury", icon: "🩹" },
  { id: "other", label: "Other", icon: "❓" },
  { id: "unknown", label: "I don't know", icon: "🤷" },
];

const RISK_FACTORS_LIST = [
  { id: "unable_to_stand", label: "Unable to stand (Downer)", icon: "🚨", isEmergency: true },
  { id: "difficulty_breathing", label: "Difficulty breathing / Gasping", icon: "🫁", isEmergency: true },
  { id: "heavy_bleeding", label: "Heavy / Spurting bleeding", icon: "🩸", isEmergency: true },
  { id: "possible_poisoning", label: "Possible poisoning / Ingestion", icon: "☠️", isEmergency: true },
  { id: "not_eating_drinking", label: "Not eating or drinking (2+ days)", icon: "🥣", isEmergency: false },
  { id: "very_young", label: "Very young animal (Newborn / Puppy)", icon: "👶", isEmergency: false },
  { id: "pregnant", label: "Pregnant animal", icon: "🤰", isEmergency: false },
  { id: "recently_delivered", label: "Recently delivered", icon: "🍼", isEmergency: false },
  { id: "elderly", label: "Elderly / Frail animal", icon: "👴", isEmergency: false },
];

export const ScanScreen: React.FC<ScanScreenProps> = ({
  initialMode = "camera",
  settings,
  onAnalyze,
  onCancel,
  onUpdateSettings,
  onOpenNearbyVet,
  isAnalyzing = false,
  analysisError = null,
  onClearError,
}) => {
  const lang = settings.language;
  const isSimple = settings.simpleMode;

  const [mode, setMode] = useState<"camera" | "gallery">(initialMode);
  const [activeSlotId, setActiveSlotId] = useState<"close_up" | "full_body" | "angle">("close_up");

  // Multi-Image Slots state (up to 3 photos)
  const [imageSlots, setImageSlots] = useState<MultiImageSlot[]>([
    {
      id: "close_up",
      title: "Primary Photo",
      description: "Focus closely on the affected area, skin, eyes, or wound",
      isOptional: false,
      dataUrl: null,
      base64: null,
      rotation: 0,
    },
    {
      id: "full_body",
      title: "Full Body (Optional)",
      description: "Show animal posture, stance, or general body condition",
      isOptional: true,
      dataUrl: null,
      base64: null,
      rotation: 0,
    },
    {
      id: "angle",
      title: "Second Angle (Optional)",
      description: "Different side view or closer lighting angle",
      isOptional: true,
      dataUrl: null,
      base64: null,
      rotation: 0,
    },
  ]);

  const [selectedAnimal, setSelectedAnimal] = useState<string>("");
  const [selectedBodyArea, setSelectedBodyArea] = useState<string>("");
  const [symptomsText, setSymptomsText] = useState<string>("");
  const [selectedRiskFactors, setSelectedRiskFactors] = useState<string[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [availableProfiles, setAvailableProfiles] = useState<AnimalProfile[]>([]);

  // Quality & validation states
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraNotice, setCameraNotice] = useState<{
    type: "dismissed" | "blocked" | "unsupported" | "error";
    message: string;
  } | null>(null);
  const [qualityWarning, setQualityWarning] = useState<string | null>(null);
  const [photoQualityData, setPhotoQualityData] = useState<DetailedImageQuality | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Consent modal state
  const [showConsentModal, setShowConsentModal] = useState<boolean>(false);

  useModalHistory({
    isOpen: showConsentModal,
    onClose: () => setShowConsentModal(false),
    modalKey: "scan_consent",
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showConsentModal) {
        setShowConsentModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showConsentModal]);

  // DOM & Processing Guards
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const voiceRecognizerRef = useRef<VoiceRecognizer | null>(null);
  const targetSlotIdRef = useRef<"close_up" | "full_body" | "angle">("close_up");
  const isProcessingRef = useRef<boolean>(false);

  // Load profiles
  useEffect(() => {
    try {
      const stored = getStoredAnimalProfiles();
      setAvailableProfiles(stored);
    } catch (e) {
      console.warn("Could not load animal profiles in scan screen:", e);
    }
  }, []);

  const handleProfileSelect = (profileId: string) => {
    setSelectedProfileId(profileId);
    if (!profileId) return;
    const found = availableProfiles.find((p) => p.id === profileId);
    if (found) {
      const matchedSpecies = COMMON_ANIMALS.find((a) =>
        a.label.toLowerCase().includes(found.species.toLowerCase())
      );
      if (matchedSpecies) {
        setSelectedAnimal(matchedSpecies.label);
      }
    }
  };

  const validSlots = imageSlots.filter((s) => !!s.dataUrl && !!s.base64);
  const uploadedCount = validSlots.length;
  const hasPrimaryImage = !!imageSlots.find((s) => s.id === "close_up")?.dataUrl;

  const activeEmergencyRisks = selectedRiskFactors.filter((rfId) => {
    const item = RISK_FACTORS_LIST.find((r) => r.id === rfId);
    return item?.isEmergency;
  });
  const hasEmergencyRisk = activeEmergencyRisks.length > 0;

  // Initialize Speech-to-Text Recognizer and ensure cleanup on unmount
  useEffect(() => {
    voiceRecognizerRef.current = new VoiceRecognizer();
    return () => {
      if (voiceRecognizerRef.current) {
        voiceRecognizerRef.current.stop();
      }
      stopCamera();
    };
  }, []);

  // Activate Camera stream ONLY when explicitly requested by user (cameraActive === true)
  useEffect(() => {
    if (mode === "camera" && cameraActive) {
      startCameraStream();
    } else {
      stopCameraStream();
    }
  }, [mode, cameraActive, cameraFacing]);

  const startCameraStream = async () => {
    stopCameraStream();
    setCameraNotice(null);

    // 1. Safely check secure context and MediaDevices / getUserMedia availability
    if (
      typeof window !== "undefined" &&
      window.isSecureContext === false &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      setCameraNotice({
        type: "unsupported",
        message:
          "Camera access requires a secure HTTPS connection on this network. Please choose a photo from your gallery.",
      });
      setCameraActive(false);
      setMode("gallery");
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      console.info("[VetCheck Camera] MediaDevices or getUserMedia is not supported in this browser environment.");
      setCameraNotice({
        type: "unsupported",
        message: "Camera access is not supported on this browser or device. You can choose a photo from your gallery.",
      });
      setCameraActive(false);
      setMode("gallery");
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      const errName = err?.name || "";
      const errMsg = (err?.message || "").toLowerCase();

      // Concise development logging without raising unhandled red console errors
      console.info(`[VetCheck Camera] Permission or access state: ${errName || "Info"} - ${err?.message || "Not opened"}`);

      stopCameraStream();
      setCameraActive(false);
      setMode("gallery");

      if (
        errName === "NotAllowedError" ||
        errName === "PermissionDeniedError" ||
        errMsg.includes("permission") ||
        errMsg.includes("dismissed")
      ) {
        if (errMsg.includes("denied") || errMsg.includes("block")) {
          setCameraNotice({
            type: "blocked",
            message:
              "Camera access is blocked for VetCheck. Allow camera permission in your browser settings, or upload an image from your gallery.",
          });
        } else {
          setCameraNotice({
            type: "dismissed",
            message:
              "Camera permission was not granted. You can allow camera access or choose an image from your gallery.",
          });
        }
      } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
        setCameraNotice({
          type: "unsupported",
          message: "No camera hardware was detected on your device. Please choose a photo from your gallery.",
        });
      } else if (errName === "NotReadableError" || errName === "TrackStartError") {
        setCameraNotice({
          type: "error",
          message:
            "Camera is currently in use by another application. Please close other camera apps, or choose an image from your gallery.",
        });
      } else {
        setCameraNotice({
          type: "dismissed",
          message:
            "Camera permission was not granted. You can allow camera access or choose an image from your gallery.",
        });
      }
    }
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = () => {
    setCameraNotice(null);
    setCameraActive(true);
    setMode("camera");
  };

  const stopCamera = () => {
    stopCameraStream();
    setCameraActive(false);
  };

  const flipCamera = () => {
    setCameraFacing((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Open camera specifically for an indexed slot (Explicit user action)
  const triggerCameraForSlot = (slotId: "close_up" | "full_body" | "angle") => {
    targetSlotIdRef.current = slotId;
    setActiveSlotId(slotId);
    startCamera();
  };

  // Open gallery picker specifically for an indexed slot
  const triggerGalleryForSlot = (slotId: "close_up" | "full_body" | "angle") => {
    targetSlotIdRef.current = slotId;
    setActiveSlotId(slotId);
    stopCamera();
    setMode("gallery");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  // Image Selection Handler for a specific slot with single-execution guard
  const handleImageSelectedForSlot = async (
    dataUrlOrFile: string | File,
    slotId: "close_up" | "full_body" | "angle"
  ) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsCompressing(true);
    setErrorMessage(null);
    setQualityWarning(null);
    setCameraNotice(null);

    try {
      const compressed = await compressImage(dataUrlOrFile, 1200, 1200, 0.78);

      // Prevent exact duplicate images across different slots
      const isDuplicate = imageSlots.some(
        (slot) => slot.id !== slotId && slot.base64 && slot.base64.slice(0, 100) === compressed.base64.slice(0, 100)
      );

      if (isDuplicate) {
        setErrorMessage("This image is already selected in another slot. Please choose a different photo or angle.");
        return;
      }

      // Check image quality on primary image or current slot
      const qCheck = await checkImageQuality(compressed.dataUrl);
      if (slotId === "close_up") {
        setPhotoQualityData(qCheck);
        if (qCheck.rating === "Poor" && qCheck.issues.length > 0) {
          setQualityWarning(qCheck.issues[0]);
        }
      }

      setImageSlots((prev) =>
        prev.map((slot) =>
          slot.id === slotId
            ? {
                ...slot,
                dataUrl: compressed.dataUrl,
                base64: compressed.base64,
                qualityRating: qCheck.rating,
                qualityIssues: qCheck.issues,
              }
            : slot
        )
      );

      stopCamera();
      setMode("gallery");
    } catch (err: any) {
      console.error("Image processing error:", err);
      setErrorMessage("Could not process image. Please try another photo.");
    } finally {
      setIsCompressing(false);
      isProcessingRef.current = false;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const targetSlot = targetSlotIdRef.current || activeSlotId || "close_up";
      handleImageSelectedForSlot(dataUrl, targetSlot);
    } catch (e) {
      setErrorMessage("Failed to capture frame from camera.");
    }
  };

  const handleRotateSlot = async (slotId: string) => {
    const slot = imageSlots.find((s) => s.id === slotId);
    if (!slot || !slot.dataUrl) return;

    try {
      const rotated = await rotateImage90(slot.dataUrl);
      const compressed = await compressImage(rotated, 1280, 1280, 0.82);
      setImageSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? {
                ...s,
                dataUrl: compressed.dataUrl,
                base64: compressed.base64,
                rotation: (s.rotation + 90) % 360,
              }
            : s
        )
      );
    } catch (e) {
      console.error("Rotation error:", e);
    }
  };

  const handleDeleteSlot = (slotId: string) => {
    setImageSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, dataUrl: null, base64: null, qualityRating: undefined, qualityIssues: undefined }
          : s
      )
    );
    if (slotId === "close_up") {
      setPhotoQualityData(null);
      setQualityWarning(null);
    }
  };

  const handleToggleRiskFactor = (rfId: string) => {
    setSelectedRiskFactors((prev) =>
      prev.includes(rfId) ? prev.filter((id) => id !== rfId) : [...prev, rfId]
    );
  };

  const toggleListening = () => {
    setVoiceError(null);
    if (isListening) {
      voiceRecognizerRef.current?.stop();
      setIsListening(false);
    } else {
      if (!voiceRecognizerRef.current?.isSupported()) {
        setVoiceError("Speech recognition is not supported in this browser.");
        return;
      }
      setIsListening(true);
      voiceRecognizerRef.current.start(
        (transcript) => {
          setSymptomsText((prev) => (prev ? `${prev} ${transcript}` : transcript));
          setIsListening(false);
        },
        (err) => {
          setVoiceError("Voice recognition error. Please try typing instead.");
          setIsListening(false);
        },
        lang
      );
    }
  };

  const handleSubmit = () => {
    const primarySlot = imageSlots.find((s) => s.id === "close_up");
    if (!primarySlot?.dataUrl || !primarySlot?.base64) {
      setErrorMessage("Please capture or upload Slot 1 (Required) photo of your animal.");
      return;
    }

    if (!settings.aiConsentAccepted) {
      setShowConsentModal(true);
      return;
    }

    executeScreening();
  };

  const executeScreening = () => {
    const primarySlot = imageSlots.find((s) => s.id === "close_up");
    if (!primarySlot?.dataUrl || !primarySlot?.base64) return;

    const currentValid = imageSlots.filter((s) => !!s.dataUrl && !!s.base64);
    const validImages = currentValid.map((s) => ({
      type: s.id,
      url: s.dataUrl!,
      base64: s.base64!,
    }));

    onAnalyze({
      imageBase64: primarySlot.base64!,
      imagePreview: primarySlot.dataUrl!,
      images: validImages,
      selectedAnimal: selectedAnimal || undefined,
      bodyArea: selectedBodyArea || undefined,
      symptoms: symptomsText || undefined,
      riskFactors: selectedRiskFactors.length > 0 ? selectedRiskFactors : undefined,
      animalProfileId: selectedProfileId || undefined,
    });
  };

  return (
    <div id="scan-screen-container" className="max-w-xl mx-auto space-y-4 pb-20 text-slate-800">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#154734]">
            📷 Scan Animal
          </h1>
          <p className="text-xs text-stone-500 font-medium">
            Take or upload a clear photo for preliminary health screening
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 bg-white border border-[#E8E2D5] cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center shadow-2xs"
            aria-label="Cancel scan"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Emergency Warning Banner (if emergency risk factors chosen) */}
      {hasEmergencyRisk && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-3xl space-y-2 text-rose-950 shadow-xs">
          <div className="flex items-center gap-2 text-rose-900 font-black text-xs sm:text-sm">
            <ShieldAlert aria-hidden="true" focusable="false" className="w-5 h-5 text-rose-600 shrink-0 animate-bounce" />
            <span>Emergency Sign Reported</span>
          </div>
          <p className="text-xs text-rose-900 leading-relaxed font-medium">
            Severe symptoms selected. Please call the emergency helpline or visit an animal hospital immediately.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href="tel:1962"
              className="bg-rose-700 hover:bg-rose-800 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-xs flex items-center gap-1.5 min-h-[44px]"
            >
              <PhoneCall aria-hidden="true" focusable="false" className="w-3.5 h-3.5" />
              <span>Call 1962 Helpline</span>
            </a>
            {onOpenNearbyVet && (
              <button
                type="button"
                onClick={onOpenNearbyVet}
                className="bg-white hover:bg-rose-50 text-rose-900 border border-rose-300 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <MapPin aria-hidden="true" focusable="false" className="w-3.5 h-3.5 text-rose-600" />
                <span>Find Emergency Clinic</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. SINGLE PHOTO UPLOAD SECTION (3 SLOTS) */}
      <div className="bg-white border border-[#E8E2D5] rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Friendly Camera Permission & Availability Notice */}
        {cameraNotice && (
          <div
            id="scan-camera-notice-banner"
            className="p-4 bg-amber-50/90 border border-amber-300 rounded-2xl flex items-start gap-3 shadow-2xs animate-in fade-in duration-200 text-amber-950"
          >
            <Camera aria-hidden="true" focusable="false" className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1 text-xs">
              <div className="flex items-center justify-between">
                <p className="font-bold text-amber-900 text-sm">Camera Notice</p>
                <button
                  type="button"
                  onClick={() => setCameraNotice(null)}
                  className="text-amber-700 hover:text-amber-950 p-0.5 rounded-md cursor-pointer"
                  aria-label="Dismiss notice"
                >
                  <X aria-hidden="true" focusable="false" className="w-4 h-4" />
                </button>
              </div>
              <p className="text-amber-950 font-medium leading-relaxed">
                {cameraNotice.message}
              </p>
              <div className="pt-1 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCameraNotice(null);
                    const targetSlot = targetSlotIdRef.current || activeSlotId;
                    triggerCameraForSlot(targetSlot);
                  }}
                  className="bg-[#154734] hover:bg-[#103828] text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer min-h-[36px]"
                >
                  <RefreshCw aria-hidden="true" focusable="false" className="w-3.5 h-3.5" />
                  <span>Try Camera Again</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCameraNotice(null);
                    const targetSlot = targetSlotIdRef.current || activeSlotId;
                    triggerGalleryForSlot(targetSlot);
                  }}
                  className="bg-white hover:bg-stone-50 text-slate-800 border border-[#E8E2D5] font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer min-h-[36px]"
                >
                  <Upload aria-hidden="true" focusable="false" className="w-3.5 h-3.5 text-[#154734]" />
                  <span>Choose from Gallery</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Validation / Single Error Banner Card */}
        {(() => {
          const rawError = analysisError || errorMessage;
          if (!rawError) return null;

          // Strip any stray markup cleanly
          const cleanRawError = String(rawError)
            .replace(/<[^>]*>/g, "")
            .trim();

          const lower = cleanRawError.toLowerCase();
          let title = "Unable to analyze";
          let message = "We couldn't analyze the photo right now. Please try again.";

          if (lower.includes("timeout") || lower.includes("longer") || lower.includes("504") || lower.includes("408")) {
            title = "Analysis timed out";
            message = "Analysis took longer than expected. Please try again.";
          } else if (lower.includes("connection") || lower.includes("offline") || lower.includes("internet") || lower.includes("network")) {
            title = "Connection problem";
            message = "Please check your internet connection and try again.";
          } else if (lower.includes("human") || lower.includes("non-animal") || lower.includes("invalid") || lower.includes("clear photo of an animal")) {
            title = "Invalid Image";
            message = cleanRawError.includes("Human photos")
              ? cleanRawError
              : "Please upload a clear photo of an animal. Human photos or non-animal items cannot be analyzed.";
          } else if (lower.includes("unclear") || lower.includes("blurry") || lower.includes("lighting")) {
            title = "Photo is unclear";
            message = "Please upload a clearer photo with better lighting and focus.";
          } else if (lower.includes("rate limit") || lower.includes("usage limit") || lower.includes("429")) {
            title = "Usage limit reached";
            message = "Usage limit reached. Please wait a moment and retry.";
          } else if (lower.includes("api key") || lower.includes("unauthorized") || lower.includes("forbidden") || lower.includes("401") || lower.includes("403")) {
            title = "Service configuration";
            message = cleanRawError;
          } else if (cleanRawError && !/server_error|analysis_parse_error|syntaxerror|unexpected token|<|doctype|json|html|object object|stack trace/i.test(cleanRawError)) {
            message = cleanRawError;
          }

          return (
            <div
              id="scan-validation-error-banner"
              className="p-4 bg-stone-50 border-2 border-stone-300 rounded-2xl flex items-start gap-3 shadow-xs animate-in fade-in duration-200 text-stone-900"
            >
              <AlertCircle aria-hidden="true" focusable="false" className="w-5 h-5 text-stone-600 shrink-0 mt-0.5" />
              <div className="space-y-1.5 text-xs flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-black text-stone-900 text-sm">{title}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      if (onClearError) onClearError();
                    }}
                    className="text-stone-400 hover:text-stone-700 p-0.5 rounded-md cursor-pointer"
                    aria-label="Dismiss error"
                  >
                    <X aria-hidden="true" focusable="false" className="w-4 h-4" />
                  </button>
                </div>
                <p className="font-semibold text-stone-700 leading-relaxed">{message}</p>
                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      if (onClearError) onClearError();
                      handleSubmit();
                    }}
                    className="bg-[#154734] hover:bg-[#103828] text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer min-h-[36px]"
                  >
                    <RefreshCw aria-hidden="true" focusable="false" className="w-3.5 h-3.5 text-amber-300" />
                    <span>Try Again</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      if (onClearError) onClearError();
                      triggerGalleryForSlot("close_up");
                    }}
                    className="bg-white hover:bg-stone-50 text-slate-800 border border-[#E8E2D5] font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer min-h-[36px]"
                  >
                    <ImagePlus aria-hidden="true" focusable="false" className="w-3.5 h-3.5 text-[#154734]" />
                    <span>Choose Another Photo</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        <div className="flex items-center justify-between border-b border-[#E5E3DC] pb-2">
          <div className="text-xs sm:text-sm font-bold text-[#252A27] flex items-center gap-2">
            <ImageIcon aria-hidden="true" focusable="false" className="w-4 h-4 text-[#315C4C]" />
            <span>Animal Photos (Up to 3)</span>
          </div>
          <span
            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
              uploadedCount > 0 ? "bg-[#E7EEE9] text-[#154734]" : "bg-stone-100 text-stone-600"
            }`}
          >
            {uploadedCount}/3 photos added
          </span>
        </div>

        {/* 3-Slot Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {imageSlots.map((slot, index) => {
            const hasImage = !!slot.dataUrl;
            const isPrimary = slot.id === "close_up";
            const slotTitle = isPrimary ? "Slot 1 — Required" : index === 1 ? "Slot 2 — Optional" : "Slot 3 — Optional";
            return (
              <div
                key={slot.id}
                className={`relative rounded-xl border transition-colors p-3 flex flex-col justify-between min-h-[170px] ${
                  hasImage
                    ? "border-[#315C4C] bg-[#FAF9F5] shadow-xs"
                    : isPrimary
                    ? "border-dashed border-[#315C4C] bg-[#FAF9F5]"
                    : "border-dashed border-[#E5E3DC] bg-[#FAF9F5]"
                }`}
              >
                {/* Slot Badge & Controls */}
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      hasImage
                        ? "bg-[#315C4C] text-white"
                        : isPrimary
                        ? "bg-[#E7EEE9] text-[#154734]"
                        : "bg-[#E5E3DC] text-[#626963]"
                    }`}
                  >
                    {hasImage ? `Photo #${index + 1} (Added)` : slotTitle}
                  </span>

                  {hasImage && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleRotateSlot(slot.id)}
                        className="p-1.5 text-[#626963] hover:text-[#252A27] bg-white rounded-lg border border-[#E5E3DC] cursor-pointer shadow-2xs"
                        title="Rotate 90°"
                        aria-label="Rotate photo"
                      >
                        <RotateCw aria-hidden="true" focusable="false" className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="p-1.5 text-rose-600 hover:text-rose-700 bg-white rounded-lg border border-[#E5E3DC] cursor-pointer shadow-2xs"
                        title="Remove photo"
                        aria-label="Remove photo"
                      >
                        <Trash2 aria-hidden="true" focusable="false" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Content preview or upload prompt */}
                {hasImage ? (
                  <div className="space-y-2">
                    <div className="relative aspect-4/3 rounded-lg overflow-hidden bg-stone-900 border border-[#E5E3DC]">
                      <img
                        src={slot.dataUrl!}
                        alt={slot.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="text-xs font-bold text-[#252A27] truncate">
                      {slot.title}
                    </div>
                    {/* Replace / Remove actions for this slot */}
                    <div className="flex items-center gap-1 pt-0.5">
                      <button
                        type="button"
                        onClick={() => triggerCameraForSlot(slot.id)}
                        className="flex-1 text-[10px] font-bold bg-white hover:bg-stone-50 border border-[#E5E3DC] text-[#252A27] py-1 px-1 rounded-lg flex items-center justify-center gap-0.5 cursor-pointer min-h-[28px]"
                        title="Replace using Camera"
                      >
                        <Camera aria-hidden="true" focusable="false" className="w-3 h-3 text-[#315C4C]" />
                        <span>Camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerGalleryForSlot(slot.id)}
                        className="flex-1 text-[10px] font-bold bg-white hover:bg-stone-50 border border-[#E5E3DC] text-[#252A27] py-1 px-1 rounded-lg flex items-center justify-center gap-0.5 cursor-pointer min-h-[28px]"
                        title="Replace from Gallery"
                      >
                        <Upload aria-hidden="true" focusable="false" className="w-3 h-3 text-[#315C4C]" />
                        <span>Gallery</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="text-[10px] font-bold bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 py-1 px-1.5 rounded-lg flex items-center justify-center gap-0.5 cursor-pointer min-h-[28px]"
                        title="Remove photo"
                      >
                        <Trash2 aria-hidden="true" focusable="false" className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="my-auto text-center py-2 space-y-1.5">
                    <div className="w-8 h-8 mx-auto rounded-lg bg-[#E7EEE9] flex items-center justify-center text-[#315C4C]">
                      {isPrimary ? <Camera aria-hidden="true" focusable="false" className="w-4 h-4" /> : <Plus aria-hidden="true" focusable="false" className="w-4 h-4" />}
                    </div>
                    <div className="text-xs font-bold text-[#252A27] leading-tight">
                      {slotTitle}
                    </div>
                    <p className="text-[10px] text-[#626963] leading-tight font-normal">
                      {slot.description}
                    </p>
                    <div className="pt-1 flex justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => triggerCameraForSlot(slot.id)}
                        className="text-[11px] font-semibold bg-[#315C4C] hover:bg-[#25473B] text-white px-2.5 py-1 rounded-lg cursor-pointer min-h-[32px] flex items-center gap-1"
                      >
                        <Camera aria-hidden="true" focusable="false" className="w-3 h-3" />
                        <span>Take Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerGalleryForSlot(slot.id)}
                        className="text-[11px] font-semibold bg-white border border-[#E5E3DC] hover:bg-[#FAF9F5] text-[#252A27] px-2.5 py-1 rounded-lg cursor-pointer min-h-[32px] flex items-center gap-1"
                      >
                        <Upload aria-hidden="true" focusable="false" className="w-3 h-3" />
                        <span>Upload Photo</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              if (!file.type.startsWith("image/")) {
                setErrorMessage("Please select a valid image file (JPEG, PNG, WEBP).");
                e.target.value = "";
                return;
              }
              if (file.size > 20 * 1024 * 1024) {
                setErrorMessage("File size is too large. Please choose a smaller photo.");
                e.target.value = "";
                return;
              }
              const targetSlot = targetSlotIdRef.current || activeSlotId || "close_up";
              handleImageSelectedForSlot(file, targetSlot);
              e.target.value = "";
            }
          }}
        />

        {/* Live Camera Viewfinder */}
        {mode === "camera" && cameraActive && (
          <div className="relative rounded-2xl overflow-hidden bg-black border border-stone-800 shadow-md animate-in fade-in duration-200">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="w-full aspect-4/3 object-cover"
            />
            <div className="absolute inset-0 border-2 border-[#315C4C]/40 rounded-2xl pointer-events-none" />
            
            {/* Viewfinder Header info */}
            <div className="absolute top-3 left-3 bg-black/75 text-white text-xs font-semibold px-3 py-1.5 rounded-lg backdrop-blur-xs flex items-center gap-1.5">
              <Camera aria-hidden="true" focusable="false" className="w-3.5 h-3.5 text-[#E7EEE9]" />
              <span>
                Capturing for:{" "}
                {imageSlots.find((s) => s.id === (targetSlotIdRef.current || activeSlotId))?.title || "Animal Photo"}
              </span>
            </div>

            {/* Close Camera button */}
            <button
              type="button"
              onClick={stopCamera}
              className="absolute top-3 right-3 p-2 bg-black/75 hover:bg-black text-white rounded-xl backdrop-blur-xs cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Close Camera"
              title="Close Camera"
            >
              <X aria-hidden="true" focusable="false" className="w-4 h-4" />
            </button>

            {/* Camera Controls */}
            <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-4 px-4">
              <button
                type="button"
                onClick={flipCamera}
                className="p-3 bg-black/70 hover:bg-black text-white rounded-full backdrop-blur-xs cursor-pointer min-h-[48px] min-w-[48px] flex items-center justify-center"
                title="Flip camera"
                aria-label="Flip camera"
              >
                <RefreshCw aria-hidden="true" focusable="false" className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full bg-white border-4 border-[#315C4C] shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                title="Capture photo"
                aria-label="Capture photo"
              >
                <div className="w-12 h-12 rounded-full bg-[#315C4C]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const currentSlot = targetSlotIdRef.current || activeSlotId;
                  triggerGalleryForSlot(currentSlot);
                }}
                className="p-3 bg-black/70 hover:bg-black text-white rounded-full backdrop-blur-xs cursor-pointer min-h-[48px] min-w-[48px] flex items-center justify-center"
                title="Upload from gallery"
                aria-label="Upload from gallery"
              >
                <Upload aria-hidden="true" focusable="false" className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Reassurance Tips Banner */}
        <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E5E3DC] flex items-center justify-between text-xs text-[#626963] font-normal">
          <div className="flex items-center gap-2">
            <Sun aria-hidden="true" focusable="false" className="w-4 h-4 text-[#315C4C] shrink-0" />
            <span>Use good daylight and hold camera steady for clearest result</span>
          </div>
        </div>
      </div>

      {/* 2. CHOOSE ANIMAL */}
      <div className="bg-white border border-[#E5E3DC] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#E5E3DC] pb-2">
          <div className="text-xs sm:text-sm font-bold text-[#252A27] flex items-center gap-2">
            <PawPrint aria-hidden="true" focusable="false" className="w-4 h-4 text-[#315C4C]" />
            <span>2. Choose Animal</span>
          </div>
          <span className="text-[10px] font-normal text-[#858B86]">Optional</span>
        </div>

        {/* Link to Saved Animal Profile */}
        {availableProfiles.length > 0 && (
          <div className="p-3 bg-[#FAF9F5] border border-[#E5E3DC] rounded-xl space-y-1.5">
            <label className="text-xs font-semibold text-[#252A27] block">
              Link to your saved animal profile:
            </label>
            <select
              value={selectedProfileId}
              onChange={(e) => handleProfileSelect(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-[#E5E3DC] bg-white font-medium text-[#252A27] focus:outline-hidden focus:border-[#315C4C] min-h-[44px]"
            >
              <option value="">None (Individual Screening)</option>
              {availableProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.species} {p.tagNumber ? `• Tag: ${p.tagNumber}` : ""})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Animal species grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {COMMON_ANIMALS.map((a) => {
            const isSelected = selectedAnimal === a.label;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedAnimal(isSelected ? "" : a.label)}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer truncate min-h-[48px] ${
                  isSelected
                    ? "bg-[#315C4C] text-white border-[#315C4C]"
                    : "bg-[#FAF9F5] hover:bg-[#F2EFE9] text-[#252A27] border-[#E5E3DC]"
                }`}
              >
                <span className="text-base shrink-0">{a.icon}</span>
                <span className="truncate">{a.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. AFFECTED BODY AREA (Optional) */}
      <div className="bg-white border border-[#E5E3DC] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#E5E3DC] pb-2">
          <div className="text-xs sm:text-sm font-bold text-[#252A27] flex items-center gap-2">
            <Zap aria-hidden="true" focusable="false" className="w-4 h-4 text-[#315C4C]" />
            <span>3. Affected Area (Optional)</span>
          </div>
          <span className="text-[10px] font-normal text-[#858B86]">Helps Focus</span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {BODY_AREAS.map((area) => {
            const isSelected = selectedBodyArea === area.label;
            return (
              <button
                key={area.id}
                type="button"
                onClick={() => setSelectedBodyArea(isSelected ? "" : area.label)}
                className={`py-2 px-2 rounded-lg text-left border transition-colors text-xs font-medium flex items-center gap-1.5 cursor-pointer truncate min-h-[44px] ${
                  isSelected
                    ? "bg-[#315C4C] text-white border-[#315C4C]"
                    : "bg-[#FAF9F5] hover:bg-[#F2EFE9] text-[#252A27] border-[#E5E3DC]"
                }`}
              >
                <span className="shrink-0">{area.icon}</span>
                <span className="truncate">{area.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. SYMPTOMS & VOICE INPUT */}
      <div className="bg-white border border-[#E5E3DC] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#E5E3DC] pb-2">
          <div className="text-xs sm:text-sm font-bold text-[#252A27] flex items-center gap-2">
            <Mic aria-hidden="true" focusable="false" className="w-4 h-4 text-[#315C4C]" />
            <span>4. Noticeable Signs (Optional)</span>
          </div>

          <button
            type="button"
            onClick={toggleListening}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[36px] ${
              isListening
                ? "bg-[#B44A4A] text-white animate-pulse"
                : "bg-[#E7EEE9] text-[#25473B] hover:bg-[#D2DFD7] border border-[#D2DFD7]"
            }`}
          >
            {isListening ? (
              <MicOff aria-hidden="true" focusable="false" className="w-3.5 h-3.5" />
            ) : (
              <Mic aria-hidden="true" focusable="false" className="w-3.5 h-3.5 text-[#315C4C]" />
            )}
            <span>{isListening ? "Listening..." : "Speak"}</span>
          </button>
        </div>

        {voiceError && (
          <p className="text-xs text-[#9A7D0A] font-semibold bg-[#FEF9E7] p-2 rounded-lg border border-[#F9E79F]">
            ⚠️ {voiceError}
          </p>
        )}

        <textarea
          value={symptomsText}
          onChange={(e) => setSymptomsText(e.target.value)}
          placeholder="e.g., Shaking head, scratching ear, not eating since yesterday..."
          rows={3}
          className="w-full p-3 rounded-xl border border-[#E5E3DC] bg-[#FAF9F5] focus:bg-white text-xs sm:text-sm text-[#252A27] font-normal focus:outline-hidden focus:border-[#315C4C]"
        />
      </div>

      {/* START ANALYSIS ACTION BUTTON */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!hasPrimaryImage || isCompressing || isAnalyzing}
          className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[52px] ${
            !hasPrimaryImage || isCompressing || isAnalyzing
              ? "bg-[#E5E3DC] text-[#858B86] cursor-not-allowed"
              : "bg-[#315C4C] hover:bg-[#25473B] text-white shadow-xs active:scale-[0.99]"
          }`}
          id="scan-analyze-button"
        >
          <Sparkles aria-hidden="true" focusable="false" className="w-5 h-5 text-amber-200" />
          <span>
            {isAnalyzing
              ? "Analyzing animal health..."
              : isCompressing
              ? "Processing photo..."
              : !hasPrimaryImage
              ? "Upload Slot 1 Photo to Analyze"
              : uploadedCount === 1
              ? "Analyze Animal Health (1 Photo)"
              : `Analyze Animal Health (${uploadedCount} Photos)`}
          </span>
        </button>
      </div>

      {/* Consent Modal */}
      {showConsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E5E3DC] shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E7EEE9] text-[#315C4C] flex items-center justify-center shrink-0">
                <ShieldCheck aria-hidden="true" focusable="false" className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#252A27]">
                  Health Screening Advisory
                </h3>
                <p className="text-xs text-[#626963]">
                  VetCheck Preliminary Care
                </p>
              </div>
            </div>

            <p className="text-xs text-[#626963] leading-relaxed font-normal">
              VetCheck provides preliminary visual health screening and safe supportive care advice. It does <strong>not</strong> replace hands-on veterinary diagnosis. Always consult a licensed veterinarian for medications.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (onUpdateSettings) onUpdateSettings({ aiConsentAccepted: true });
                  setShowConsentModal(false);
                  executeScreening();
                }}
                className="flex-1 bg-[#315C4C] hover:bg-[#25473B] text-white font-bold text-xs py-3 px-4 rounded-xl cursor-pointer min-h-[44px]"
              >
                I Understand & Continue
              </button>
              <button
                type="button"
                onClick={() => setShowConsentModal(false)}
                className="bg-[#FAF9F5] hover:bg-[#F2EFE9] text-[#252A27] border border-[#E5E3DC] font-semibold text-xs py-3 px-4 rounded-xl cursor-pointer min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
