import React, { useState, useEffect } from "react";
import {
  Syringe,
  Pill,
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  Edit3,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Download,
  Share2,
  Check,
  HelpCircle,
  FileText,
  AlertTriangle,
  Bell,
  Play,
  Pause,
} from "lucide-react";
import { AnimalProfile, CareReminder, UserSettings } from "../types";
import {
  getRemindersForAnimal,
  getStoredReminders,
  saveReminder,
  deleteReminder,
  toggleReminderCompleted,
  pauseMedicineReminder,
  resumeMedicineReminder,
  formatIntervalDisplay,
  getSpeciesCareTemplates,
  CareTemplateItem,
} from "../utils/storage";
import { syncRemindersToServer } from "../utils/pushManager";
import { NotificationPermissionBanner } from "./NotificationPermissionBanner";

interface VaccinationDewormingSectionProps {
  animalProfile: AnimalProfile;
  settings: UserSettings;
  onRemindersChanged?: () => void;
}

export const VaccinationDewormingSection: React.FC<VaccinationDewormingSectionProps> = ({
  animalProfile,
  settings,
  onRemindersChanged,
}) => {
  const [reminders, setReminders] = useState<CareReminder[]>([]);
  const [filterType, setFilterType] = useState<"all" | "active" | "medicine" | "vaccination" | "deworming" | "completed">("active");
  const [isAdding, setIsAdding] = useState(false);
  const [editingReminder, setEditingReminder] = useState<CareReminder | null>(null);

  // Form states
  const [reminderType, setReminderType] = useState<"vaccination" | "deworming" | "checkup" | "other">("vaccination");
  const [title, setTitle] = useState("");
  const [administeredDate, setAdministeredDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("09:00");
  const [notifyAdvance, setNotifyAdvance] = useState<"same_day" | "1_day_before" | "7_days_before">("same_day");
  const [recurrence, setRecurrence] = useState<"none" | "3_months" | "6_months" | "1_year">("1_year");
  const [veterinarian, setVeterinarian] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = () => {
    const list = getRemindersForAnimal(animalProfile.id);
    setReminders(list);
  };

  useEffect(() => {
    loadData();
  }, [animalProfile.id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const templates = getSpeciesCareTemplates(animalProfile.species);

  const handleApplyTemplate = (tmpl: CareTemplateItem) => {
    setReminderType(tmpl.type);
    setTitle(tmpl.title);
    setRecurrence(tmpl.recurrence);
    setNotes(tmpl.description);

    // Calculate default due date
    const target = new Date();
    if (tmpl.recurrence === "3_months") target.setMonth(target.getMonth() + 3);
    else if (tmpl.recurrence === "6_months") target.setMonth(target.getMonth() + 6);
    else if (tmpl.recurrence === "1_year") target.setFullYear(target.getFullYear() + 1);
    else target.setDate(target.getDate() + 14);

    setDueDate(target.toISOString().split("T")[0]);
    setDueTime("09:00");
    setNotifyAdvance("same_day");
    setIsAdding(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    const payload: Omit<CareReminder, "id" | "createdAt"> & { id?: string } = {
      id: editingReminder?.id,
      animalProfileId: animalProfile.id,
      animalName: animalProfile.name,
      species: animalProfile.species,
      reminderType,
      title: title.trim(),
      administeredDate: administeredDate.trim() || undefined,
      dueDate,
      dueTime: dueTime || "09:00",
      notifyAdvance: notifyAdvance || "same_day",
      timezone: settings?.userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      recurrence,
      veterinarian: veterinarian.trim() || undefined,
      batchNumber: batchNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      completed: editingReminder ? editingReminder.completed : false,
    };

    saveReminder(payload);
    const allReminders = getStoredReminders();
    syncRemindersToServer(allReminders, settings?.userProfile?.name, settings?.userTimezone, settings?.language);

    loadData();
    if (onRemindersChanged) onRemindersChanged();

    showToast(editingReminder ? "Reminder updated!" : "Vaccination/Deworming scheduled & synced for background alerts!");
    setIsAdding(false);
    setEditingReminder(null);
    resetForm();
  };

  const resetForm = () => {
    setTitle("");
    setAdministeredDate("");
    setDueDate("");
    setDueTime("09:00");
    setNotifyAdvance("same_day");
    setRecurrence("1_year");
    setVeterinarian("");
    setBatchNumber("");
    setNotes("");
    setReminderType("vaccination");
  };

  const handleStartEdit = (rem: CareReminder) => {
    setEditingReminder(rem);
    setTitle(rem.title);
    setReminderType(rem.reminderType === "deworming" ? "deworming" : "vaccination");
    setAdministeredDate(rem.administeredDate || "");
    setDueDate(rem.dueDate);
    setDueTime(rem.dueTime || "09:00");
    setNotifyAdvance(rem.notifyAdvance || "same_day");
    setRecurrence(rem.recurrence || "none");
    setVeterinarian(rem.veterinarian || "");
    setBatchNumber(rem.batchNumber || "");
    setNotes(rem.notes || "");
    setIsAdding(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Remove care record "${name}"?`)) {
      deleteReminder(id);
      const allReminders = getStoredReminders();
      syncRemindersToServer(allReminders, settings?.userProfile?.name, settings?.userTimezone, settings?.language);

      loadData();
      if (onRemindersChanged) onRemindersChanged();
      showToast("Record removed.");
    }
  };

  const handleToggleComplete = (rem: CareReminder) => {
    const isNowCompleting = !rem.completed;
    const shouldScheduleNext = isNowCompleting && rem.recurrence && rem.recurrence !== "none";
    const result = toggleReminderCompleted(rem.id, shouldScheduleNext);
    const allReminders = getStoredReminders();
    syncRemindersToServer(allReminders, settings?.userProfile?.name, settings?.userTimezone, settings?.language);

    setReminders(getRemindersForAnimal(animalProfile.id));
    if (onRemindersChanged) onRemindersChanged();

    if (result.nextReminder) {
      showToast(`Marked completed! Next booster auto-scheduled for ${result.nextReminder.dueDate}.`);
    } else {
      showToast(isNowCompleting ? "Marked as completed!" : "Reopened reminder.");
    }
  };

  const handlePauseMedicine = (id: string) => {
    pauseMedicineReminder(id);
    const allReminders = getStoredReminders();
    syncRemindersToServer(allReminders, settings?.userProfile?.name, settings?.userTimezone, settings?.language);
    loadData();
    if (onRemindersChanged) onRemindersChanged();
    showToast("Medicine reminder paused");
  };

  const handleResumeMedicine = (id: string) => {
    resumeMedicineReminder(id);
    const allReminders = getStoredReminders();
    syncRemindersToServer(allReminders, settings?.userProfile?.name, settings?.userTimezone, settings?.language);
    loadData();
    if (onRemindersChanged) onRemindersChanged();
    showToast("Medicine reminder resumed");
  };

  const todayStr = new Date().toISOString().split("T")[0];

  const getStatusBadge = (rem: CareReminder) => {
    if (rem.completed || rem.status === "completed") {
      return (
        <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Completed</span>
        </span>
      );
    }
    if (rem.status === "paused" || rem.active === false) {
      return (
        <span className="text-[10px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Pause className="w-3 h-3 text-amber-600" />
          <span>Paused</span>
        </span>
      );
    }
    if (rem.reminderType === "medicine") {
      const triggerTs = rem.nextTriggerTimestamp || (rem.dueDate ? new Date(`${rem.dueDate}T${rem.dueTime || "09:00"}:00`).getTime() : 0);
      const now = Date.now();
      const diffMin = Math.round((triggerTs - now) / 60000);
      const label = diffMin <= 0
        ? "Due now"
        : diffMin < 60
        ? `In ${diffMin}m`
        : `Next: ${new Date(triggerTs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      return (
        <span className="text-[10px] font-black text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Clock className="w-3 h-3 text-teal-600" />
          <span>{label}</span>
        </span>
      );
    }
    if (rem.dueDate < todayStr) {
      const daysOverdue = Math.floor(
        (new Date(todayStr).getTime() - new Date(rem.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      return (
        <span className="text-[10px] font-black text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
          <AlertCircle className="w-3 h-3 text-rose-600" />
          <span>Overdue ({daysOverdue}d)</span>
        </span>
      );
    }
    if (rem.dueDate === todayStr) {
      return (
        <span className="text-[10px] font-black text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Clock className="w-3 h-3 text-amber-700" />
          <span>Due Today!</span>
        </span>
      );
    }
    const daysLeft = Math.ceil(
      (new Date(rem.dueDate).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
    );
    return (
      <span className="text-[10px] font-bold text-teal-900 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full flex items-center gap-1">
        <Calendar className="w-3 h-3 text-teal-700" />
        <span>In {daysLeft} days</span>
      </span>
    );
  };

  const filteredList = reminders.filter((rem) => {
    if (filterType === "active") return !rem.completed && rem.status !== "completed";
    if (filterType === "completed") return rem.completed || rem.status === "completed";
    if (filterType === "medicine") return rem.reminderType === "medicine";
    if (filterType === "vaccination") return rem.reminderType === "vaccination";
    if (filterType === "deworming") return rem.reminderType === "deworming";
    return true;
  });

  const activeReminders = reminders.filter((r) => !r.completed);
  const overdueCount = activeReminders.filter((r) => r.dueDate < todayStr).length;
  const upcomingCount = activeReminders.filter((r) => r.dueDate >= todayStr).length;

  return (
    <div className="space-y-4">
      {/* Contextual Permission Banner */}
      <NotificationPermissionBanner settings={settings} />

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#154734] text-white px-4 py-2 rounded-full shadow-lg text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-3.5 h-3.5 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Upcoming Care Summary */}
      <div className="bg-[#FAF8F5] border border-[#E8E2D5] rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
              <Syringe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#154734]">
                Vaccination & Deworming Tracker
              </h3>
              <p className="text-xs text-stone-500 font-medium">
                Preventive health schedule & upcoming booster dates
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (isAdding) {
                setIsAdding(false);
                setEditingReminder(null);
              } else {
                resetForm();
                setIsAdding(true);
              }
            }}
            className="px-3 py-1.5 bg-[#154734] hover:bg-[#103828] text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-transform active:scale-95 shadow-2xs"
          >
            {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{isAdding ? "Cancel" : "Add Care"}</span>
          </button>
        </div>

        {/* Quick Stats Badges */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="p-2.5 bg-white rounded-2xl border border-[#E8E2D5] text-center">
            <span className="text-[10px] font-bold text-stone-400 uppercase block">Active Reminders</span>
            <span className="text-sm font-black text-slate-900">{activeReminders.length}</span>
          </div>
          <div className={`p-2.5 rounded-2xl border text-center ${overdueCount > 0 ? "bg-rose-50 border-rose-200" : "bg-white border-[#E8E2D5]"}`}>
            <span className="text-[10px] font-bold uppercase block text-stone-400">Overdue</span>
            <span className={`text-sm font-black ${overdueCount > 0 ? "text-rose-700" : "text-slate-900"}`}>
              {overdueCount}
            </span>
          </div>
          <div className="p-2.5 bg-white rounded-2xl border border-[#E8E2D5] text-center">
            <span className="text-[10px] font-bold text-stone-400 uppercase block">Completed</span>
            <span className="text-sm font-black text-emerald-700">
              {reminders.filter((r) => r.completed).length}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Add Species Templates */}
      {!isAdding && templates.length > 0 && (
        <div className="p-3.5 bg-white border border-[#E8E2D5] rounded-3xl space-y-2">
          <span className="text-xs font-black text-[#154734] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Recommended for {animalProfile.species}:</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {templates.map((tmpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyTemplate(tmpl)}
                className="px-2.5 py-1.5 bg-[#FAF8F5] hover:bg-[#F2EFE9] border border-[#E8E2D5] hover:border-teal-400 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-1.5 transition-all cursor-pointer text-left"
              >
                {tmpl.type === "deworming" ? (
                  <Pill className="w-3 h-3 text-amber-600 shrink-0" />
                ) : (
                  <Syringe className="w-3 h-3 text-teal-700 shrink-0" />
                )}
                <span>+ {tmpl.title.split("(")[0].trim()}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Form Modal / Box */}
      {isAdding && (
        <form
          onSubmit={handleSaveForm}
          className="bg-white border-2 border-teal-600 rounded-3xl p-4 sm:p-5 shadow-md space-y-3 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <span className="text-xs font-black text-slate-900">
              {editingReminder ? "Edit Preventive Care Record" : "Schedule Vaccination / Deworming"}
            </span>
            <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
              {animalProfile.name}
            </span>
          </div>

          {/* Type Selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setReminderType("vaccination")}
              className={`py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${
                reminderType === "vaccination"
                  ? "bg-[#154734] text-white border-[#154734]"
                  : "bg-stone-50 border-stone-200 text-stone-700"
              }`}
            >
              <Syringe className="w-3.5 h-3.5" />
              <span>💉 Vaccination</span>
            </button>
            <button
              type="button"
              onClick={() => setReminderType("deworming")}
              className={`py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${
                reminderType === "deworming"
                  ? "bg-[#154734] text-white border-[#154734]"
                  : "bg-stone-50 border-stone-200 text-stone-700"
              }`}
            >
              <Pill className="w-3.5 h-3.5" />
              <span>💊 Deworming</span>
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="text-[11px] font-bold text-stone-700 block mb-1">
              {reminderType === "deworming" ? "Deworming Treatment / Tablet Name *" : "Vaccine / Disease Name *"}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                reminderType === "deworming"
                  ? "e.g. Albendazole / Broad Spectrum Dewormer"
                  : "e.g. Anti-Rabies Vaccine / FMD Booster"
              }
              className="w-full text-xs p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-hidden focus:border-[#154734] font-medium"
            />
          </div>

          {/* Dates & Recurrence */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-stone-700 block mb-1">
                Last Administered (Optional)
              </label>
              <input
                type="date"
                value={administeredDate}
                onChange={(e) => setAdministeredDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white font-medium"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-700 block mb-1">
                Next Due Date *
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white font-medium font-bold text-teal-900"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-700 block mb-1">
                Repeat Cycle
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as "none" | "3_months" | "6_months" | "1_year")}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white font-medium"
              >
                <option value="none">One-time only</option>
                <option value="3_months">Every 3 Months (Quarterly)</option>
                <option value="6_months">Every 6 Months (Bi-Annual)</option>
                <option value="1_year">Every 1 Year (Annual)</option>
              </select>
            </div>
          </div>

          {/* Background Notification Preferences */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-teal-50/50 border border-teal-200/70 rounded-2xl">
            <div>
              <label className="text-[11px] font-bold text-teal-950 flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-teal-700" />
                <span>Reminder Alert Time</span>
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-teal-200 bg-white font-medium focus:outline-hidden focus:border-teal-600"
              />
              <span className="text-[10px] text-teal-700 block mt-0.5">Local time when notification fires</span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-teal-950 flex items-center gap-1.5 mb-1">
                <Bell className="w-3.5 h-3.5 text-teal-700" />
                <span>Advance Notice</span>
              </label>
              <select
                value={notifyAdvance}
                onChange={(e) => setNotifyAdvance(e.target.value as "same_day" | "1_day_before" | "7_days_before")}
                className="w-full text-xs p-2 rounded-xl border border-teal-200 bg-white font-medium focus:outline-hidden focus:border-teal-600"
              >
                <option value="same_day">On due date (Morning of)</option>
                <option value="1_day_before">1 day before (Advance warning)</option>
                <option value="7_days_before">7 days before (1 week advance)</option>
              </select>
              <span className="text-[10px] text-teal-700 block mt-0.5">Notification trigger timing</span>
            </div>
          </div>

          {/* Optional Vet & Batch info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-stone-700 block mb-1">
                Veterinarian / Hospital (Optional)
              </label>
              <input
                type="text"
                value={veterinarian}
                onChange={(e) => setVeterinarian(e.target.value)}
                placeholder="e.g. Dr. Sharma / Govt Veterinary Dispensary"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white font-medium"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-700 block mb-1">
                Batch / Vaccine Serial No. (Optional)
              </label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="e.g. BATCH-2026-X8"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white font-medium"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-bold text-stone-700 block mb-1">
              Instructions / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Administer with food. Monitor for 24 hours for mild local swelling."
              className="w-full text-xs p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white font-medium"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingReminder(null);
              }}
              className="px-3.5 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#154734] hover:bg-[#103828] text-white font-black text-xs rounded-xl shadow-xs cursor-pointer"
            >
              {editingReminder ? "Update Record" : "Save Care Schedule"}
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {(
          [
            { id: "active", label: `Upcoming / Due (${activeReminders.length})` },
            { id: "medicine", label: `Medicine (${reminders.filter((r) => r.reminderType === "medicine" && !r.completed && r.status !== "completed").length})` },
            { id: "completed", label: `Completed (${reminders.filter((r) => r.completed || r.status === "completed").length})` },
            { id: "vaccination", label: "Vaccines" },
            { id: "deworming", label: "Deworming" },
            { id: "all", label: `All (${reminders.length})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterType(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              filterType === tab.id
                ? "bg-[#154734] text-white shadow-2xs"
                : "bg-white border border-[#E8E2D5] text-stone-600 hover:bg-stone-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reminders List */}
      {filteredList.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-[#E8E2D5] space-y-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 text-stone-400 flex items-center justify-center">
            <Syringe className="w-6 h-6" />
          </div>
          <h4 className="text-xs font-black text-slate-800">
            {filterType === "completed" ? "No Completed Records Yet" : "No Care Schedules in this Category"}
          </h4>
          <p className="text-[11px] text-stone-500 max-w-xs mx-auto">
            Add vaccine doses, deworming cycles, or medicine reminders to get automated tracking.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredList.map((rem) => {
            const isMedicine = rem.reminderType === "medicine";
            const isDeworming = rem.reminderType === "deworming";
            const isPaused = rem.status === "paused" || rem.active === false;
            const isCompleted = rem.completed || rem.status === "completed";

            return (
              <div
                key={rem.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isCompleted
                    ? "bg-[#FAF8F5] border-stone-200 opacity-80"
                    : isPaused
                    ? "bg-amber-50/40 border-amber-200"
                    : !isMedicine && rem.dueDate < todayStr
                    ? "bg-rose-50/70 border-rose-300"
                    : "bg-white border-[#E8E2D5] hover:border-teal-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(rem)}
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors cursor-pointer ${
                        isCompleted
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-stone-300 bg-white hover:border-teal-500"
                      }`}
                      title={isCompleted ? "Mark incomplete" : "Mark as completed"}
                    >
                      {isCompleted && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-900">
                          {isMedicine ? "💊" : isDeworming ? "💊" : "💉"} {rem.title}
                        </span>
                        {isMedicine && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                            Repeat: {formatIntervalDisplay(rem.intervalValue, rem.intervalUnit)}
                          </span>
                        )}
                        {getStatusBadge(rem)}
                      </div>

                      <div className="text-[11px] text-stone-500 font-medium flex items-center gap-3 mt-1 flex-wrap">
                        {isMedicine ? (
                          <>
                            {rem.nextTriggerTimestamp && (
                              <span>
                                <strong>Next Dose:</strong>{" "}
                                {new Date(rem.nextTriggerTimestamp).toLocaleString("en-IN", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })}
                              </span>
                            )}
                            {rem.durationType === "doses" && rem.durationValue && (
                              <span className="text-teal-800 font-bold bg-teal-50 px-1.5 py-0.5 rounded">
                                Doses: {rem.dosesGiven || 0} / {rem.durationValue}
                              </span>
                            )}
                            {rem.durationType === "days" && rem.durationValue && (
                              <span>Duration: {rem.durationValue} days</span>
                            )}
                            {rem.durationType === "until_date" && rem.endDate && (
                              <span>Until: {new Date(rem.endDate).toLocaleDateString("en-IN")}</span>
                            )}
                          </>
                        ) : (
                          <>
                            <span>
                              <strong>Next Due:</strong> {new Date(rem.dueDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                            </span>
                            {rem.administeredDate && (
                              <span>
                                <strong>Given:</strong> {new Date(rem.administeredDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                              </span>
                            )}
                            {rem.recurrence && rem.recurrence !== "none" && (
                              <span className="text-teal-800 font-bold bg-teal-50 px-1.5 py-0.5 rounded">
                                Cycle: {rem.recurrence.replace("_", " ")}
                              </span>
                            )}
                            {rem.veterinarian && <span>Vet: {rem.veterinarian}</span>}
                            {rem.batchNumber && <span>Batch: {rem.batchNumber}</span>}
                          </>
                        )}
                      </div>

                      {rem.notes && (
                        <p className="text-[11px] text-stone-600 mt-1 bg-[#FAF8F5] p-2 rounded-xl border border-stone-100">
                          {rem.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isMedicine && !isCompleted && (
                      <button
                        type="button"
                        onClick={() => (isPaused ? handleResumeMedicine(rem.id) : handlePauseMedicine(rem.id))}
                        className={`p-1.5 rounded-lg cursor-pointer ${
                          isPaused
                            ? "text-teal-700 hover:bg-teal-50"
                            : "text-amber-700 hover:bg-amber-50"
                        }`}
                        title={isPaused ? "Resume Reminder" : "Pause Reminder"}
                      >
                        {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    {!isMedicine && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(rem)}
                        className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg cursor-pointer"
                        title="Edit Record"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(rem.id, rem.title)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="Delete Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
