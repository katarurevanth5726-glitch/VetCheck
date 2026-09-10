import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
  Stethoscope,
  Info,
  Clock,
  ArrowRight,
} from "lucide-react";
import { ScreeningRecord, FollowUpLog, ComparisonResult, UserSettings, AnimalProfile } from "../types";
import { compressImage } from "../utils/imageCompressor";
import { addFollowUpToRecord } from "../utils/storage";
import { apiUrl } from "../config/api";
import { useModalHistory } from "../utils/useModalHistory";

interface FollowUpModalProps {
  record: ScreeningRecord;
  settings: UserSettings;
  animalProfile?: AnimalProfile;
  onClose: () => void;
  onSaved: (updatedRecord: ScreeningRecord) => void;
}

export const FollowUpModal: React.FC<FollowUpModalProps> = ({
  record,
  settings,
  animalProfile,
  onClose,
  onSaved,
}) => {
  useModalHistory({
    isOpen: true,
    onClose,
    modalKey: "follow_up",
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const [scheduledLabel, setScheduledLabel] = useState<string>("Tomorrow Checkup");
  const [statusCondition, setStatusCondition] = useState<"improving" | "unchanged" | "worsening">("improving");
  const [isEatingDrinking, setIsEatingDrinking] = useState<"yes" | "no" | "partial">("yes");
  const [vetConsulted, setVetConsulted] = useState<"yes" | "no" | "scheduled">("no");
  const [newObservedSigns, setNewObservedSigns] = useState<string>("");
  const [userNotes, setUserNotes] = useState<string>("");

  // Comparison image
  const [followUpImage, setFollowUpImage] = useState<string | null>(null);
  const [followUpBase64, setFollowUpBase64] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const originalImage = record.imageThumbnail;
  const originalDate = new Date(record.timestamp).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleImageSelected = async (file: File) => {
    try {
      const compressed = await compressImage(file, 1024, 1024, 0.8);
      setFollowUpImage(compressed.dataUrl);
      setFollowUpBase64(compressed.base64);
      setComparisonResult(null);
      setComparisonError(null);
    } catch (e) {
      console.error("Compression error:", e);
    }
  };

  const handleRunAiComparison = async () => {
    if (!followUpBase64 || !originalImage) return;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setComparisonError("Internet connection is required for this feature. Please try again when you're online.");
      return;
    }

    setIsComparing(true);
    setComparisonError(null);

    try {
      let data: ComparisonResult | null = null;
      try {
        const res = await fetch(apiUrl("/api/compare"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            originalImageBase64: originalImage,
            newImageBase64: followUpBase64,
            originalDate,
            newDate: "Today",
            animalType: record.result.detectedAnimal || record.selectedAnimal || "Animal",
            conditionName: record.result.possibleConditions[0]?.name || "Monitored condition",
            language: settings.language,
            languageName: "English",
          }),
        });

        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
          data = await res.json();
        }
      } catch (fetchErr) {
        console.warn("Server comparison fetch failed, using client fallback:", fetchErr);
        data = null;
      }

      if (!data || !data.status) {
        throw new Error("Comparison could not be completed by server.");
      }

      setComparisonResult(data);

      if (data.status === "Improved") setStatusCondition("improving");
      else if (data.status === "Worsened") setStatusCondition("worsening");
      else if (data.status === "Similar") setStatusCondition("unchanged");
    } catch (err: any) {
      console.warn("Comparison failed:", err);
      setComparisonError("Could not complete automatic AI visual comparison. You can still save your manual follow-up log.");
    } finally {
      setIsComparing(false);
    }
  };

  const handleSaveFollowUp = () => {
    setIsSaving(true);
    const newLog: FollowUpLog = {
      id: "fl-" + Date.now(),
      screeningId: record.id,
      animalProfileId: record.animalProfileId,
      scheduledFor: Date.now(),
      scheduledLabel,
      createdAt: Date.now(),
      completedAt: Date.now(),
      statusCondition,
      isEatingDrinking,
      vetConsulted,
      newObservedSigns: newObservedSigns.trim() || undefined,
      followUpImage: followUpImage || undefined,
      followUpImageBase64: followUpBase64 || undefined,
      comparisonResult: comparisonResult || undefined,
      userNotes: userNotes.trim() || undefined,
    };

    const updatedHistory = addFollowUpToRecord(record.id, newLog);
    const updatedRecord = updatedHistory.find((r) => r.id === record.id) || {
      ...record,
      followUps: [newLog, ...(record.followUps || [])],
      status: statusCondition,
    };

    setIsSaving(false);
    onSaved(updatedRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full my-auto overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                Log Animal Health Follow-Up
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {animalProfile ? `${animalProfile.name} • ` : ""}
                Screening on {originalDate}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Timeline schedule selector */}
          <div>
            <label className="text-xs font-extrabold text-slate-800 block mb-1.5">
              Follow-Up Checkpoint:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Today (+6h)", val: "Today Checkup" },
                { label: "Tomorrow (+24h)", val: "Tomorrow Checkup" },
                { label: "In 2 Days (+48h)", val: "2-Day Checkup" },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setScheduledLabel(opt.val)}
                  className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    scheduledLabel === opt.val
                      ? "bg-teal-600 text-white border-teal-600 shadow-2xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Condition Status Selector */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
            <label className="text-xs font-extrabold text-slate-800 block">
              1. How does the animal's visible condition look compared to baseline?
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatusCondition("improving")}
                className={`p-2.5 rounded-xl text-xs font-extrabold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  statusCondition === "improving"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Improving</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusCondition("unchanged")}
                className={`p-2.5 rounded-xl text-xs font-extrabold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  statusCondition === "unchanged"
                    ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                    : "bg-white text-amber-800 border-amber-200 hover:bg-amber-50"
                }`}
              >
                <Minus className="w-4 h-4" />
                <span>Unchanged</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusCondition("worsening")}
                className={`p-2.5 rounded-xl text-xs font-extrabold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  statusCondition === "worsening"
                    ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                    : "bg-white text-rose-800 border-rose-200 hover:bg-rose-50"
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                <span>Worsening</span>
              </button>
            </div>
          </div>

          {/* Eating / Drinking Habits */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-800 block">
              2. Is the animal eating and drinking normally?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "yes", label: "Yes (Normal appetite)" },
                { id: "partial", label: "Partial / Reduced" },
                { id: "no", label: "No (Refusing food/water)" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setIsEatingDrinking(item.id as any)}
                  className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isEatingDrinking === item.id
                      ? "bg-teal-600 text-white border-teal-600 shadow-2xs"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vet Consulted status */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-800 block">
              3. Has a veterinarian been consulted?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "no", label: "Not Yet" },
                { id: "scheduled", label: "Appointment Booked" },
                { id: "yes", label: "Yes, Vet Examined" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setVetConsulted(item.id as any)}
                  className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    vetConsulted === item.id
                      ? "bg-teal-600 text-white border-teal-600 shadow-2xs"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* New Observed Signs */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-800 block">
              4. Any new visible signs, swelling, or changes?
            </label>
            <input
              type="text"
              value={newObservedSigns}
              onChange={(e) => setNewObservedSigns(e.target.value)}
              placeholder="e.g. Swelling subsided, or redness spread to flank..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-teal-600 font-medium"
            />
          </div>

          {/* BEFORE-AND-AFTER COMPARISON SECTION */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span>5. Before-and-After Photo Comparison (Optional)</span>
              </div>
              <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full">
                AI Vision Comparison
              </span>
            </div>

            {/* Side-by-side photos */}
            <div className="grid grid-cols-2 gap-3">
              {/* Baseline photo */}
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-600 block">
                  Original Photo ({originalDate})
                </span>
                <div className="aspect-4/3 rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
                  <img
                    src={originalImage}
                    alt="Baseline"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              {/* Follow-up photo */}
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-600 block">
                  New Follow-Up Photo (Today)
                </span>
                {followUpImage ? (
                  <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-900 border border-teal-500">
                    <img
                      src={followUpImage}
                      alt="Follow up"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFollowUpImage(null);
                        setFollowUpBase64(null);
                        setComparisonResult(null);
                      }}
                      className="absolute top-1 right-1 p-1 bg-slate-900/80 text-white rounded-md hover:bg-slate-900 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="aspect-4/3 rounded-xl border-2 border-dashed border-slate-300 hover:border-teal-500 bg-white flex flex-col items-center justify-center p-2 text-center cursor-pointer transition-colors">
                    <Camera className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-[10px] font-bold text-teal-700">Add New Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleImageSelected(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Run AI Comparison Button */}
            {followUpImage && !comparisonResult && (
              <button
                type="button"
                onClick={handleRunAiComparison}
                disabled={isComparing}
                className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-slate-300"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isComparing ? "Analyzing Visible Differences..." : "Compare Photos with AI Vision"}</span>
              </button>
            )}

            {/* AI Comparison Results Card */}
            {comparisonResult && (
              <div className="p-3 bg-white border border-teal-200 rounded-xl space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <span>Visual Change:</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                        comparisonResult.status === "Improved"
                          ? "bg-emerald-100 text-emerald-800"
                          : comparisonResult.status === "Worsened"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {comparisonResult.status}
                    </span>
                  </div>
                </div>

                {comparisonResult.summary && (
                  <p className="text-xs text-slate-700 font-medium">
                    {comparisonResult.summary}
                  </p>
                )}

                {comparisonResult.visibleChanges && comparisonResult.visibleChanges.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-slate-100">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Observable Changes:</div>
                    <ul className="space-y-1">
                      {comparisonResult.visibleChanges.map((ch, idx) => (
                        <li key={idx} className="text-[11px] text-slate-700 flex items-start gap-1.5">
                          <span className="text-teal-600 font-bold">•</span>
                          <span>{ch}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Important Clinical Limitation notice */}
                <div className="p-2 bg-amber-50/70 border border-amber-200 rounded-lg text-[10px] text-amber-800 font-medium flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Safety Notice:</strong> Visual surface improvement does not guarantee complete resolution of internal pathogens or parasites. Never stop prescribed veterinary medications without a vet's direction.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveFollowUp}
            disabled={isSaving}
            className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:bg-slate-300"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{isSaving ? "Saving..." : "Save Follow-Up Log"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
