import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Share2,
  Bookmark,
  BookmarkCheck,
  RotateCcw,
  PhoneCall,
  Activity,
  HeartPulse,
  Ban,
  Stethoscope,
  Info,
  Eye,
  Camera,
  Check,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Download,
  Copy,
  X,
  FileText,
  Calendar,
  ChevronDown,
  ChevronUp,
  HelpCircle as QuestionIcon,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  CheckCheck,
  MessageSquare,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import {
  AnalysisResult,
  UserSettings,
  ScreeningRecord,
  AnimalProfile,
  FollowUpAnswer,
  FollowUpQuestion,
  UserFeedback,
  VeterinaryPrescription,
} from "../types";
import { getTranslation, SUPPORTED_LANGUAGES } from "../data/translations";
import { ttsManager } from "../utils/speechHelper";
import { shareScreeningSummary, downloadScreeningSummaryAsTxt } from "../utils/shareHelper";
import { NearbyVetModal } from "./NearbyVetModal";
import { VeterinaryReportModal } from "./VeterinaryReportModal";
import { FollowUpModal } from "./FollowUpModal";
import { ContextualLearnCards } from "./ContextualLearnCards";
import { PrescriptionCard } from "./PrescriptionCard";
import {
  toggleActionPlanStep,
  updateScreeningRecord,
  saveUserFeedback,
  saveVeterinaryPrescription,
  deleteVeterinaryPrescription,
  getPrescriptionForScreening,
} from "../utils/storage";

const ANIMAL_CORRECTION_OPTIONS = [
  "Cattle / Cow",
  "Buffalo",
  "Dog",
  "Cat",
  "Goat",
  "Sheep",
  "Horse / Donkey",
  "Pig",
  "Chicken / Poultry",
  "Camel",
  "Other",
];

const BODY_AREA_OPTIONS = [
  "Skin or coat",
  "Eyes",
  "Ears",
  "Mouth or teeth",
  "Nose",
  "Legs or paws",
  "Hooves",
  "Udder",
  "Abdomen",
  "Tail",
  "Wound or injury",
  "Other",
];

interface ResultsScreenProps {
  result: AnalysisResult;
  imagePreview: string;
  images?: { type: string; url: string; base64: string }[];
  selectedAnimal?: string;
  bodyArea?: string;
  symptoms?: string;
  settings: UserSettings;
  isSaved: boolean;
  activeRecord?: ScreeningRecord;
  animalProfile?: AnimalProfile;
  onSaveToHistory: () => void;
  onScanAnother: () => void;
  onNavigateEmergency: () => void;
  onOpenNearbyVet?: () => void;
  onRecordUpdated?: (record: ScreeningRecord) => void;
  onReanalyzeWithCorrections?: (corrections: {
    selectedAnimal?: string;
    bodyArea?: string;
    symptoms?: string;
  }) => Promise<void> | void;
  isReanalyzing?: boolean;
  onNavigateLearn?: () => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  result,
  imagePreview,
  images = [],
  selectedAnimal,
  bodyArea,
  symptoms,
  settings,
  isSaved,
  activeRecord,
  animalProfile,
  onSaveToHistory,
  onScanAnother,
  onNavigateEmergency,
  onOpenNearbyVet,
  onRecordUpdated,
  onReanalyzeWithCorrections,
  isReanalyzing = false,
  onNavigateLearn,
}) => {
  const lang = settings.language;

  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>(
    activeRecord?.completedActionSteps || {}
  );
  const [followUpAnswers, setFollowUpAnswers] = useState<FollowUpAnswer[]>(
    activeRecord?.followUpAnswers || []
  );

  // Detailed Assessment Section State (DEFAULT = COLLAPSED for simplicity and speed)
  const [isDetailedViewOpen, setIsDetailedViewOpen] = useState(false);

  // Sub-accordions inside Detailed View
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    observations: true,
    evidence: true,
    missingInfo: false,
    avoidDoing: true,
    followUp: false,
    corrections: false,
  });

  // Correction Form State
  const [correctedAnimal, setCorrectedAnimal] = useState<string>(
    selectedAnimal ||
      (typeof result.detectedAnimal === "object" ? result.detectedAnimal.name : result.detectedAnimal) ||
      "Dog"
  );
  const [correctedBodyArea, setCorrectedBodyArea] = useState<string>(
    bodyArea || result.affectedBodyArea || "Skin or coat"
  );
  const [correctedSymptoms, setCorrectedSymptoms] = useState<string>(symptoms || "");

  // Feedback State
  const [feedbackCategory, setFeedbackCategory] = useState<UserFeedback["category"] | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [actionFeedbackMsg, setActionFeedbackMsg] = useState<string | null>(null);

  // Prescription State
  const [prescription, setPrescription] = useState<VeterinaryPrescription | undefined>(() => {
    if (activeRecord?.prescription) return activeRecord.prescription;
    if (activeRecord?.id) return getPrescriptionForScreening(activeRecord.id);
    return undefined;
  });

  // Modals
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isNearbyModalOpen, setIsNearbyModalOpen] = useState(false);

  const handleSavePrescription = (savedPrescription: VeterinaryPrescription) => {
    setPrescription(savedPrescription);
    saveVeterinaryPrescription(savedPrescription, activeRecord?.id);
    if (activeRecord) {
      const updatedRec: ScreeningRecord = {
        ...activeRecord,
        prescription: savedPrescription,
        status: activeRecord.status === "pending" ? "vet_consulted" : activeRecord.status,
      };
      if (onRecordUpdated) onRecordUpdated(updatedRec);
    }
  };

  const handleDeletePrescription = (prescriptionId: string) => {
    deleteVeterinaryPrescription(prescriptionId);
    setPrescription(undefined);
    if (activeRecord) {
      const { prescription: _, ...rest } = activeRecord;
      if (onRecordUpdated) onRecordUpdated(rest as ScreeningRecord);
    }
  };

  const detectedAnimalObj =
    typeof result.detectedAnimal === "object" && result.detectedAnimal !== null
      ? result.detectedAnimal
      : {
          name: result.detectedAnimal || result.animalType || selectedAnimal || "Animal",
          confidence: result.animalConfidence || result.confidence || "Medium",
          needsConfirmation: false,
        };

  const animalName = detectedAnimalObj.name;
  const confidence = detectedAnimalObj.confidence;
  const careSteps = result.immediateCare || result.safeImmediateCareSteps || [];
  const avoids = result.avoidDoing || result.whatToAvoid || [];
  const vetAdvice = result.veterinaryHelp || result.whenToSeeVet || "";

  const actionPlan = result.actionPlan || {
    doNow: careSteps.length > 0 ? careSteps : [
      "Keep the affected area clean, dry, and protected.",
      "Prevent excessive scratching, licking, or rubbing.",
      "Provide fresh clean water and normal feed.",
      "Monitor the area for 24–48 hours.",
      "Contact a veterinarian if it worsens.",
    ],
    watchFor: [
      "Rapidly spreading swelling, redness, or heat",
      "Animal refusing food or fresh water for over 24 hours",
      "Severe weakness or sudden difficulty standing",
    ],
    avoidDoing: avoids,
    getHelp: vetAdvice,
  };

  const isEmergency =
    (typeof result.emergencyWarning === "object" && result.emergencyWarning?.active) ||
    result.emergencyWarning === true ||
    result.severity === "Emergency";

  const isSerious = result.severity === "Serious";

  const isHealthy =
    result.noVisibleAbnormality === true || result.isNoAbnormalityDetected === true;

  const allDisplayImages = images.length > 0 ? images : [{ type: "primary", url: imagePreview, base64: "" }];

  // 1. Overall Status Computation (4-Tier Simple System)
  const getOverallStatus = () => {
    if (isEmergency) {
      return {
        badge: "🔴 Urgent Attention",
        colorClass: "bg-[#FFF2F0] border-rose-300 text-rose-950",
        badgeBg: "bg-rose-700 text-white",
        iconColor: "text-rose-700",
        sentence: "Potentially serious symptoms observed. Immediate veterinary attention is recommended.",
        shortLabel: "Urgent Attention",
      };
    }
    if (isSerious) {
      return {
        badge: "🟠 Vet Check Recommended",
        colorClass: "bg-[#FFF9EE] border-amber-300 text-amber-950",
        badgeBg: "bg-amber-600 text-white",
        iconColor: "text-amber-700",
        sentence: "Notable health signs observed. Schedule an in-person veterinary visit soon.",
        shortLabel: "Vet Check Recommended",
      };
    }
    if (result.severity === "Moderate") {
      return {
        badge: "🟡 Needs Attention",
        colorClass: "bg-[#FEFCE8] border-yellow-300 text-yellow-950",
        badgeBg: "bg-yellow-500 text-slate-900 font-extrabold",
        iconColor: "text-yellow-700",
        sentence: "Visible irritation or discomfort is present. It may need supportive care and monitoring.",
        shortLabel: "Needs Attention",
      };
    }
    return {
      badge: "🟢 Looks Normal",
      colorClass: "bg-[#F0FDF4] border-emerald-300 text-emerald-950",
      badgeBg: "bg-[#154734] text-white",
      iconColor: "text-[#154734]",
      sentence: "No obvious physical abnormalities are visible. Continue regular care and routine monitoring.",
      shortLabel: "Looks Normal",
    };
  };

  const statusInfo = getOverallStatus();

  // 2. Simplified "At a Glance" Items
  const getAtAGlanceObservations = () => {
    const affected = (bodyArea || result.affectedBodyArea || "").toLowerCase();
    const signs = (result.visibleSigns || []).map((s) => s.toLowerCase()).join(" ");

    const isSkin =
      affected.includes("skin") ||
      affected.includes("coat") ||
      signs.includes("hair") ||
      signs.includes("scratch") ||
      signs.includes("lesion") ||
      signs.includes("redness") ||
      signs.includes("scab");

    const isEye =
      affected.includes("eye") ||
      signs.includes("eye") ||
      signs.includes("cornea") ||
      signs.includes("discharge");

    const isWound =
      affected.includes("wound") ||
      affected.includes("injur") ||
      signs.includes("bleed") ||
      signs.includes("lacerat") ||
      signs.includes("cut");

    return [
      {
        id: "skin",
        label: "Skin & Coat",
        status: isSkin
          ? isEmergency || isSerious
            ? "! Concern"
            : "⚠ Attention"
          : "✓ Normal",
        badgeClass: isSkin
          ? isEmergency || isSerious
            ? "bg-rose-100 text-rose-800 border-rose-200"
            : "bg-amber-100 text-amber-800 border-amber-200"
          : "bg-emerald-100 text-emerald-800 border-emerald-200",
      },
      {
        id: "eyes",
        label: "Eyes",
        status: isEye
          ? isEmergency
            ? "! Concern"
            : "⚠ Attention"
          : "✓ Clear",
        badgeClass: isEye
          ? "bg-amber-100 text-amber-800 border-amber-200"
          : "bg-emerald-100 text-emerald-800 border-emerald-200",
      },
      {
        id: "body",
        label: "Body Condition",
        status: isEmergency ? "! Concern" : isSerious ? "⚠ Attention" : "✓ Normal",
        badgeClass: isEmergency
          ? "bg-rose-100 text-rose-800 border-rose-200"
          : isSerious
          ? "bg-amber-100 text-amber-800 border-amber-200"
          : "bg-emerald-100 text-emerald-800 border-emerald-200",
      },
      {
        id: "injury",
        label: "Visible Injury",
        status: isWound ? (isEmergency ? "! Concern" : "⚠ Attention") : "✕ None seen",
        badgeClass: isWound
          ? "bg-rose-100 text-rose-800 border-rose-200"
          : "bg-slate-100 text-slate-700 border-slate-200",
      },
      {
        id: "behavior",
        label: "Behavior / Posture",
        status: isEmergency ? "! Concern" : "✓ Appears normal",
        badgeClass: isEmergency
          ? "bg-rose-100 text-rose-800 border-rose-200"
          : "bg-emerald-100 text-emerald-800 border-emerald-200",
      },
    ];
  };

  const glanceItems = getAtAGlanceObservations();

  // 3. Simplified Possibility List (Max 1–3)
  const topConditions = (result.possibleConditions && result.possibleConditions.length > 0)
    ? result.possibleConditions.slice(0, 3)
    : [
        {
          name: isHealthy ? "No obvious condition detected" : "Visible irritation",
          reason: isHealthy
            ? "No clear physical lesions observed in photo."
            : result.simpleExplanation || "Visible signs of localized irritation or discomfort.",
          confidence: "Medium" as const,
        },
      ];

  // Helper for confidence uncertainty wording
  const formatPossibilityConfidence = (conf?: string) => {
    switch (conf) {
      case "High":
        return "High possibility";
      case "Low":
        return "Low possibility";
      default:
        return "Moderate possibility";
    }
  };

  // 4. Default 3–5 short actions for "What You Can Do Now"
  const conciseActions = (actionPlan.doNow && actionPlan.doNow.length > 0)
    ? actionPlan.doNow.slice(0, 5)
    : [
        "Keep the affected area clean and dry.",
        "Prevent excessive scratching or licking.",
        "Provide clean water and normal food.",
        "Monitor the area for 24–48 hours.",
        "Contact a veterinarian if it worsens.",
      ];

  // 5. Short TTS Speech Narrative (Prioritizing Overall Status, Possible Finding, Care Plan & Emergency Warnings)
  // Excludes long technical details and veterinary prescriptions from the automated summary read-out.
  const emergencyVoiceWarning = (isEmergency || isSerious)
    ? "Emergency Warning: Urgent veterinary attention recommended. Call helpline 1962 or visit the nearest animal hospital immediately."
    : "Seek veterinary care if warning signs such as heavy bleeding, difficulty breathing, or severe weakness develop.";

  const topFindingName = topConditions[0]?.name || (isHealthy ? "No obvious condition detected" : "Visible irritation");
  const shortCarePlanVoice = conciseActions.slice(0, 4).join(". ");

  const shortSpeechSummary = [
    `Health Report for ${animalName}.`,
    `Overall Status: ${statusInfo.shortLabel}. ${statusInfo.sentence}`,
    `Possible Finding: ${topFindingName}.`,
    `Care Plan: ${shortCarePlanVoice}.`,
    emergencyVoiceWarning,
  ].filter(Boolean).join(" ");

  // Read Aloud / Speech Synthesis State
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const isSpeechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const handleStopSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    ttsManager.stop();
    setIsSpeaking(false);
  };

  const handleToggleReadAloud = () => {
    if (!isSpeechSupported) return;

    if (isSpeaking) {
      handleStopSpeech();
      return;
    }

    // Cancel any ongoing speech before starting a new one to prevent overlaps
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    ttsManager.stop();

    if (!shortSpeechSummary || shortSpeechSummary.trim() === "") return;

    try {
      const utterance = new SpeechSynthesisUtterance(shortSpeechSummary);
      const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
      const targetLocale = langConfig?.speechLocale || "en-IN";
      utterance.lang = targetLocale;
      utterance.rate = Math.max(0.7, Math.min(1.5, settings.ttsVoiceSpeed || 1.0));
      utterance.pitch = Math.max(0.8, Math.min(1.3, settings.ttsPitch || 1.0));

      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find((v) => v.lang.startsWith(targetLocale.split("-")[0]));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = (e) => {
        console.warn("[VetCheck TTS] Speech synthesis error/canceled:", e);
        setIsSpeaking(false);
      };

      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("[VetCheck TTS] Failed to start speech:", err);
      setIsSpeaking(false);
    }
  };

  // Auto-speak if enabled in user settings & cleanup when navigating away
  useEffect(() => {
    if (settings.autoSpeakResults && result.validAnimalImage && isSpeechSupported) {
      handleToggleReadAloud();
    }
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      ttsManager.stop();
    };
  }, []);

  const handleToggleStep = (stepKey: string) => {
    const newVal = !checkedSteps[stepKey];
    const updated = { ...checkedSteps, [stepKey]: newVal };
    setCheckedSteps(updated);

    if (activeRecord) {
      const recs = toggleActionPlanStep(activeRecord.id, stepKey, newVal);
      const updatedRec = recs.find((r) => r.id === activeRecord.id);
      if (updatedRec && onRecordUpdated) {
        onRecordUpdated(updatedRec);
      }
    }
  };

  const handleAnswerQuestion = (
    question: FollowUpQuestion,
    answerVal: "yes" | "no" | "unknown" | "skip"
  ) => {
    const existing = followUpAnswers.filter((a) => a.questionId !== question.id);
    const updated = [
      ...existing,
      { questionId: question.id, question: question.question, answer: answerVal },
    ];
    setFollowUpAnswers(updated);

    if (activeRecord) {
      const updatedRec: ScreeningRecord = {
        ...activeRecord,
        followUpAnswers: updated,
      };
      updateScreeningRecord(updatedRec);
      if (onRecordUpdated) onRecordUpdated(updatedRec);
    }
  };

  const handleApplyCorrections = () => {
    if (onReanalyzeWithCorrections) {
      onReanalyzeWithCorrections({
        selectedAnimal: correctedAnimal,
        bodyArea: correctedBodyArea,
        symptoms: correctedSymptoms,
      });
    }
  };

  const handleSubmitFeedback = (cat: UserFeedback["category"]) => {
    setFeedbackCategory(cat);
    saveUserFeedback({
      screeningId: activeRecord?.id,
      category: cat,
      comment: "",
      animalType: animalName,
    });
    setFeedbackSubmitted(true);
  };

  const handleShareReport = async () => {
    const res = await shareScreeningSummary(
      result,
      selectedAnimal,
      symptoms,
      activeRecord?.timestamp || Date.now(),
      true,
      allDisplayImages[0]?.url,
      activeRecord,
      animalProfile
    );
    if (res.method === "clipboard") {
      setActionFeedbackMsg("Report copied to clipboard!");
      setTimeout(() => setActionFeedbackMsg(null), 3000);
    }
  };

  const handleDownloadTxt = () => {
    downloadScreeningSummaryAsTxt(
      result,
      selectedAnimal,
      symptoms,
      activeRecord?.timestamp || Date.now(),
      activeRecord,
      animalProfile
    );
    setActionFeedbackMsg("Report downloaded as .TXT!");
    setTimeout(() => setActionFeedbackMsg(null), 3000);
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div
      id="health-report-screen"
      className="max-w-xl mx-auto space-y-4 pb-28 text-slate-800"
    >
      {/* Toast Feedback Notification */}
      {actionFeedbackMsg && (
        <div
          id="action-toast"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#315C4C] text-white px-4 py-2 rounded-lg shadow-md text-xs font-semibold flex items-center gap-2 animate-in fade-in"
        >
          <Check className="w-3.5 h-3.5" />
          <span>{actionFeedbackMsg}</span>
        </div>
      )}

      {/* TOP HEADER: Clean Title & Controls */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1
            id="health-report-heading"
            className="text-2xl font-bold tracking-tight text-[#252A27]"
          >
            Health Report
          </h1>
          <p className="text-xs text-[#626963] font-normal">
            Preliminary visual health screening card
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Read Aloud / Stop Reading Button */}
          {isSpeechSupported && (
            <button
              type="button"
              id="read-aloud-btn"
              onClick={handleToggleReadAloud}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                isSpeaking
                  ? "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100"
                  : "bg-white text-[#315C4C] hover:bg-[#FAF9F5] border-[#E5E3DC]"
              }`}
              title={isSpeaking ? "Stop Reading" : "Read Aloud"}
              aria-label={isSpeaking ? "Stop Reading" : "Read Aloud"}
            >
              <span>{isSpeaking ? "⏹ Stop Reading" : "🔊 Read Aloud"}</span>
            </button>
          )}

          {/* Full Vet Summary Modal Trigger */}
          <button
            type="button"
            id="open-vet-summary-btn"
            onClick={() => setIsReportModalOpen(true)}
            className="px-3 py-1.5 text-[#315C4C] hover:bg-[#FAF9F5] bg-white rounded-lg border border-[#E5E3DC] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Full Report"
          >
            <FileText className="w-3.5 h-3.5 text-[#315C4C]" />
            <span>Full Report</span>
          </button>
        </div>
      </div>

      {/* 1. OVERALL STATUS CARD (Primary Scannable Element) */}
      <div
        id="overall-status-card"
        className={`p-4 sm:p-5 rounded-2xl border transition-colors ${statusInfo.colorClass}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#626963]">
            Overall Status
          </span>
          <span className="text-[10px] font-normal text-[#858B86]">Summary</span>
        </div>

        <div className="flex items-center gap-3 my-2.5">
          <span
            id="status-badge"
            className={`text-sm sm:text-base font-bold px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 ${statusInfo.badgeBg}`}
          >
            {statusInfo.badge}
          </span>
        </div>

        {/* ONE short sentence below status */}
        <p
          id="status-sentence"
          className="text-xs sm:text-sm font-medium leading-relaxed mt-1 text-[#252A27]"
        >
          {statusInfo.sentence}
        </p>
      </div>

      {/* URGENT WARNING BANNER (Placed near top if Emergency / Serious) */}
      {(isEmergency || isSerious) && (
        <div
          id="urgent-vet-alert"
          className="p-4 bg-[#B44A4A] text-white rounded-2xl border border-[#963C3C] space-y-2.5"
        >
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-100 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs sm:text-sm font-bold uppercase tracking-wide">
                🚨 Veterinary Attention Needed
              </div>
              <p className="text-xs text-white/90 font-normal leading-relaxed mt-0.5">
                Seek veterinary help promptly. Do not delay medical evaluation if the animal is in pain.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <a
              id="call-1962-top-btn"
              href="tel:1962"
              className="bg-white text-[#B44A4A] hover:bg-[#FAF9F5] font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Call 1962 (Helpline)</span>
            </a>
            <button
              id="find-nearby-vet-top-btn"
              type="button"
              onClick={() => setIsNearbyModalOpen(true)}
              className="bg-[#25473B] hover:bg-[#1C362C] text-white font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-[#E7EEE9]" />
              <span>Find Nearby Clinic</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. 🔍 POSSIBLE FINDING CARD (Max 1–3 Likely Possibilities) */}
      <div
        id="possible-findings-card"
        className="bg-white border border-[#E5E3DC] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3"
      >
        <div className="flex items-center justify-between border-b border-[#E5E3DC] pb-2">
          <h2 className="text-xs sm:text-sm font-bold text-[#252A27] flex items-center gap-2">
            <span>🔍</span>
            <span>Possible Finding</span>
          </h2>
          <span className="text-[10px] font-normal text-[#858B86]">
            {topConditions.length} {topConditions.length === 1 ? "Possibility" : "Possibilities"}
          </span>
        </div>

        <div className="space-y-2.5">
          {topConditions.map((cond, idx) => (
            <div
              key={idx}
              id={`condition-item-${idx}`}
              className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E5E3DC] space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm font-bold text-[#252A27]">
                  {cond.name.toLowerCase().startsWith("possible") ? cond.name : `Possible ${cond.name}`}
                </span>
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded bg-white border border-[#E5E3DC] text-[#315C4C] shrink-0">
                  {formatPossibilityConfidence(cond.confidence || cond.likelihood)}
                </span>
              </div>

              {/* One short explanation */}
              <p className="text-xs text-[#626963] leading-relaxed font-normal">
                {cond.reason || cond.description || "Visible signs of irritation or coat change."}
              </p>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-[#858B86] italic pt-0.5">
          ℹ️ Visual screening only. AI predictions are not confirmed veterinary diagnoses.
        </p>
      </div>

      {/* 3. ❤️ CARE PLAN CARD (AI Care Guidance — Max 3–5 Short Points) */}
      <div
        id="care-plan-card"
        className="bg-white border border-[#E5E3DC] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3"
      >
        <div className="flex items-center justify-between border-b border-[#E5E3DC] pb-2">
          <div className="flex items-center gap-2">
            <span className="text-base">❤️</span>
            <h2 className="text-xs sm:text-sm font-bold text-[#252A27]">
              Care Plan
            </h2>
          </div>
          <span className="text-[10px] font-semibold text-[#315C4C] bg-[#E7EEE9] px-2 py-0.5 rounded">
            Care Guidance
          </span>
        </div>

        {/* Emergency Callout if serious/emergency detected */}
        {(isEmergency || isSerious) ? (
          <div className="p-3.5 bg-[#FDF2F2] border border-[#F2D6D6] rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-[#B44A4A] font-bold text-xs">
              <ShieldAlert className="w-4 h-4 text-[#B44A4A] shrink-0" />
              <span>Urgent veterinary attention recommended</span>
            </div>
            <p className="text-[11px] text-[#B44A4A] font-normal leading-relaxed">
              Do not rely on home supportive care alone. Professional veterinary diagnosis and treatment are required promptly.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsNearbyModalOpen(true)}
                className="px-3 py-1.5 bg-[#315C4C] hover:bg-[#25473B] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Find Nearest Veterinary Hospital</span>
              </button>
              <a
                href="tel:1962"
                className="px-3 py-1.5 bg-[#B44A4A] hover:bg-[#963C3C] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call 1962 (Helpline)</span>
              </a>
            </div>
          </div>
        ) : null}

        {/* Short 3-5 point supportive care actions */}
        <div className="space-y-2">
          {conciseActions.map((action, idx) => {
            const stepKey = `action-${idx}`;
            const isChecked = !!checkedSteps[stepKey];
            return (
              <button
                key={idx}
                id={`care-step-btn-${idx}`}
                type="button"
                onClick={() => handleToggleStep(stepKey)}
                className={`w-full p-3 rounded-xl border text-left transition-colors flex items-start gap-3 cursor-pointer ${
                  isChecked
                    ? "bg-[#E7EEE9] border-[#D2DFD7] text-[#25473B]"
                    : "bg-[#FAF9F5] hover:bg-[#F2EFE9] border-[#E5E3DC] text-[#252A27]"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isChecked
                      ? "bg-[#315C4C] border-[#315C4C] text-white"
                      : "border-[#E5E3DC] bg-white"
                  }`}
                >
                  {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <span
                  className={`text-xs font-normal leading-relaxed ${
                    isChecked ? "line-through text-[#626963]" : ""
                  }`}
                >
                  {action}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-[10px] text-[#858B86] italic pt-0.5">
          ℹ️ This is preliminary care guidance, not a veterinary prescription.
        </p>
      </div>

      {/* 4. ⚠ WHEN TO CONTACT A VET CARD (Visual Icons & Short Labels) */}
      <div
        id="when-to-contact-vet-card"
        className="bg-white border border-[#E5E3DC] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5"
      >
        <div className="flex items-center justify-between border-b border-[#E5E3DC] pb-2">
          <h2 className="text-xs sm:text-sm font-bold text-[#B44A4A] flex items-center gap-2">
            <span>⚠️</span>
            <span>When to Contact a Vet</span>
          </h2>
          <span className="text-[10px] font-semibold text-[#B44A4A] bg-[#FDF2F2] px-2 py-0.5 rounded">
            Warning Signs
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-lg bg-[#FAF9F5] border border-[#E5E3DC] flex items-center gap-2 text-xs font-medium text-[#252A27]">
            <span className="text-base">🍽</span>
            <span>Not eating</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#FAF9F5] border border-[#E5E3DC] flex items-center gap-2 text-xs font-medium text-[#252A27]">
            <span className="text-base">🤮</span>
            <span>Repeated vomiting</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#FAF9F5] border border-[#E5E3DC] flex items-center gap-2 text-xs font-medium text-[#252A27]">
            <span className="text-base">😴</span>
            <span>Severe weakness</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#FAF9F5] border border-[#E5E3DC] flex items-center gap-2 text-xs font-medium text-[#252A27]">
            <span className="text-base">🩸</span>
            <span>Bleeding</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#FAF9F5] border border-[#E5E3DC] flex items-center gap-2 text-xs font-medium text-[#252A27]">
            <span className="text-base">👁</span>
            <span>Eye swelling / discharge</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#FAF9F5] border border-[#E5E3DC] flex items-center gap-2 text-xs font-medium text-[#252A27]">
            <span className="text-base">🫁</span>
            <span>Difficulty breathing</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#FAF9F5] border border-[#E5E3DC] col-span-2 flex items-center gap-2 text-xs font-medium text-[#252A27]">
            <span className="text-base">🌡</span>
            <span>Condition getting worse rapidly</span>
          </div>
        </div>

        <div className="p-3 bg-[#FEF9E7] border border-[#F9E79F] rounded-xl flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[#7D6608]">
            Seek veterinary help promptly if any sign occurs.
          </span>
          <a
            href="tel:1962"
            className="px-3 py-1.5 bg-[#315C4C] hover:bg-[#25473B] text-white text-xs font-semibold rounded-lg shrink-0 flex items-center gap-1"
          >
            <PhoneCall className="w-3 h-3" />
            <span>Call 1962</span>
          </a>
        </div>
      </div>

      {/* 5. 👁 AT A GLANCE CARD (Clean Observations Table) */}
      <div
        id="at-a-glance-card"
        className="bg-white border border-[#E5E3DC] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3"
      >
        <div className="flex items-center justify-between border-b border-[#E5E3DC] pb-2">
          <h2 className="text-xs sm:text-sm font-bold text-[#252A27] flex items-center gap-2">
            <span>👁</span>
            <span>At a Glance</span>
          </h2>
          <span className="text-[10px] font-normal text-[#858B86]">Visual Check</span>
        </div>

        <div className="grid grid-cols-1 divide-y divide-[#E5E3DC]">
          {glanceItems.map((item) => (
            <div
              key={item.id}
              id={`glance-row-${item.id}`}
              className="py-2.5 flex items-center justify-between gap-2"
            >
              <span className="text-xs font-medium text-[#252A27]">{item.label}</span>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded border ${item.badgeClass}`}
              >
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 6. 🩺 VETERINARY PRESCRIPTION (Separate Manual Entry & Export Card) */}
      <PrescriptionCard
        prescription={prescription}
        defaultAnimalName={animalName}
        defaultDiagnosis={topConditions[0]?.name}
        screeningId={activeRecord?.id}
        animalProfileId={activeRecord?.animalProfileId || animalProfile?.id}
        settings={settings}
        onSavePrescription={handleSavePrescription}
        onDeletePrescription={handleDeletePrescription}
      />

      {/* 6. ANIMAL INFORMATION (Compact Horizontal Card) */}
      <div
        id="animal-info-compact-card"
        className="bg-[#FAF9F5] border border-[#E5E3DC] rounded-xl p-3.5 text-xs text-[#626963]"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="p-2 bg-white rounded-lg border border-[#E5E3DC]">
            <span className="text-[10px] font-semibold text-[#858B86] uppercase block">Animal</span>
            <span className="font-bold text-[#252A27]">{animalName || "Not determined"}</span>
          </div>
          <div className="p-2 bg-white rounded-lg border border-[#E5E3DC]">
            <span className="text-[10px] font-semibold text-[#858B86] uppercase block">Approx. Age</span>
            <span className="font-bold text-[#252A27]">
              {animalProfile?.approxAge || animalProfile?.age || "Not determined"}
            </span>
          </div>
          <div className="p-2 bg-white rounded-lg border border-[#E5E3DC]">
            <span className="text-[10px] font-semibold text-[#858B86] uppercase block">Sex</span>
            <span className="font-bold text-[#252A27]">
              {animalProfile?.sex || "Not determined"}
            </span>
          </div>
          <div className="p-2 bg-white rounded-lg border border-[#E5E3DC]">
            <span className="text-[10px] font-semibold text-[#858B86] uppercase block">Body Region</span>
            <span className="font-bold text-[#252A27]">
              {bodyArea || result.affectedBodyArea || "Not determined"}
            </span>
          </div>
        </div>
      </div>

      {/* 7. VIEW DETAILED ASSESSMENT (Collapsible Section — Default Collapsed) */}
      <div
        id="detailed-assessment-container"
        className="bg-white border border-[#E5E3DC] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4"
      >
        <button
          id="toggle-detailed-assessment-btn"
          type="button"
          onClick={() => setIsDetailedViewOpen(!isDetailedViewOpen)}
          className="w-full flex items-center justify-between cursor-pointer text-left py-1"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <div>
              <div className="text-xs sm:text-sm font-bold text-[#252A27]">
                {isDetailedViewOpen ? "Hide Detailed Assessment" : "View Detailed Assessment"}
              </div>
              <div className="text-[10px] text-[#626963] font-normal">
                Technical visual signs, evidence, diagnostic checks & correction tools
              </div>
            </div>
          </div>
          <div
            className={`p-2 rounded-lg bg-[#FAF9F5] text-[#626963] transition-transform ${
              isDetailedViewOpen ? "rotate-180" : ""
            }`}
          >
            <ChevronDown className="w-4 h-4" />
          </div>
        </button>

        {isDetailedViewOpen && (
          <div className="space-y-4 pt-3 border-t border-[#E5E3DC] animate-in fade-in duration-200">
            {/* A. PHOTO INSPECTION & TECHNICAL QUALITY */}
            <div className="space-y-2">
              <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-16/10 border border-[#E5E3DC]">
                <img
                  src={allDisplayImages[activeImageIndex]?.url || imagePreview}
                  alt="Screened Animal"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              {allDisplayImages.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-[10px] font-semibold text-[#858B86] shrink-0">Angles:</span>
                  {allDisplayImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors shrink-0 cursor-pointer ${
                        activeImageIndex === idx
                          ? "border-[#315C4C]"
                          : "border-[#E5E3DC] opacity-60"
                      }`}
                    >
                      <img
                        src={img.url}
                        alt={`Angle ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* B. DIRECT OBSERVABLE VISUAL SIGNS */}
            {result.visibleSigns && result.visibleSigns.length > 0 && (
              <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E5E3DC] space-y-2">
                <span className="text-xs font-bold text-[#252A27] block">
                  Direct Observable Visual Signs:
                </span>
                <div className="space-y-1">
                  {result.visibleSigns.map((sign, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-[#626963]">
                      <span className="text-[#315C4C] font-bold">•</span>
                      <span>{sign}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* C. DIAGNOSTIC TESTS NEEDED & MISSING CLINICAL INFO */}
            <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E5E3DC] space-y-2.5 text-xs text-[#626963]">
              <span className="font-bold text-[#252A27] block">
                Clinical Tests Required for Definite Diagnosis:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-2 bg-white rounded-lg border border-[#E5E3DC] font-normal">
                  🌡️ <strong>Body Temperature:</strong> Rule out fever or systemic infection
                </div>
                <div className="p-2 bg-white rounded-lg border border-[#E5E3DC] font-normal">
                  🩺 <strong>Physical Palpation:</strong> Check for localized heat and tenderness
                </div>
                <div className="p-2 bg-white rounded-lg border border-[#E5E3DC] font-normal">
                  🔬 <strong>Skin Scrape / Cytology:</strong> Check for mites, yeast, or bacteria
                </div>
                <div className="p-2 bg-white rounded-lg border border-[#E5E3DC] font-normal">
                  🩸 <strong>Blood / Lab Panel:</strong> Evaluate organ and immune function
                </div>
              </div>
            </div>

            {/* D. HARMFUL PRACTICES TO AVOID */}
            {avoids.length > 0 && (
              <div className="p-3.5 rounded-xl bg-[#FDF2F2] border border-[#F2D6D6] space-y-2 text-xs">
                <div className="font-bold text-[#B44A4A] flex items-center gap-1.5">
                  <Ban className="w-3.5 h-3.5 text-[#B44A4A]" />
                  <span>Practices to Avoid:</span>
                </div>
                <div className="space-y-1">
                  {avoids.map((avoid, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[#B44A4A] font-normal">
                      <span className="font-bold">✕</span>
                      <span>{avoid}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* E. OPTIONAL FOLLOW-UP QUESTIONS */}
            {result.followUpQuestions && result.followUpQuestions.length > 0 && (
              <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E5E3DC] space-y-2.5">
                <span className="text-xs font-bold text-[#252A27] block">
                  Caregiver Triage Questions:
                </span>
                <div className="space-y-2">
                  {result.followUpQuestions.map((q, idx) => {
                    const currentAns = followUpAnswers.find((a) => a.questionId === q.id)?.answer;
                    return (
                      <div
                        key={q.id}
                        className="p-2.5 bg-white rounded-lg border border-[#E5E3DC] space-y-1.5"
                      >
                        <p className="text-xs font-semibold text-[#252A27]">
                          {idx + 1}. {q.question}
                        </p>
                        <div className="grid grid-cols-4 gap-1">
                          {(
                            [
                              { id: "yes", label: "Yes" },
                              { id: "no", label: "No" },
                              { id: "unknown", label: "Not Sure" },
                              { id: "skip", label: "Skip" },
                            ] as const
                          ).map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleAnswerQuestion(q, opt.id)}
                              className={`py-1 text-[11px] font-semibold rounded border transition-colors cursor-pointer ${
                                currentAns === opt.id
                                  ? "bg-[#315C4C] text-white border-[#315C4C]"
                                  : "bg-[#FAF9F5] text-[#626963] border-[#E5E3DC] hover:bg-[#F2EFE9]"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* F. CORRECTION & RE-ANALYSIS TOOL */}
            <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E5E3DC] space-y-2.5">
              <span className="text-xs font-bold text-[#252A27] flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-[#315C4C]" />
                <span>Correct Species or Body Region:</span>
              </span>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-[10px] font-semibold text-[#626963] mb-1">
                    Correct Species:
                  </label>
                  <select
                    value={correctedAnimal}
                    onChange={(e) => setCorrectedAnimal(e.target.value)}
                    className="w-full p-2 bg-white border border-[#E5E3DC] rounded-lg font-normal text-[#252A27]"
                  >
                    {ANIMAL_CORRECTION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-[#626963] mb-1">
                    Correct Affected Area:
                  </label>
                  <select
                    value={correctedBodyArea}
                    onChange={(e) => setCorrectedBodyArea(e.target.value)}
                    className="w-full p-2 bg-white border border-[#E5E3DC] rounded-lg font-normal text-[#252A27]"
                  >
                    {BODY_AREA_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  disabled={isReanalyzing}
                  onClick={handleApplyCorrections}
                  className="w-full py-2 bg-[#315C4C] hover:bg-[#25473B] disabled:opacity-50 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isReanalyzing ? "animate-spin" : ""}`} />
                  <span>{isReanalyzing ? "Reanalysing..." : "Reanalyse with Corrections"}</span>
                </button>
              </div>
            </div>

            {/* G. FEEDBACK WIDGET */}
            <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E5E3DC] space-y-2">
              <span className="text-xs font-bold text-[#252A27] block">
                Was this health report clear & helpful?
              </span>
              {feedbackSubmitted ? (
                <div className="p-2 bg-[#E7EEE9] text-[#25473B] rounded-lg border border-[#D2DFD7] text-xs font-semibold flex items-center gap-1.5">
                  <CheckCheck className="w-3.5 h-3.5 text-[#315C4C]" />
                  <span>Thank you! Feedback saved locally.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: "helpful", label: "👍 Helpful" },
                      { id: "not_helpful", label: "👎 Needs Improvement" },
                      { id: "incorrect_animal", label: "🐾 Wrong Animal" },
                      { id: "difficult_to_understand", label: "❓ Difficult to Read" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSubmitFeedback(opt.id)}
                      className="py-1.5 px-2 text-xs font-medium rounded-lg border border-[#E5E3DC] bg-white hover:bg-[#FAF9F5] text-[#252A27] text-center cursor-pointer"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* H. CONTEXTUAL LEARN CARDS */}
            <ContextualLearnCards
              animalType={
                typeof result.detectedAnimal === "string"
                  ? result.detectedAnimal
                  : result.detectedAnimal?.name || selectedAnimal
              }
              bodyArea={result.affectedBodyArea || bodyArea}
              visibleSigns={result.visibleSigns}
              severity={result.severity}
              settings={settings}
              onNavigateToLearn={onNavigateLearn}
            />
          </div>
        )}
      </div>

      {/* 8. SAFETY DISCLAIMER (Short & Visible) */}
      <div
        id="safety-disclaimer-notice"
        className="p-3.5 bg-[#FAF9F5] border border-[#E5E3DC] rounded-xl text-[11px] text-[#626963] text-center leading-relaxed font-normal"
      >
        <p>
          ⚖️ <strong>Safety Disclaimer:</strong> This is an AI-assisted preliminary screening, not a
          veterinary diagnosis. Contact a veterinarian for professional medical advice.
        </p>
      </div>

      {/* 9. REPORT ACTIONS (Bottom Sticky / Primary Actions) */}
      <div
        id="report-action-buttons"
        className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2"
      >
        {/* Download TXT */}
        <button
          type="button"
          id="download-report-btn"
          onClick={handleDownloadTxt}
          className="py-2.5 px-3 bg-white hover:bg-[#FAF9F5] text-[#252A27] font-semibold text-xs rounded-xl border border-[#E5E3DC] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-[#626963]" />
          <span>Save TXT</span>
        </button>

        {/* Share Report */}
        <button
          type="button"
          id="share-report-btn"
          onClick={handleShareReport}
          className="py-2.5 px-3 bg-white hover:bg-[#FAF9F5] text-[#252A27] font-semibold text-xs rounded-xl border border-[#E5E3DC] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          <Share2 className="w-3.5 h-3.5 text-[#626963]" />
          <span>Share</span>
        </button>

        {/* View Full Summary */}
        <button
          type="button"
          id="full-report-modal-btn"
          onClick={() => setIsReportModalOpen(true)}
          className="py-2.5 px-3 bg-[#315C4C] hover:bg-[#25473B] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Full Report</span>
        </button>

        {/* Scan Another Animal */}
        <button
          type="button"
          id="scan-another-animal-btn"
          onClick={onScanAnother}
          className="py-2.5 px-3 bg-[#FAF9F5] hover:bg-[#F2EFE9] text-[#252A27] font-semibold text-xs rounded-xl border border-[#E5E3DC] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#626963]" />
          <span>Scan Next</span>
        </button>
      </div>

      {/* MODALS */}
      {isReportModalOpen && (
        <VeterinaryReportModal
          result={result}
          record={activeRecord}
          animalProfile={animalProfile}
          selectedAnimal={selectedAnimal}
          bodyArea={bodyArea}
          symptoms={symptoms}
          settings={settings}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}

      {isFollowUpModalOpen && activeRecord && (
        <FollowUpModal
          record={activeRecord}
          settings={settings}
          animalProfile={animalProfile}
          onClose={() => setIsFollowUpModalOpen(false)}
          onSaved={(updated) => {
            if (onRecordUpdated) onRecordUpdated(updated);
          }}
        />
      )}

      {isNearbyModalOpen && (
        <NearbyVetModal
          isOpen={isNearbyModalOpen}
          onClose={() => setIsNearbyModalOpen(false)}
          language={settings.language}
        />
      )}
    </div>
  );
};
