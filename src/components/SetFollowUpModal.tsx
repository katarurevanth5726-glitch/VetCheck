import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Calendar,
  Clock,
  FileText,
  Trash2,
  AlertCircle,
  PawPrint,
  Check,
  Bell,
  Pill,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { CareReminder, AnimalProfile, UserSettings } from "../types";
import {
  saveReminder,
  deleteReminder,
  getStoredAnimalProfiles,
  getStoredReminders,
  calculateNextMedicineDates,
} from "../utils/storage";
import { syncRemindersToServer } from "../utils/pushManager";
import { useModalHistory } from "../utils/useModalHistory";

interface SetFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (reminder: CareReminder) => void;
  initialReminder?: CareReminder;
  defaultAnimalProfileId?: string;
  defaultAnimalName?: string;
  defaultSpecies?: string;
  defaultReason?: string;
  defaultDate?: string;
  prescriptionId?: string;
  screeningId?: string;
  visitId?: string;
  settings: UserSettings;
  profiles?: AnimalProfile[];
}

const COMMON_REASONS = [
  "Skin recheck",
  "Wound check",
  "Vaccination follow-up",
  "Post-treatment review",
  "Suture / Dressing removal",
  "Medication review",
  "Eye / Ear re-examination",
];

const MEDICINE_PRESETS = [
  { id: "5_min", label: "5 Minutes", value: 5, unit: "minutes" as const },
  { id: "10_min", label: "10 Minutes", value: 10, unit: "minutes" as const },
  { id: "15_min", label: "15 Minutes", value: 15, unit: "minutes" as const },
  { id: "30_min", label: "30 Minutes", value: 30, unit: "minutes" as const },
  { id: "1_hour", label: "1 Hour", value: 1, unit: "hours" as const },
  { id: "2_hours", label: "2 Hours", value: 2, unit: "hours" as const },
  { id: "4_hours", label: "4 Hours", value: 4, unit: "hours" as const },
  { id: "6_hours", label: "6 Hours", value: 6, unit: "hours" as const },
  { id: "8_hours", label: "8 Hours", value: 8, unit: "hours" as const },
  { id: "12_hours", label: "12 Hours", value: 12, unit: "hours" as const },
  { id: "24_hours", label: "24 Hours / Once Daily", value: 24, unit: "hours" as const },
  { id: "custom", label: "Custom Interval", value: 0, unit: "hours" as const },
];

function formatPreviewTime(d: Date): string {
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tmrw = new Date();
  tmrw.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tmrw.toDateString();

  const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (isToday) return `Today, ${timeStr}`;
  if (isTomorrow) return `Tomorrow, ${timeStr}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${timeStr}`;
}

export const SetFollowUpModal: React.FC<SetFollowUpModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialReminder,
  defaultAnimalProfileId,
  defaultAnimalName,
  defaultSpecies,
  defaultReason,
  defaultDate,
  prescriptionId,
  screeningId,
  visitId,
  settings,
  profiles,
}) => {
  useModalHistory({
    isOpen,
    onClose,
    modalKey: "set_follow_up",
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const availableProfiles = profiles || getStoredAnimalProfiles();

  // Helper to format date YYYY-MM-DD
  const formatOffsetDate = (daysAhead: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split("T")[0];
  };

  const isInitialMedicine = initialReminder?.reminderType === "medicine" || initialReminder?.type === "medicine";
  const [reminderMode, setReminderMode] = useState<"follow_up" | "medicine">(
    isInitialMedicine ? "medicine" : "follow_up"
  );

  const defaultNextWeek = defaultDate || initialReminder?.dueDate || formatOffsetDate(7);

  // Common Profile States
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    initialReminder?.animalProfileId || defaultAnimalProfileId || (availableProfiles[0]?.id || "")
  );

  const [animalName, setAnimalName] = useState<string>(() => {
    if (initialReminder?.animalName) return initialReminder.animalName;
    if (defaultAnimalName) return defaultAnimalName;
    const found = availableProfiles.find((p) => p.id === defaultAnimalProfileId);
    return found?.name || availableProfiles[0]?.name || "My Animal";
  });

  const [species, setSpecies] = useState<string>(() => {
    if (initialReminder?.species) return initialReminder.species;
    if (defaultSpecies) return defaultSpecies;
    const found = availableProfiles.find((p) => p.id === defaultAnimalProfileId);
    return found?.species || availableProfiles[0]?.species || "Cattle / Cow";
  });

  // 1. Follow-Up Form States
  const [dueDate, setDueDate] = useState<string>(defaultNextWeek);
  const [dueTime, setDueTime] = useState<string>(initialReminder?.dueTime || "10:00");
  const [notifyAdvance, setNotifyAdvance] = useState<"same_day" | "1_day_before" | "7_days_before">(
    initialReminder?.notifyAdvance || "1_day_before"
  );
  const [reason, setReason] = useState<string>(
    initialReminder?.reason || initialReminder?.title?.replace(/^Follow-Up: /, "") || defaultReason || ""
  );
  const [notes, setNotes] = useState<string>(initialReminder?.notes || "");

  // 2. Medicine Form States
  const [medicineName, setMedicineName] = useState<string>(() => {
    if (initialReminder?.medicineName) return initialReminder.medicineName;
    if (isInitialMedicine && initialReminder?.title) {
      return initialReminder.title.replace(/^Medicine:\s*/i, "");
    }
    return "";
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const nowTimeString = () => {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };

  const [startDate, setStartDate] = useState<string>(
    initialReminder?.startDate || initialReminder?.dueDate || todayStr
  );
  const [startTime, setStartTime] = useState<string>(
    initialReminder?.startTime || initialReminder?.dueTime || nowTimeString()
  );

  // Interval selection
  const detectInitialPreset = () => {
    if (!initialReminder?.intervalValue) return "4_hours";
    const found = MEDICINE_PRESETS.find(
      (p) => p.value === initialReminder.intervalValue && p.unit === initialReminder.intervalUnit
    );
    return found ? found.id : "custom";
  };

  const [intervalPreset, setIntervalPreset] = useState<string>(detectInitialPreset());
  const [customIntervalValue, setCustomIntervalValue] = useState<number>(
    initialReminder?.intervalValue || 45
  );
  const [customIntervalUnit, setCustomIntervalUnit] = useState<"minutes" | "hours" | "days">(
    initialReminder?.intervalUnit || "minutes"
  );

  // Duration selection
  const [durationType, setDurationType] = useState<"indefinite" | "doses" | "days" | "end_date">(
    initialReminder?.durationType || "indefinite"
  );
  const [durationValue, setDurationValue] = useState<number>(
    initialReminder?.durationValue || 5
  );
  const [endDate, setEndDate] = useState<string>(
    initialReminder?.endDate || formatOffsetDate(7)
  );

  const [medicineNotes, setMedicineNotes] = useState<string>(
    (isInitialMedicine ? initialReminder?.notes : "") || ""
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync profile selection changes
  const handleProfileChange = (profileId: string) => {
    setSelectedProfileId(profileId);
    const p = availableProfiles.find((item) => item.id === profileId);
    if (p) {
      setAnimalName(p.name);
      setSpecies(p.species);
    }
  };

  const handleQuickDays = (days: number) => {
    setDueDate(formatOffsetDate(days));
  };

  // Compute effective interval
  const { effectiveValue, effectiveUnit } = useMemo(() => {
    if (intervalPreset === "custom") {
      return {
        effectiveValue: Math.max(1, Number(customIntervalValue) || 1),
        effectiveUnit: customIntervalUnit,
      };
    }
    const preset = MEDICINE_PRESETS.find((p) => p.id === intervalPreset) || MEDICINE_PRESETS[6];
    return {
      effectiveValue: preset.value,
      effectiveUnit: preset.unit,
    };
  }, [intervalPreset, customIntervalValue, customIntervalUnit]);

  // Compute live next 3 upcoming reminder timestamps
  const upcomingRemindersPreview = useMemo(() => {
    if (!startDate || !startTime) return [];
    return calculateNextMedicineDates(startDate, startTime, effectiveValue, effectiveUnit, 3);
  }, [startDate, startTime, effectiveValue, effectiveUnit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const targetTimezone = settings?.userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";

    if (reminderMode === "follow_up") {
      if (!dueDate) {
        setErrorMsg("Please select a follow-up date.");
        return;
      }

      const cleanReason = reason.trim() || "Post-treatment review";
      const reminderData: Omit<CareReminder, "id" | "createdAt"> & { id?: string } = {
        id: initialReminder?.id,
        animalProfileId: selectedProfileId || undefined,
        animalName: animalName.trim() || "My Animal",
        species: species || undefined,
        reminderType: "follow_up",
        title: `Follow-Up: ${cleanReason}`,
        reason: cleanReason,
        dueDate,
        dueTime: dueTime || "10:00",
        notifyAdvance: notifyAdvance || "1_day_before",
        timezone: targetTimezone,
        notes: notes.trim() || undefined,
        prescriptionId: prescriptionId || initialReminder?.prescriptionId,
        screeningId: screeningId || initialReminder?.screeningId,
        visitId: visitId || initialReminder?.visitId,
        completed: initialReminder?.completed || false,
        completedAt: initialReminder?.completedAt,
        status: "active",
        active: true,
      };

      const updatedList = saveReminder(reminderData);
      const allReminders = getStoredReminders();
      syncRemindersToServer(allReminders, settings?.userProfile?.name, targetTimezone, settings?.language);

      const savedItem = updatedList.find((r) => r.id === initialReminder?.id) || {
        ...reminderData,
        id: initialReminder?.id || "rem-" + Date.now(),
        createdAt: Date.now(),
      };

      if (onSaved) {
        onSaved(savedItem as CareReminder);
      }
      onClose();
    } else {
      // Medicine Reminder submission
      if (!medicineName.trim()) {
        setErrorMsg("Please enter a medicine name.");
        return;
      }
      if (!startDate) {
        setErrorMsg("Please select a start date.");
        return;
      }
      if (!startTime) {
        setErrorMsg("Please select a start time.");
        return;
      }

      const cleanMedicine = medicineName.trim();
      const firstUpcoming = upcomingRemindersPreview[0] || new Date();
      const nextDueDate = firstUpcoming.toISOString().split("T")[0];
      const nextDueTime = `${String(firstUpcoming.getHours()).padStart(2, "0")}:${String(firstUpcoming.getMinutes()).padStart(2, "0")}`;

      const medicineReminderData: Omit<CareReminder, "id" | "createdAt"> & { id?: string } = {
        id: initialReminder?.id,
        animalProfileId: selectedProfileId || undefined,
        animalId: selectedProfileId || undefined,
        animalName: animalName.trim() || "My Animal",
        species: species || undefined,
        reminderType: "medicine",
        type: "medicine",
        title: `Medicine: ${cleanMedicine}`,
        medicineName: cleanMedicine,
        startDate,
        startTime,
        startDateTime: `${startDate}T${startTime}:00`,
        dueDate: nextDueDate,
        dueTime: nextDueTime,
        intervalValue: effectiveValue,
        intervalUnit: effectiveUnit,
        durationType,
        durationValue: durationType === "doses" || durationType === "days" ? durationValue : undefined,
        endDate: durationType === "end_date" ? endDate : undefined,
        timezone: targetTimezone,
        notes: medicineNotes.trim() || undefined,
        prescriptionId: prescriptionId || initialReminder?.prescriptionId,
        screeningId: screeningId || initialReminder?.screeningId,
        visitId: visitId || initialReminder?.visitId,
        completed: initialReminder?.completed || false,
        status: initialReminder?.status || "active",
        active: initialReminder?.active !== undefined ? initialReminder.active : true,
        dosesGiven: initialReminder?.dosesGiven || 0,
        nextTriggerTimestamp: firstUpcoming.getTime(),
      };

      const updatedList = saveReminder(medicineReminderData);
      const allReminders = getStoredReminders();
      syncRemindersToServer(allReminders, settings?.userProfile?.name, targetTimezone, settings?.language);

      const savedItem = updatedList.find((r) => r.id === initialReminder?.id) || {
        ...medicineReminderData,
        id: initialReminder?.id || "rem-" + Date.now(),
        createdAt: Date.now(),
      };

      if (onSaved) {
        onSaved(savedItem as CareReminder);
      }
      onClose();
    }
  };

  const handleDelete = () => {
    if (initialReminder?.id) {
      deleteReminder(initialReminder.id);
      const allReminders = getStoredReminders();
      syncRemindersToServer(allReminders, settings?.userProfile?.name, settings?.userTimezone, settings?.language);

      if (onSaved) {
        onSaved({ ...initialReminder, completed: true, completedAt: Date.now() });
      }
      onClose();
    }
  };

  return (
    <div
      id="set-reminder-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in"
    >
      <div className="bg-[#FAF8F5] rounded-3xl border border-[#E8E2D5] shadow-2xl max-w-lg w-full my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#E8E2D5] flex items-center justify-between bg-[#154734] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl text-amber-300">
              {reminderMode === "medicine" ? <Pill className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5">
                <span>
                  {initialReminder
                    ? reminderMode === "medicine"
                      ? "Update Medicine Reminder"
                      : "Update Follow-Up Reminder"
                    : reminderMode === "medicine"
                    ? "Set Medicine Reminder"
                    : "Set Follow-Up Reminder"}
                </span>
              </h2>
              <p className="text-[11px] text-emerald-100 font-medium">
                {reminderMode === "medicine"
                  ? "Repeating schedules for antibiotics, drops, syrups & tablets"
                  : "Keep track of your next veterinary consultation or checkup"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Tab Switcher: Follow-Up vs Medicine */}
        <div className="px-4 sm:px-5 pt-3.5 pb-1 bg-white border-b border-[#E8E2D5]">
          <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider block mb-1.5">
            Reminder Type
          </label>
          <div className="grid grid-cols-2 gap-2 bg-[#FAF8F5] p-1 rounded-2xl border border-[#E8E2D5]">
            <button
              type="button"
              onClick={() => setReminderMode("follow_up")}
              className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                reminderMode === "follow_up"
                  ? "bg-[#154734] text-white shadow-sm"
                  : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Follow-Up</span>
            </button>
            <button
              type="button"
              onClick={() => setReminderMode("medicine")}
              className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                reminderMode === "medicine"
                  ? "bg-[#154734] text-white shadow-sm"
                  : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
              }`}
            >
              <Pill className="w-3.5 h-3.5" />
              <span>Medicine</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-slate-800">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Animal Selection (Shared) */}
          <div className="bg-white p-3.5 rounded-2xl border border-[#E8E2D5] space-y-2 shadow-2xs">
            <label className="text-[11px] font-black uppercase text-[#154734] tracking-wider flex items-center gap-1.5">
              <PawPrint className="w-3.5 h-3.5" />
              <span>Animal *</span>
            </label>

            {availableProfiles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <select
                    value={selectedProfileId}
                    onChange={(e) => handleProfileChange(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-[#154734]"
                  >
                    {availableProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.species})
                      </option>
                    ))}
                    <option value="">Other / Manual Name</option>
                  </select>
                </div>

                {!selectedProfileId && (
                  <div>
                    <input
                      type="text"
                      value={animalName}
                      onChange={(e) => setAnimalName(e.target.value)}
                      placeholder="Enter animal name"
                      className="w-full p-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl font-medium focus:bg-white focus:outline-[#154734]"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={animalName}
                  onChange={(e) => setAnimalName(e.target.value)}
                  placeholder="e.g. Rocky / Gauri"
                  className="w-full p-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl font-medium focus:bg-white focus:outline-[#154734]"
                />
              </div>
            )}
          </div>

          {/* ==================================================== */}
          {/* TAB 1: FOLLOW-UP SPECIFIC FORM */}
          {/* ==================================================== */}
          {reminderMode === "follow_up" && (
            <>
              {/* Follow-Up Date & Notifications */}
              <div className="bg-white p-3.5 rounded-2xl border border-[#E8E2D5] space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase text-[#154734] tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Follow-Up Date *</span>
                  </label>
                  <span className="text-[10px] text-stone-400 font-medium">As advised by vet</span>
                </div>

                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl font-bold text-sm text-slate-900 focus:bg-white focus:outline-[#154734]"
                />

                {/* Quick date selector pills */}
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-stone-400 block mb-1">
                    Quick Shortcuts:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "+3 Days", days: 3 },
                      { label: "+5 Days", days: 5 },
                      { label: "+1 Week", days: 7 },
                      { label: "+2 Weeks", days: 14 },
                      { label: "+1 Month", days: 30 },
                    ].map((item) => (
                      <button
                        key={item.days}
                        type="button"
                        onClick={() => handleQuickDays(item.days)}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-emerald-50 hover:text-[#154734] hover:border-emerald-300 border border-stone-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Background Notification Preferences */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-stone-100">
                  <div>
                    <label className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5 mb-1">
                      <Clock className="w-3.5 h-3.5 text-teal-700" />
                      <span>Alert Time</span>
                    </label>
                    <input
                      type="time"
                      value={dueTime}
                      onChange={(e) => setDueTime(e.target.value)}
                      className="w-full text-xs p-2 rounded-xl border border-stone-200 bg-[#FAF8F5] font-medium focus:bg-white focus:outline-[#154734]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5 mb-1">
                      <Bell className="w-3.5 h-3.5 text-teal-700" />
                      <span>Notify Me</span>
                    </label>
                    <select
                      value={notifyAdvance}
                      onChange={(e) => setNotifyAdvance(e.target.value as any)}
                      className="w-full text-xs p-2 rounded-xl border border-stone-200 bg-[#FAF8F5] font-medium focus:bg-white focus:outline-[#154734]"
                    >
                      <option value="same_day">On the day (Morning of)</option>
                      <option value="1_day_before">1 day before (Advance alert)</option>
                      <option value="7_days_before">7 days before (1 week advance)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="bg-white p-3.5 rounded-2xl border border-[#E8E2D5] space-y-2 shadow-2xs">
                <label className="text-[11px] font-black uppercase text-[#154734] tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Reason (Optional)</span>
                </label>

                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Skin recheck / Wound check / Vaccine"
                  className="w-full p-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl font-medium text-xs focus:bg-white focus:outline-[#154734]"
                />

                {/* Reason Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {COMMON_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer ${
                        reason === r
                          ? "bg-[#154734] text-white border-[#154734]"
                          : "bg-[#FAF8F5] text-stone-600 border-[#E8E2D5] hover:bg-stone-100"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="bg-white p-3.5 rounded-2xl border border-[#E8E2D5] space-y-2 shadow-2xs">
                <label className="text-[11px] font-bold text-stone-600 block">
                  Additional Instructions / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Bring previous medicine strip. Fast animal for 4 hours if blood test is planned."
                  className="w-full p-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl font-medium text-xs focus:bg-white focus:outline-[#154734]"
                />
              </div>
            </>
          )}

          {/* ==================================================== */}
          {/* TAB 2: MEDICINE SPECIFIC FORM */}
          {/* ==================================================== */}
          {reminderMode === "medicine" && (
            <>
              {/* Medicine Name */}
              <div className="bg-white p-3.5 rounded-2xl border border-[#E8E2D5] space-y-2 shadow-2xs">
                <label className="text-[11px] font-black uppercase text-[#154734] tracking-wider flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-teal-700" />
                  <span>Medicine Name *</span>
                </label>

                <input
                  type="text"
                  required
                  value={medicineName}
                  onChange={(e) => setMedicineName(e.target.value)}
                  placeholder="e.g. Antibiotic / Eye drops / Tablet"
                  className="w-full p-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl font-bold text-sm text-slate-900 focus:bg-white focus:outline-[#154734]"
                />

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    "Antibiotic Syrup",
                    "Eye Drops",
                    "Ear Drops",
                    "Dewormer Tablet",
                    "Pain Relief",
                    "Skin Ointment",
                    "Vitamins / Tonic",
                  ].map((med) => (
                    <button
                      key={med}
                      type="button"
                      onClick={() => setMedicineName(med)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer ${
                        medicineName === med
                          ? "bg-[#154734] text-white border-[#154734]"
                          : "bg-[#FAF8F5] text-stone-600 border-[#E8E2D5] hover:bg-stone-100"
                      }`}
                    >
                      + {med}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Date & Time */}
              <div className="bg-white p-3.5 rounded-2xl border border-[#E8E2D5] space-y-2.5 shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-teal-700" />
                      <span>Start Date *</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-300 bg-[#FAF8F5] font-bold text-slate-900 focus:bg-white focus:outline-[#154734]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5 mb-1">
                      <Clock className="w-3.5 h-3.5 text-teal-700" />
                      <span>Start Time *</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-300 bg-[#FAF8F5] font-bold text-slate-900 focus:bg-white focus:outline-[#154734]"
                    />
                  </div>
                </div>
              </div>

              {/* Repeat Every Interval */}
              <div className="bg-white p-3.5 rounded-2xl border border-[#E8E2D5] space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase text-[#154734] tracking-wider flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-teal-700" />
                    <span>Repeat Every *</span>
                  </label>
                  <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-full">
                    {intervalPreset === "custom"
                      ? `Every ${customIntervalValue} ${customIntervalUnit}`
                      : MEDICINE_PRESETS.find((p) => p.id === intervalPreset)?.label}
                  </span>
                </div>

                <select
                  value={intervalPreset}
                  onChange={(e) => setIntervalPreset(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:outline-[#154734]"
                >
                  {MEDICINE_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>

                {/* Custom Interval inputs if selected */}
                {intervalPreset === "custom" && (
                  <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in">
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 block mb-1">
                        Interval Value:
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={customIntervalValue}
                        onChange={(e) => setCustomIntervalValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        placeholder="e.g. 5, 45, 3"
                        className="w-full p-2 bg-[#FAF8F5] border border-stone-300 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:outline-[#154734]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-stone-500 block mb-1">
                        Time Unit:
                      </label>
                      <select
                        value={customIntervalUnit}
                        onChange={(e) => setCustomIntervalUnit(e.target.value as any)}
                        className="w-full p-2 bg-[#FAF8F5] border border-stone-300 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:outline-[#154734]"
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Duration */}
              <div className="bg-white p-3.5 rounded-2xl border border-[#E8E2D5] space-y-2.5 shadow-2xs">
                <label className="text-[11px] font-black uppercase text-[#154734] tracking-wider block">
                  Duration
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: "indefinite", label: "Until stopped" },
                    { id: "doses", label: "Number of doses" },
                    { id: "days", label: "Number of days" },
                    { id: "end_date", label: "End date" },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDurationType(d.id as any)}
                      className={`p-2 rounded-xl text-[10px] font-bold border text-center transition-all cursor-pointer ${
                        durationType === d.id
                          ? "bg-[#154734] text-white border-[#154734]"
                          : "bg-[#FAF8F5] text-stone-600 border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                {/* Conditional Duration Inputs */}
                {durationType === "doses" && (
                  <div className="pt-1 animate-in fade-in">
                    <label className="text-[10px] font-bold text-stone-500 block mb-1">
                      Total Doses to Administer:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={durationValue}
                      onChange={(e) => setDurationValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      placeholder="e.g. 10 doses"
                      className="w-full p-2 bg-[#FAF8F5] border border-stone-300 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:outline-[#154734]"
                    />
                  </div>
                )}

                {durationType === "days" && (
                  <div className="pt-1 animate-in fade-in">
                    <label className="text-[10px] font-bold text-stone-500 block mb-1">
                      Number of Treatment Days:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={durationValue}
                      onChange={(e) => setDurationValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      placeholder="e.g. 5 days"
                      className="w-full p-2 bg-[#FAF8F5] border border-stone-300 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:outline-[#154734]"
                    />
                  </div>
                )}

                {durationType === "end_date" && (
                  <div className="pt-1 animate-in fade-in">
                    <label className="text-[10px] font-bold text-stone-500 block mb-1">
                      End Date:
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full p-2 bg-[#FAF8F5] border border-stone-300 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:outline-[#154734]"
                    />
                  </div>
                )}
              </div>

              {/* Instructions & Safety Note */}
              <div className="bg-white p-3.5 rounded-2xl border border-[#E8E2D5] space-y-2 shadow-2xs">
                <label className="text-[11px] font-bold text-stone-600 block">
                  Medicine Instructions / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={medicineNotes}
                  onChange={(e) => setMedicineNotes(e.target.value)}
                  placeholder="e.g. Give after food / Apply 2 drops as prescribed by vet"
                  className="w-full p-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl font-medium text-xs focus:bg-white focus:outline-[#154734]"
                />

                {/* Safety note banner */}
                <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center gap-2 text-[11px] font-medium text-emerald-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Follow the medicine schedule prescribed by your veterinarian.</span>
                </div>
              </div>

              {/* Next Reminders Preview (Live Calculation) */}
              <div className="bg-gradient-to-br from-teal-50/80 to-[#FAF8F5] p-3.5 rounded-2xl border border-teal-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-teal-950 tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-teal-700" />
                    <span>Next Reminders Preview</span>
                  </span>
                  <span className="text-[10px] font-bold text-teal-700 bg-white px-2 py-0.5 rounded-full border border-teal-200">
                    Live Schedule
                  </span>
                </div>

                <div className="space-y-1.5 pt-0.5">
                  {upcomingRemindersPreview.length > 0 ? (
                    upcomingRemindersPreview.map((dt, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-1.5 px-2.5 bg-white rounded-xl border border-teal-100 text-xs font-bold text-slate-800 shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-[10px] font-black">
                            {idx + 1}
                          </span>
                          <span>{formatPreviewTime(dt)}</span>
                        </div>
                        <span className="text-[10px] text-stone-400 font-medium">
                          {idx === 0 ? "First alert" : `+${idx * effectiveValue} ${effectiveUnit}`}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-stone-400 italic">Select a valid start date and time.</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-200">
            {initialReminder ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                title="Remove Reminder"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-5 py-2 bg-[#154734] hover:bg-[#103828] text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition-transform active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>{reminderMode === "medicine" ? "Save Medicine Schedule" : "Save Reminder"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
