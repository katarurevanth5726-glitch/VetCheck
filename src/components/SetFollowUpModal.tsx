import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Clock,
  FileText,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Sparkles,
  Stethoscope,
  PawPrint,
  Check,
  Bell,
} from "lucide-react";
import { CareReminder, AnimalProfile, UserSettings } from "../types";
import { saveReminder, deleteReminder, getStoredAnimalProfiles, getStoredReminders } from "../utils/storage";
import { syncRemindersToServer } from "../utils/pushManager";

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
  if (!isOpen) return null;

  const availableProfiles = profiles || getStoredAnimalProfiles();

  // Helper to format date YYYY-MM-DD
  const formatOffsetDate = (daysAhead: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split("T")[0];
  };

  const defaultNextWeek = defaultDate || initialReminder?.dueDate || formatOffsetDate(7);

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

  const [dueDate, setDueDate] = useState<string>(defaultNextWeek);
  const [dueTime, setDueTime] = useState<string>(initialReminder?.dueTime || "10:00");
  const [notifyAdvance, setNotifyAdvance] = useState<"same_day" | "1_day_before" | "7_days_before">(
    initialReminder?.notifyAdvance || "1_day_before"
  );
  const [reason, setReason] = useState<string>(
    initialReminder?.reason || initialReminder?.title?.replace(/^Follow-Up: /, "") || defaultReason || ""
  );
  const [notes, setNotes] = useState<string>(initialReminder?.notes || "");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
      timezone: settings?.userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      notes: notes.trim() || undefined,
      prescriptionId: prescriptionId || initialReminder?.prescriptionId,
      screeningId: screeningId || initialReminder?.screeningId,
      completed: initialReminder?.completed || false,
      completedAt: initialReminder?.completedAt,
    };

    const updatedList = saveReminder(reminderData);
    const allReminders = getStoredReminders();
    syncRemindersToServer(allReminders, settings?.userProfile?.name, settings?.userTimezone, settings?.language);

    const savedItem = updatedList.find(
      (r) =>
        r.id === initialReminder?.id ||
        (r.dueDate === dueDate && r.animalName === reminderData.animalName && r.reminderType === "follow_up")
    ) || {
      ...reminderData,
      id: initialReminder?.id || "rem-" + Date.now(),
      createdAt: Date.now(),
    };

    if (onSaved) {
      onSaved(savedItem as CareReminder);
    }
    onClose();
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
      id="set-follow-up-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in"
    >
      <div className="bg-[#FAF8F5] rounded-3xl border border-[#E8E2D5] shadow-2xl max-w-lg w-full my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E8E2D5] flex items-center justify-between bg-[#154734] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl text-amber-300">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5">
                <span>{initialReminder ? "Update Follow-Up Reminder" : "Set Follow-Up Reminder"}</span>
              </h2>
              <p className="text-[11px] text-emerald-100 font-medium">
                Keep track of your next veterinary consultation or checkup
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-slate-800">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Animal Selection */}
          <div className="bg-white p-3.5 rounded-2xl border border-[#E8E2D5] space-y-2 shadow-2xs">
            <label className="text-[11px] font-black uppercase text-[#154734] tracking-wider flex items-center gap-1.5">
              <PawPrint className="w-3.5 h-3.5" />
              <span>Animal</span>
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

          {/* 2. Follow-Up Date */}
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

          {/* 3. Reason (Optional) */}
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

          {/* 4. Notes (Optional) */}
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

          {/* Actions */}
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
                <span>Save Reminder</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
