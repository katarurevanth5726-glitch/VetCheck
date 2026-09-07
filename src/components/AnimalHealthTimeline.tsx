import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Syringe,
  Pill,
  Camera,
  Activity,
  FileText,
  Building2,
  Stethoscope,
  Clock,
  Plus,
  Share2,
  Download,
  Volume2,
  VolumeX,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Sparkles,
  Heart,
  Trash2,
  Eye,
  Info,
  X,
  Save,
} from "lucide-react";
import {
  AnimalProfile,
  ScreeningRecord,
  CareReminder,
  VeterinaryPrescription,
  VetVisit,
  FollowUpLog,
  UserSettings,
} from "../types";
import {
  getRemindersForAnimal,
  getPrescriptionsForAnimal,
  getVetVisitsForAnimal,
  saveVetVisit,
  deleteVetVisit,
  toggleReminderCompleted,
  getStoredReminders,
} from "../utils/storage";
import {
  downloadHealthHistoryPdf,
  shareHealthHistory,
  AnimalHealthHistoryData,
} from "../utils/healthHistoryPdf";
import { VeterinaryReportModal } from "./VeterinaryReportModal";
import { PrescriptionModal } from "./PrescriptionModal";
import { downloadPrescriptionPdf } from "../utils/prescriptionPdf";

export type TimelineFilter =
  | "all"
  | "scans"
  | "vaccines"
  | "deworming"
  | "prescriptions"
  | "recovery"
  | "visits";

export type TimelineStatus =
  | "normal"
  | "needs_attention"
  | "vet_recommended"
  | "urgent";

export interface TimelineItem {
  id: string;
  dateStr: string;
  timestamp: number;
  type: "scan" | "vaccination" | "deworming" | "prescription" | "recovery" | "visit";
  title: string;
  summary: string;
  status: TimelineStatus;
  statusLabel: string;
  rawRecord?: ScreeningRecord;
  rawReminder?: CareReminder;
  rawPrescription?: VeterinaryPrescription;
  rawVisit?: VetVisit;
  rawFollowUp?: FollowUpLog;
}

interface AnimalHealthTimelineProps {
  profile: AnimalProfile;
  allRecords: ScreeningRecord[];
  settings: UserSettings;
  onNavigateToScan?: (profile: AnimalProfile) => void;
}

export const AnimalHealthTimeline: React.FC<AnimalHealthTimelineProps> = ({
  profile,
  allRecords,
  settings,
  onNavigateToScan,
}) => {
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const [reminders, setReminders] = useState<CareReminder[]>([]);
  const [prescriptions, setPrescriptions] = useState<VeterinaryPrescription[]>([]);
  const [vetVisits, setVetVisits] = useState<VetVisit[]>([]);

  // Modals
  const [isAddingVisit, setIsAddingVisit] = useState(false);
  const [selectedReportRecord, setSelectedReportRecord] = useState<ScreeningRecord | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<VeterinaryPrescription | null>(null);
  const [selectedFollowUp, setSelectedFollowUp] = useState<{ log: FollowUpLog; record: ScreeningRecord } | null>(null);

  // New Visit Form State
  const todayStr = new Date().toISOString().split("T")[0];
  const [visitDate, setVisitDate] = useState(todayStr);
  const [visitVet, setVisitVet] = useState("");
  const [visitHospital, setVisitHospital] = useState("");
  const [visitReason, setVisitReason] = useState("");
  const [visitNotes, setVisitNotes] = useState("");

  // Sharing feedback
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  // TTS Read Aloud State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Load animal records
  const loadData = () => {
    const animalReminders = getRemindersForAnimal(profile.id);
    const animalPrescriptions = getPrescriptionsForAnimal(profile.id);
    const animalVisits = getVetVisitsForAnimal(profile.id);

    setReminders(animalReminders);
    setPrescriptions(animalPrescriptions);
    setVetVisits(animalVisits);
  };

  useEffect(() => {
    loadData();
  }, [profile.id]);

  // Specific screening records for this animal
  const animalScreenings = useMemo(() => {
    return allRecords.filter((r) => r.animalProfileId === profile.id);
  }, [allRecords, profile.id]);

  // Combine and sort all items into the unified chronological timeline (newest first)
  const timelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    // 1. Health Scans
    animalScreenings.forEach((scan) => {
      let status: TimelineStatus = "normal";
      let statusLabel = "Normal / Stable";

      if (scan.result.severity === "Emergency" || scan.result.isEmergencyAlert) {
        status = "urgent";
        statusLabel = "Urgent Attention";
      } else if (scan.result.severity === "Serious") {
        status = "vet_recommended";
        statusLabel = "Vet Check Recommended";
      } else if (scan.result.severity === "Moderate") {
        status = "needs_attention";
        statusLabel = "Needs Attention";
      } else {
        status = "normal";
        statusLabel = "Normal / Mild";
      }

      const dateObj = new Date(scan.timestamp);
      const formattedDate = dateObj.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const conditionName =
        scan.result.possibleConditions?.[0]?.name ||
        scan.result.affectedBodyArea ||
        "Visual Health Screening";

      items.push({
        id: `scan-${scan.id}`,
        timestamp: scan.timestamp,
        dateStr: formattedDate,
        type: "scan",
        title: `Health Scan • ${scan.bodyArea || scan.result.affectedBodyArea || "Observation"}`,
        summary: `${conditionName}. ${scan.result.simpleExplanation ? scan.result.simpleExplanation.slice(0, 110) + "..." : ""}`,
        status,
        statusLabel,
        rawRecord: scan,
      });

      // 1b. Recovery Follow-Up Checkpoints
      if (scan.followUps && scan.followUps.length > 0) {
        scan.followUps.forEach((fl) => {
          const flTimestamp = fl.completedAt || fl.createdAt || scan.timestamp;
          const flDate = new Date(flTimestamp).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });

          let flStatus: TimelineStatus = "normal";
          let flStatusLabel = "Improved";

          if (fl.statusCondition === "worsening") {
            flStatus = "urgent";
            flStatusLabel = "Appears Worse";
          } else if (fl.statusCondition === "unchanged") {
            flStatus = "needs_attention";
            flStatusLabel = "Condition Unchanged";
          } else {
            flStatus = "normal";
            flStatusLabel = "Visible Improvement";
          }

          items.push({
            id: `fl-${fl.id}`,
            timestamp: flTimestamp,
            dateStr: flDate,
            type: "recovery",
            title: `Recovery Follow-Up • ${fl.scheduledLabel || "Checkup"}`,
            summary: fl.comparisonResult?.summary || fl.userNotes || (fl.statusCondition === "improving" ? "Visible healing and recovery progress noted." : "Ongoing observation."),
            status: flStatus,
            statusLabel: flStatusLabel,
            rawFollowUp: fl,
            rawRecord: scan,
          });
        });
      }

      // 1c. Prescriptions attached to scans
      if (scan.prescription) {
        const rx = scan.prescription;
        const rxDate = rx.date || formattedDate;
        const rxTimestamp = rx.createdAt || scan.timestamp;
        const medsCount = rx.medicines?.length || 0;
        const medsSummary = medsCount > 0 ? rx.medicines.map((m) => m.name).join(", ") : "Prescription recorded";

        items.push({
          id: `rx-${rx.id || scan.id}`,
          timestamp: rxTimestamp,
          dateStr: rxDate,
          type: "prescription",
          title: `Veterinary Prescription • Dr. ${rx.doctorName || "Registered Vet"}`,
          summary: `${rx.diagnosisCondition || "Treatment"}: ${medsSummary}`,
          status: "normal",
          statusLabel: "Prescription Saved",
          rawPrescription: rx,
        });
      }
    });

    // 2. Standalone Prescriptions
    prescriptions.forEach((rx) => {
      // Avoid duplicate if already included via scan
      if (items.some((it) => it.id === `rx-${rx.id}`)) return;

      const rxDate = rx.date ? new Date(rx.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Recent";
      const rxTimestamp = rx.createdAt || Date.now();
      const medsCount = rx.medicines?.length || 0;
      const medsSummary = medsCount > 0 ? rx.medicines.map((m) => m.name).join(", ") : "Prescription recorded";

      items.push({
        id: `rx-${rx.id}`,
        timestamp: rxTimestamp,
        dateStr: rxDate,
        type: "prescription",
        title: `Veterinary Prescription • Dr. ${rx.doctorName || "Vet"}`,
        summary: `${rx.diagnosisCondition || "Treatment"}: ${medsSummary} (${rx.hospitalClinic || "Dispensary"})`,
        status: "normal",
        statusLabel: "Prescription Saved",
        rawPrescription: rx,
      });
    });

    // 3. Vaccinations, Dewormings & Follow-Up Reminders (Reminders & Administered records)
    reminders.forEach((rem) => {
      const isFollowUp = rem.reminderType === "follow_up" || rem.type === "follow_up";
      const isVaccine = rem.reminderType === "vaccination" || rem.type === "vaccination";
      const type = isFollowUp ? "visit" : isVaccine ? "vaccination" : "deworming";

      const effectiveDateStr = rem.administeredDate || rem.dueDate;
      const effectiveTimestamp = rem.completedAt || (rem.administeredDate ? new Date(rem.administeredDate).getTime() : rem.createdAt || new Date(rem.dueDate).getTime());
      const formattedDate = new Date(effectiveDateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const today = new Date().toISOString().split("T")[0];
      const isOverdue = !rem.completed && rem.dueDate < today;
      const isDueSoon = !rem.completed && rem.dueDate >= today;

      let status: TimelineStatus = "normal";
      let statusLabel = "Completed";

      if (rem.completed) {
        status = "normal";
        statusLabel = isFollowUp ? "Follow-Up Done" : "Completed";
      } else if (isOverdue) {
        status = "urgent";
        statusLabel = isFollowUp ? "Overdue Follow-Up" : "Overdue";
      } else if (isDueSoon) {
        status = "needs_attention";
        statusLabel = isFollowUp ? "Follow-Up Scheduled" : "Due Soon";
      }

      let summary = "";
      if (isFollowUp) {
        if (rem.completed) {
          summary = `Veterinary follow-up completed for ${rem.animalName}. ${rem.reason ? `Reason: ${rem.reason}.` : ""} ${rem.notes || ""}`;
        } else {
          summary = `Veterinary follow-up check scheduled for ${rem.dueDate}. ${rem.reason ? `Reason: ${rem.reason}.` : ""} ${rem.notes || ""}`;
        }
      } else if (rem.completed) {
        summary = `${rem.title} completed. ${rem.veterinarian ? `Administered by ${rem.veterinarian}.` : ""} ${rem.recurrence && rem.recurrence !== "none" ? `Next due scheduled.` : ""}`;
      } else {
        summary = `${rem.title} scheduled for ${rem.dueDate}. ${rem.notes || ""}`;
      }

      const itemTitle = isFollowUp
        ? `🩺 Follow-Up Visit • ${rem.reason || rem.title || "Veterinary Check"}`
        : `${isVaccine ? "Vaccination" : "Deworming"} • ${rem.title}`;

      items.push({
        id: `rem-${rem.id}`,
        timestamp: effectiveTimestamp,
        dateStr: formattedDate,
        type,
        title: itemTitle,
        summary: summary.trim(),
        status,
        statusLabel,
        rawReminder: rem,
      });
    });

    // 4. Veterinary Clinic Visits
    vetVisits.forEach((visit) => {
      const formattedDate = new Date(visit.date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const visitTimestamp = visit.createdAt || new Date(visit.date).getTime();

      const docAndHospital = [visit.veterinarian ? `Dr. ${visit.veterinarian}` : "", visit.hospitalClinic]
        .filter(Boolean)
        .join(" • ");

      items.push({
        id: `visit-${visit.id}`,
        timestamp: visitTimestamp,
        dateStr: formattedDate,
        type: "visit",
        title: `Vet Visit • ${visit.reason}`,
        summary: `${docAndHospital ? docAndHospital + ". " : ""}${visit.notes || "Clinical consultation completed."}`,
        status: "normal",
        statusLabel: "Consultation Done",
        rawVisit: visit,
      });
    });

    // Sort newest first
    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [animalScreenings, prescriptions, reminders, vetVisits]);

  // Filtered timeline
  const filteredTimelineItems = useMemo(() => {
    if (filter === "all") return timelineItems;
    if (filter === "scans") return timelineItems.filter((i) => i.type === "scan");
    if (filter === "vaccines") return timelineItems.filter((i) => i.type === "vaccination");
    if (filter === "deworming") return timelineItems.filter((i) => i.type === "deworming");
    if (filter === "prescriptions") return timelineItems.filter((i) => i.type === "prescription");
    if (filter === "recovery") return timelineItems.filter((i) => i.type === "recovery");
    if (filter === "visits") return timelineItems.filter((i) => i.type === "visit");
    return timelineItems;
  }, [timelineItems, filter]);

  // Upcoming Care Items (Not completed, sorted by due date)
  const upcomingCareList = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return reminders
      .filter((r) => !r.completed)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [reminders]);

  // Quick Health Summary Calculations (Section 9)
  const healthSummary = useMemo(() => {
    // 1. Current Status
    let overallStatus: "normal" | "needs_attention" | "vet_recommended" | "urgent" = "normal";
    let statusText = "🟢 Doing Well";

    const hasEmergency = animalScreenings.some(
      (s) => s.result.severity === "Emergency" || s.result.isEmergencyAlert
    );
    const hasOverdue = reminders.some((r) => !r.completed && r.dueDate < todayStr);
    const hasWorsening = animalScreenings.some((s) => s.status === "worsening");
    const hasSerious = animalScreenings.some((s) => s.result.severity === "Serious");
    const hasDueSoon = reminders.some((r) => !r.completed && r.dueDate >= todayStr);

    if (hasEmergency || hasWorsening) {
      overallStatus = "urgent";
      statusText = "🔴 Urgent Attention";
    } else if (hasSerious || hasOverdue) {
      overallStatus = "vet_recommended";
      statusText = hasOverdue ? "🔴 Care Overdue" : "🟠 Vet Check Recommended";
    } else if (hasDueSoon) {
      overallStatus = "needs_attention";
      statusText = "🟡 Needs Attention (Care Due)";
    } else {
      overallStatus = "normal";
      statusText = "🟢 Doing Well";
    }

    // 2. Last Scan
    let lastScanDate: string | null = null;
    if (animalScreenings.length > 0) {
      const sorted = [...animalScreenings].sort((a, b) => b.timestamp - a.timestamp);
      lastScanDate = new Date(sorted[0].timestamp).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });
    }

    // 3. Next Care
    let nextCareText: string | null = null;
    if (upcomingCareList.length > 0) {
      const nextItem = upcomingCareList[0];
      const dueDateFormatted = new Date(nextItem.dueDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });
      nextCareText = `${nextItem.title} — ${dueDateFormatted}`;
    }

    // 4. Last Vet Visit
    let lastVetVisitDate: string | null = null;
    if (vetVisits.length > 0) {
      const sortedVisits = [...vetVisits].sort((a, b) => b.date.localeCompare(a.date));
      lastVetVisitDate = new Date(sortedVisits[0].date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });
    }

    return {
      overallStatus,
      statusText,
      lastScanDate,
      nextCareText,
      lastVetVisitDate,
    };
  }, [animalScreenings, reminders, upcomingCareList, vetVisits, todayStr]);

  // Read Aloud handler (Section 16)
  const handleReadAloud = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Speech synthesis is not supported on this browser.");
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    // Construct short 2-3 sentence animal summary
    const scanPart = healthSummary.lastScanDate
      ? `The latest health scan was on ${healthSummary.lastScanDate}.`
      : "No recent scans are logged.";
    const statusPart = `Current condition is ${healthSummary.statusText.replace(/[🟢🟡🟠🔴]/g, "").trim()}.`;
    const carePart = healthSummary.nextCareText
      ? `Next scheduled care is ${healthSummary.nextCareText}.`
      : "All care is up to date.";
    const visitPart = healthSummary.lastVetVisitDate
      ? `Last veterinary consultation was on ${healthSummary.lastVetVisitDate}.`
      : "";

    const speechText = `${profile.name} the ${profile.species}. ${statusPart} ${scanPart} ${carePart} ${visitPart}`;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = settings.ttsVoiceSpeed || 1.0;
    utterance.pitch = settings.ttsPitch || 1.0;
    utterance.lang = settings.language === "hi" ? "hi-IN" : "en-IN";

    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  // Download Health History PDF
  const handleDownloadPdf = () => {
    const historyData: AnimalHealthHistoryData = {
      profile,
      screenings: animalScreenings,
      reminders,
      prescriptions,
      vetVisits,
    };
    downloadHealthHistoryPdf(historyData);
  };

  // Share Health History
  const handleShareHistory = async () => {
    const historyData: AnimalHealthHistoryData = {
      profile,
      screenings: animalScreenings,
      reminders,
      prescriptions,
      vetVisits,
    };
    setShareStatus("Sharing...");
    const res = await shareHealthHistory(historyData);
    if (res.success) {
      setShareStatus(res.method === "share" ? "Shared successfully" : "Summary copied to clipboard & PDF downloaded");
    } else {
      setShareStatus("PDF downloaded");
    }
    setTimeout(() => setShareStatus(null), 3500);
  };

  // Add Vet Visit
  const handleSaveVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitReason.trim()) return;

    const newVisits = saveVetVisit({
      animalProfileId: profile.id,
      animalName: profile.name,
      date: visitDate || todayStr,
      veterinarian: visitVet.trim() || undefined,
      hospitalClinic: visitHospital.trim() || undefined,
      reason: visitReason.trim(),
      notes: visitNotes.trim() || undefined,
    });

    setVetVisits(newVisits.filter((v) => v.animalProfileId === profile.id));
    setIsAddingVisit(false);
    setVisitReason("");
    setVisitVet("");
    setVisitHospital("");
    setVisitNotes("");
  };

  const handleDeleteVisit = (id: string) => {
    if (confirm("Delete this veterinary visit record?")) {
      const updated = deleteVetVisit(id);
      setVetVisits(updated.filter((v) => v.animalProfileId === profile.id));
    }
  };

  // Complete reminder
  const handleToggleReminder = (rem: CareReminder) => {
    toggleReminderCompleted(rem.id, rem.recurrence && rem.recurrence !== "none");
    loadData();
  };

  // Helper status color styling
  const getStatusBadge = (status: TimelineStatus, label: string) => {
    switch (status) {
      case "urgent":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
            <span>🔴 {label}</span>
          </span>
        );
      case "vet_recommended":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
            <span>🟠 {label}</span>
          </span>
        );
      case "needs_attention":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-yellow-100 text-yellow-900 border border-yellow-300">
            <span>🟡 {label}</span>
          </span>
        );
      case "normal":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-200">
            <span>🟢 {label}</span>
          </span>
        );
    }
  };

  const getItemIcon = (type: TimelineItem["type"]) => {
    switch (type) {
      case "scan":
        return <Camera className="w-4 h-4 text-teal-700" />;
      case "vaccination":
        return <Syringe className="w-4 h-4 text-emerald-700" />;
      case "deworming":
        return <Pill className="w-4 h-4 text-amber-700" />;
      case "prescription":
        return <Stethoscope className="w-4 h-4 text-indigo-700" />;
      case "recovery":
        return <Activity className="w-4 h-4 text-teal-700" />;
      case "visit":
        return <Building2 className="w-4 h-4 text-sky-700" />;
    }
  };

  const getItemNodeBg = (type: TimelineItem["type"]) => {
    switch (type) {
      case "scan":
        return "bg-teal-50 border-teal-300 text-teal-700";
      case "vaccination":
        return "bg-emerald-50 border-emerald-300 text-emerald-700";
      case "deworming":
        return "bg-amber-50 border-amber-300 text-amber-700";
      case "prescription":
        return "bg-indigo-50 border-indigo-300 text-indigo-700";
      case "recovery":
        return "bg-teal-50 border-teal-300 text-teal-700";
      case "visit":
        return "bg-sky-50 border-sky-300 text-sky-700";
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. QUICK HEALTH SUMMARY (Section 9 & 16) */}
      <div className="bg-gradient-to-br from-white to-[#FAF8F5] border-2 border-teal-700/20 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                {profile.name}
              </h3>
              <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                {profile.species}
              </span>
            </div>
            <p className="text-xs text-stone-500 font-medium mt-0.5">
              Health Passport & Comprehensive Medical Timeline
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Read Aloud Button */}
            <button
              type="button"
              onClick={handleReadAloud}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 ${
                isPlayingAudio
                  ? "bg-rose-50 border-rose-300 text-rose-700 animate-pulse"
                  : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
              }`}
              title="Listen to short summary"
            >
              {isPlayingAudio ? (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Stop</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-teal-700" />
                  <span className="hidden sm:inline">Listen</span>
                </>
              )}
            </button>

            {/* + Add Vet Visit */}
            <button
              type="button"
              onClick={() => setIsAddingVisit(true)}
              className="px-3 py-1.5 bg-[#154734] hover:bg-[#103828] text-white text-xs font-extrabold rounded-xl flex items-center gap-1 cursor-pointer transition-transform active:scale-95 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Vet Visit</span>
            </button>
          </div>
        </div>

        {/* Compact Key Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-200/80">
          <div className="bg-white/90 p-2.5 rounded-2xl border border-stone-200/80 space-y-0.5">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
              Current Status
            </span>
            <span className="text-xs font-black text-slate-900 block truncate">
              {healthSummary.statusText}
            </span>
          </div>

          {healthSummary.lastScanDate ? (
            <div className="bg-white/90 p-2.5 rounded-2xl border border-stone-200/80 space-y-0.5">
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
                Last Scan
              </span>
              <span className="text-xs font-black text-slate-900 block truncate">
                📷 {healthSummary.lastScanDate}
              </span>
            </div>
          ) : (
            <div className="bg-white/90 p-2.5 rounded-2xl border border-stone-200/80 space-y-0.5">
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
                Last Scan
              </span>
              <span className="text-xs font-bold text-stone-400 block truncate">
                No scans yet
              </span>
            </div>
          )}

          {healthSummary.nextCareText ? (
            <div className="bg-white/90 p-2.5 rounded-2xl border border-amber-200/80 bg-amber-50/40 space-y-0.5">
              <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block">
                Next Care
              </span>
              <span className="text-xs font-black text-amber-900 block truncate">
                🔔 {healthSummary.nextCareText}
              </span>
            </div>
          ) : (
            <div className="bg-white/90 p-2.5 rounded-2xl border border-stone-200/80 space-y-0.5">
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
                Next Care
              </span>
              <span className="text-xs font-bold text-emerald-700 block truncate">
                ✓ Up to date
              </span>
            </div>
          )}

          {healthSummary.lastVetVisitDate ? (
            <div className="bg-white/90 p-2.5 rounded-2xl border border-stone-200/80 space-y-0.5">
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
                Last Vet Visit
              </span>
              <span className="text-xs font-black text-slate-900 block truncate">
                🏥 {healthSummary.lastVetVisitDate}
              </span>
            </div>
          ) : (
            <div className="bg-white/90 p-2.5 rounded-2xl border border-stone-200/80 space-y-0.5">
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
                Last Vet Visit
              </span>
              <span className="text-xs font-bold text-stone-400 block truncate">
                No visits logged
              </span>
            </div>
          )}
        </div>

        {/* Download & Share Actions */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="text-[11px] text-stone-500 font-medium">
            {shareStatus ? (
              <span className="text-teal-700 font-bold animate-pulse">{shareStatus}</span>
            ) : (
              <span>Export medical records to show visiting veterinarian</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-teal-700" />
              <span>Download Health History</span>
            </button>

            <button
              type="button"
              onClick={handleShareHistory}
              className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all"
            >
              <Share2 className="w-3.5 h-3.5 text-teal-700" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. UPCOMING CARE SECTION (Section 6) */}
      <div className="bg-white border border-stone-200 rounded-3xl p-4 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between pb-1.5 border-b border-stone-100">
          <div className="flex items-center gap-1.5 text-slate-900 font-black text-xs">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Upcoming Care</span>
          </div>
          <span className="text-[10px] text-stone-400 font-medium">
            {upcomingCareList.length} scheduled item{upcomingCareList.length === 1 ? "" : "s"}
          </span>
        </div>

        {upcomingCareList.length === 0 ? (
          <div className="py-2.5 px-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Nothing due soon. All vaccines and deworming are up to date!</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {upcomingCareList.slice(0, 4).map((rem) => {
              const due = new Date(rem.dueDate);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isOverdue = due < today;
              const isDueToday = due.toDateString() === new Date().toDateString();

              // Calculate days diff
              const diffTime = due.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const relativeText = isOverdue
                ? "Overdue"
                : isDueToday
                ? "Due Today"
                : `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`;

              return (
                <div
                  key={rem.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 transition-all ${
                    isOverdue
                      ? "bg-rose-50/70 border-rose-200"
                      : isDueToday
                      ? "bg-amber-50/70 border-amber-200"
                      : "bg-teal-50/40 border-teal-200/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        rem.reminderType === "vaccination"
                          ? "bg-teal-100 text-teal-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {rem.reminderType === "vaccination" ? (
                        <Syringe className="w-3.5 h-3.5" />
                      ) : (
                        <Pill className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 truncate">
                        {rem.title}
                      </div>
                      <div className="text-[10px] font-bold text-stone-500 flex items-center gap-1.5">
                        <span
                          className={
                            isOverdue
                              ? "text-rose-700 font-extrabold"
                              : isDueToday
                              ? "text-amber-700 font-extrabold"
                              : "text-teal-700"
                          }
                        >
                          {relativeText}
                        </span>
                        <span>• {due.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleReminder(rem)}
                    className="px-2.5 py-1 bg-white hover:bg-teal-50 text-teal-800 border border-teal-200 rounded-lg text-[11px] font-bold shrink-0 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                    title="Mark Done"
                  >
                    <CheckCircle2 className="w-3 h-3 text-teal-600" />
                    <span>Done</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. TIMELINE FILTER CHIPS (Section 5) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            filter === "all"
              ? "bg-[#154734] text-white shadow-2xs"
              : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
          }`}
        >
          All ({timelineItems.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter("scans")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            filter === "scans"
              ? "bg-[#154734] text-white shadow-2xs"
              : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
          }`}
        >
          📷 Scans ({timelineItems.filter((i) => i.type === "scan").length})
        </button>

        <button
          type="button"
          onClick={() => setFilter("vaccines")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            filter === "vaccines"
              ? "bg-[#154734] text-white shadow-2xs"
              : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
          }`}
        >
          💉 Vaccines ({timelineItems.filter((i) => i.type === "vaccination").length})
        </button>

        <button
          type="button"
          onClick={() => setFilter("deworming")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            filter === "deworming"
              ? "bg-[#154734] text-white shadow-2xs"
              : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
          }`}
        >
          💊 Deworming ({timelineItems.filter((i) => i.type === "deworming").length})
        </button>

        <button
          type="button"
          onClick={() => setFilter("prescriptions")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            filter === "prescriptions"
              ? "bg-[#154734] text-white shadow-2xs"
              : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
          }`}
        >
          🩺 Prescriptions ({timelineItems.filter((i) => i.type === "prescription").length})
        </button>

        <button
          type="button"
          onClick={() => setFilter("recovery")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            filter === "recovery"
              ? "bg-[#154734] text-white shadow-2xs"
              : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
          }`}
        >
          📈 Recovery ({timelineItems.filter((i) => i.type === "recovery").length})
        </button>

        <button
          type="button"
          onClick={() => setFilter("visits")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            filter === "visits"
              ? "bg-[#154734] text-white shadow-2xs"
              : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
          }`}
        >
          🏥 Vet Visits ({timelineItems.filter((i) => i.type === "visit").length})
        </button>
      </div>

      {/* 4. UNIFIED VERTICAL TIMELINE (Section 3 & 4) */}
      <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-200">
        {filteredTimelineItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-6 text-center space-y-2">
            <Info className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-xs font-bold text-stone-600">
              No health timeline records found for this category.
            </p>
            <p className="text-[11px] text-stone-400">
              Complete a health scan, log a vaccination, or record a veterinary visit to build {profile.name}'s medical journey.
            </p>
            {onNavigateToScan && (
              <button
                type="button"
                onClick={() => onNavigateToScan(profile)}
                className="mt-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Start Health Scan</span>
              </button>
            )}
          </div>
        ) : (
          filteredTimelineItems.map((item) => (
            <div key={item.id} className="relative group">
              {/* Timeline Node Dot */}
              <div
                className={`absolute -left-6 sm:-left-8 top-3.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-xs ${getItemNodeBg(
                  item.type
                )}`}
              >
                {getItemIcon(item.type)}
              </div>

              {/* Timeline Card */}
              <div className="bg-white rounded-2xl border border-stone-200 p-3.5 sm:p-4 shadow-2xs hover:border-teal-300 transition-all space-y-2">
                {/* Header: Date + Event Type + Status */}
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <span className="text-[11px] font-black text-stone-400 uppercase tracking-wider block">
                      {item.dateStr}
                    </span>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">
                      {item.title}
                    </h4>
                  </div>

                  <div>{getStatusBadge(item.status, item.statusLabel)}</div>
                </div>

                {/* Single Short Status/Summary (Section 3) */}
                <p className="text-xs text-stone-600 font-medium leading-relaxed">
                  {item.summary}
                </p>

                {/* Optional Recovery Photo Thumbnail */}
                {item.type === "recovery" && item.rawFollowUp?.followUpImage && (
                  <div className="pt-1">
                    <img
                      src={item.rawFollowUp.followUpImage}
                      alt="Follow up observation"
                      className="w-14 h-14 rounded-xl object-cover border border-stone-200"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* Action Buttons based on item type */}
                <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                  <div className="text-[10px] text-stone-400 font-medium">
                    {item.type === "scan" && "AI Preliminary Health Check"}
                    {item.type === "vaccination" && "Immunization Passport"}
                    {item.type === "deworming" && "Parasite Drench"}
                    {item.type === "prescription" && "Official Rx"}
                    {item.type === "recovery" && "Visual Healing Log"}
                    {item.type === "visit" && "Clinical Consultation"}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* View Report for Scan */}
                    {item.type === "scan" && item.rawRecord && (
                      <button
                        type="button"
                        onClick={() => setSelectedReportRecord(item.rawRecord || null)}
                        className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                      >
                        <Eye className="w-3 h-3 text-teal-700" />
                        <span>View Report</span>
                      </button>
                    )}

                    {/* View Prescription */}
                    {item.type === "prescription" && item.rawPrescription && (
                      <>
                        <button
                          type="button"
                          onClick={() => downloadPrescriptionPdf(item.rawPrescription!)}
                          className="px-2.5 py-1 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                          title="Download Rx PDF"
                        >
                          <Download className="w-3 h-3 text-indigo-700" />
                          <span>PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedPrescription(item.rawPrescription || null)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                        >
                          <FileText className="w-3 h-3 text-indigo-700" />
                          <span>View Rx</span>
                        </button>
                      </>
                    )}

                    {/* View Recovery Detail */}
                    {item.type === "recovery" && item.rawFollowUp && item.rawRecord && (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedFollowUp({
                            log: item.rawFollowUp!,
                            record: item.rawRecord!,
                          })
                        }
                        className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                      >
                        <Activity className="w-3 h-3 text-teal-700" />
                        <span>View Recovery</span>
                      </button>
                    )}

                    {/* Delete Vet Visit if entered */}
                    {item.type === "visit" && item.rawVisit && (
                      <button
                        type="button"
                        onClick={() => handleDeleteVisit(item.rawVisit!.id)}
                        className="p-1 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                        title="Delete visit entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Toggle Follow-up or Care Reminder */}
                    {item.rawReminder && (
                      <button
                        type="button"
                        onClick={() => handleToggleReminder(item.rawReminder!)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs ${
                          item.rawReminder.completed
                            ? "bg-stone-100 text-stone-600 hover:bg-stone-200"
                            : "bg-emerald-50 hover:bg-emerald-100 text-[#154734] border border-emerald-200"
                        }`}
                      >
                        <CheckCircle2 className={`w-3 h-3 ${item.rawReminder.completed ? "text-stone-400" : "text-emerald-600"}`} />
                        <span>{item.rawReminder.completed ? "Done ✓" : "Mark Done"}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 5. ADD VET VISIT MODAL (Section 8) */}
      {isAddingVisit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-stone-200 shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    + Add Vet Visit
                  </h3>
                  <span className="text-[11px] text-stone-500 font-medium">
                    Log a clinic or farm consultation for {profile.name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingVisit(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVisit} className="space-y-3.5">
              {/* Date */}
              <div>
                <label className="text-xs font-black text-stone-700 block mb-1">
                  Date of Visit *
                </label>
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              {/* Reason for Visit */}
              <div>
                <label className="text-xs font-black text-stone-700 block mb-1">
                  Reason for Visit *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Routine vaccination, Limping leg, Skin checkup"
                  value={visitReason}
                  onChange={(e) => setVisitReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              {/* Veterinarian Name (Optional) */}
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">
                  Veterinarian Name <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Rajesh Sharma"
                  value={visitVet}
                  onChange={(e) => setVisitVet(e.target.value)}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Hospital / Clinic (Optional) */}
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">
                  Hospital / Clinic <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Govt Veterinary Dispensary, Pet Care Polyclinic"
                  value={visitHospital}
                  onChange={(e) => setVisitHospital(e.target.value)}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Short Notes (Optional) */}
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">
                  Short Notes <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Prescribed antibiotic ointment, advised follow-up in 5 days."
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddingVisit(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#154734] hover:bg-[#103828] text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Vet Visit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODALS FOR VIEWING DETAILS */}
      {/* 6a. Veterinary Report Modal */}
      {selectedReportRecord && (
        <VeterinaryReportModal
          record={selectedReportRecord}
          settings={settings}
          onClose={() => setSelectedReportRecord(null)}
        />
      )}

      {/* 6b. Prescription Modal */}
      {selectedPrescription && (
        <PrescriptionModal
          initialPrescription={selectedPrescription}
          defaultAnimalName={profile.name}
          animalProfileId={profile.id}
          settings={settings}
          isOpen={true}
          onClose={() => setSelectedPrescription(null)}
          onSave={() => {
            loadData();
            setSelectedPrescription(null);
          }}
        />
      )}

      {/* 6c. Recovery Follow-Up Checkpoint Modal */}
      {selectedFollowUp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-stone-200 shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Recovery Follow-Up Checkpoint
                  </h3>
                  <span className="text-[11px] text-stone-500 font-medium">
                    {profile.name} • {selectedFollowUp.log.scheduledLabel || "Observation"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFollowUp(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Photo Comparison */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-black text-stone-500 uppercase block mb-1">
                    Baseline Photo
                  </span>
                  <img
                    src={selectedFollowUp.record.imageThumbnail}
                    alt="Baseline"
                    className="w-full h-28 rounded-xl object-cover border border-stone-200"
                    referrerPolicy="no-referrer"
                  />
                </div>
                {selectedFollowUp.log.followUpImage ? (
                  <div>
                    <span className="text-[10px] font-black text-stone-500 uppercase block mb-1">
                      Follow-Up Photo
                    </span>
                    <img
                      src={selectedFollowUp.log.followUpImage}
                      alt="Follow-up"
                      className="w-full h-28 rounded-xl object-cover border border-stone-200"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="h-28 rounded-xl border border-dashed border-stone-200 flex items-center justify-center text-center p-2 text-[10px] text-stone-400">
                    No follow-up photo attached
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="p-3 bg-stone-50 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">Condition Assessment:</span>
                  <span className="text-xs font-black uppercase text-teal-800">
                    {selectedFollowUp.log.statusCondition || "Improving"}
                  </span>
                </div>
                {selectedFollowUp.log.comparisonResult?.summary && (
                  <p className="text-xs text-stone-600">
                    {selectedFollowUp.log.comparisonResult.summary}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setSelectedFollowUp(null)}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
