import React, { useState, useEffect } from "react";
import {
  Camera,
  Upload,
  Sun,
  Focus,
  Smile,
  ShieldCheck,
  PhoneCall,
  History,
  Scissors,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  BookOpen,
  Bell,
  Syringe,
  Pill,
  CheckCircle2,
  Clock,
  MapPin,
  WifiOff,
  Globe,
  PawPrint,
  Calendar,
  AlertTriangle,
  Stethoscope,
  CalendarCheck,
  CalendarPlus,
  Edit2,
} from "lucide-react";
import { SUPPORTED_LANGUAGES, getTranslation } from "../data/translations";
import { NavTab, ScreeningRecord, UserSettings, CareReminder, AnimalProfile } from "../types";
import {
  getUpcomingAndOverdueReminders,
  getStoredAnimalProfiles,
  toggleReminderCompleted,
} from "../utils/storage";
import { SetFollowUpModal } from "./SetFollowUpModal";

interface HomeScreenProps {
  settings: UserSettings;
  recentRecords: ScreeningRecord[];
  isOnline: boolean;
  onStartScan: (mode: "camera" | "gallery") => void;
  onNavigate: (tab: NavTab) => void;
  onSelectRecord: (record: ScreeningRecord) => void;
  onOpenNearbyVet: () => void;
  onOpenNearbyPetSalons?: () => void;
  onOpenLanguageModal?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  settings,
  recentRecords,
  isOnline,
  onStartScan,
  onNavigate,
  onSelectRecord,
  onOpenNearbyVet,
  onOpenNearbyPetSalons,
  onOpenLanguageModal,
}) => {
  const lang = settings.language;
  const latestScan = recentRecords.length > 0 ? recentRecords[0] : null;
  const currentLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === settings.language) || SUPPORTED_LANGUAGES[0];

  const profile = settings.userProfile;
  const userGreeting = profile?.name
    ? `Welcome back, ${profile.name}`
    : "Welcome to VetCheck";

  // Care Reminders & Profiles
  const [reminders, setReminders] = useState<CareReminder[]>([]);
  const [profiles, setProfiles] = useState<AnimalProfile[]>([]);
  const [editingReminder, setEditingReminder] = useState<CareReminder | null>(null);

  const refreshReminders = () => {
    try {
      const activeReminders = getUpcomingAndOverdueReminders();
      setReminders(activeReminders);
      setProfiles(getStoredAnimalProfiles());
    } catch (e) {
      console.warn("Could not load care reminders for home:", e);
    }
  };

  useEffect(() => {
    refreshReminders();
  }, []);

  const handleCompleteReminder = (reminder: CareReminder) => {
    toggleReminderCompleted(reminder.id, reminder.recurrence && reminder.recurrence !== "none");
    refreshReminders();
  };

  return (
    <div id="home-screen-container" className="space-y-5 pb-16 max-w-2xl mx-auto">
      {/* Top Bar: Online status, Language */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <div
            id="network-status-badge"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
              isOnline
                ? "bg-[#E7EEE9] border border-[#D2DFD7] text-[#25473B]"
                : "bg-[#FAF9F5] border border-[#E5E3DC] text-[#626963]"
            }`}
          >
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[#315C4C]" />
                <span>Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-[#858B86]" />
                <span>Offline</span>
              </>
            )}
          </div>
        </div>

        {/* Selected Language Pill */}
        <button
          id="home-lang-pill"
          onClick={onOpenLanguageModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E5E3DC] text-[#252A27] hover:bg-[#FAF9F5] text-xs font-semibold transition-colors cursor-pointer min-h-[36px]"
          title="Change language"
        >
          <Globe className="w-3.5 h-3.5 text-[#315C4C]" />
          <span className="truncate max-w-[100px]">{currentLangObj.nativeName}</span>
        </button>
      </div>

      {/* 1. PRIMARY HERO ACTION: 📷 SCAN ANIMAL (Simple, Light, Classic Card) */}
      <div
        id="primary-scan-card"
        className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E5E3DC] shadow-xs space-y-4"
      >
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#315C4C] mb-1">
            <Sparkles className="w-3.5 h-3.5 text-[#315C4C]" />
            <span>Visual Health Screening</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#252A27] mb-1">
            🐾 {userGreeting}
          </h1>
          <p className="text-xs sm:text-sm text-[#626963] leading-relaxed font-normal">
            Simple animal health support when you need it. Check health signs for cattle, buffaloes, goats, dogs, cats & pets.
          </p>
        </div>

        {/* Primary Scan Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => onStartScan("camera")}
            className="bg-[#315C4C] hover:bg-[#25473B] text-white rounded-xl p-4 flex items-center gap-3.5 transition-colors group cursor-pointer border border-[#315C4C] min-h-[60px]"
            id="home-take-photo-btn"
          >
            <div className="w-10 h-10 rounded-lg bg-[#25473B] flex items-center justify-center text-white shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div className="text-left min-w-0">
              <span className="text-sm font-bold block text-white truncate">
                {getTranslation(lang, "takePhoto")}
              </span>
              <span className="text-xs text-[#E7EEE9] font-normal block truncate">
                Capture with live camera
              </span>
            </div>
          </button>

          <button
            onClick={() => onStartScan("gallery")}
            className="bg-white hover:bg-[#FAF9F5] text-[#252A27] border border-[#315C4C] rounded-xl p-4 flex items-center gap-3.5 transition-colors group cursor-pointer min-h-[60px]"
            id="home-upload-gallery-btn"
          >
            <div className="w-10 h-10 rounded-lg bg-[#E7EEE9] flex items-center justify-center text-[#315C4C] shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div className="text-left min-w-0">
              <span className="text-sm font-bold block text-[#252A27] truncate">
                {getTranslation(lang, "uploadGallery")}
              </span>
              <span className="text-xs text-[#626963] font-normal block truncate">
                Upload photo from device
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 2. SECONDARY ACTIONS CLEAN GRID (Organized into a clean neutral grid) */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#858B86]">
            Quick Actions
          </h2>
          <span className="text-[11px] text-[#858B86]">Essential Care Tools</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* 1. 🚨 Emergency (Restrained Red Accent) */}
          <button
            onClick={() => onNavigate("emergency")}
            className="p-4 rounded-xl bg-[#FDF2F2] hover:bg-[#FBE8E8] border border-[#F2D6D6] text-left transition-colors cursor-pointer min-h-[90px] flex flex-col justify-between"
            id="home-grid-emergency-btn"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#FBE8E8] text-[#B44A4A] flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-[#B44A4A]" />
              </div>
              <span className="text-[9px] font-bold text-[#B44A4A] bg-[#F2D6D6] px-2 py-0.5 rounded">
                1962 SOS
              </span>
            </div>
            <div className="mt-2">
              <span className="text-sm font-bold text-[#B44A4A] block">🚨 Emergency</span>
              <span className="text-[11px] text-[#B44A4A]/80 font-normal block leading-tight">
                Call 1962 & First-Aid
              </span>
            </div>
          </button>

          {/* 2. 🐾 My Animals */}
          <button
            onClick={() => onNavigate("profile")}
            className="p-4 rounded-xl bg-white hover:bg-[#FAF9F5] border border-[#E5E3DC] text-left transition-colors cursor-pointer min-h-[90px] flex flex-col justify-between"
            id="home-grid-my-animals-btn"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#E7EEE9] text-[#315C4C] flex items-center justify-center">
                <PawPrint className="w-4 h-4 text-[#315C4C]" />
              </div>
              <span className="text-[9px] font-semibold text-[#315C4C] bg-[#E7EEE9] px-2 py-0.5 rounded">
                {profiles.length} {profiles.length === 1 ? "Animal" : "Animals"}
              </span>
            </div>
            <div className="mt-2">
              <span className="text-sm font-bold text-[#252A27] block">🐾 My Animals</span>
              <span className="text-[11px] text-[#626963] font-normal block leading-tight">
                Profiles & Health Records
              </span>
            </div>
          </button>

          {/* 3. 💉 Care Reminders */}
          <button
            onClick={() => onNavigate("profile")}
            className="p-4 rounded-xl bg-white hover:bg-[#FAF9F5] border border-[#E5E3DC] text-left transition-colors cursor-pointer min-h-[90px] flex flex-col justify-between"
            id="home-grid-reminders-btn"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#E7EEE9] text-[#315C4C] flex items-center justify-center">
                <Syringe className="w-4 h-4 text-[#315C4C]" />
              </div>
              {reminders.length > 0 ? (
                <span className="text-[9px] font-semibold text-[#B44A4A] bg-[#FDF2F2] border border-[#F2D6D6] px-2 py-0.5 rounded">
                  {reminders.length} Due
                </span>
              ) : (
                <span className="text-[9px] font-normal text-[#858B86] bg-[#FAF9F5] px-2 py-0.5 rounded">
                  Schedule
                </span>
              )}
            </div>
            <div className="mt-2">
              <span className="text-sm font-bold text-[#252A27] block">💉 Care Reminders</span>
              <span className="text-[11px] text-[#626963] font-normal block leading-tight">
                Vaccine & Deworming
              </span>
            </div>
          </button>

          {/* 4. 🏥 Nearby Vet */}
          <button
            onClick={onOpenNearbyVet}
            className="p-4 rounded-xl bg-white hover:bg-[#FAF9F5] border border-[#E5E3DC] text-left transition-colors cursor-pointer min-h-[90px] flex flex-col justify-between"
            id="home-grid-nearby-vet-btn"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#E7EEE9] text-[#315C4C] flex items-center justify-center">
                <MapPin className="w-4 h-4 text-[#315C4C]" />
              </div>
              <span className="text-[9px] font-semibold text-[#315C4C] bg-[#E7EEE9] px-2 py-0.5 rounded">
                Maps
              </span>
            </div>
            <div className="mt-2">
              <span className="text-sm font-bold text-[#252A27] block">🏥 Nearby Vet</span>
              <span className="text-[11px] text-[#626963] font-normal block leading-tight">
                Dispensaries & Hospitals
              </span>
            </div>
          </button>

          {/* 5. ✂️ Pet Grooming */}
          <button
            onClick={onOpenNearbyPetSalons}
            className="p-4 rounded-xl bg-white hover:bg-[#FAF9F5] border border-[#E5E3DC] text-left transition-colors cursor-pointer min-h-[90px] flex flex-col justify-between"
            id="home-grid-grooming-btn"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#E7EEE9] text-[#315C4C] flex items-center justify-center">
                <Scissors className="w-4 h-4 text-[#315C4C]" />
              </div>
              <span className="text-[9px] font-semibold text-[#315C4C] bg-[#E7EEE9] px-2 py-0.5 rounded">
                Salons
              </span>
            </div>
            <div className="mt-2">
              <span className="text-sm font-bold text-[#252A27] block">✂️ Pet Grooming</span>
              <span className="text-[11px] text-[#626963] font-normal block leading-tight">
                Spas & Care Centers
              </span>
            </div>
          </button>

          {/* 6. 📚 Learn */}
          <button
            onClick={() => onNavigate("learn")}
            className="p-4 rounded-xl bg-white hover:bg-[#FAF9F5] border border-[#E5E3DC] text-left transition-colors cursor-pointer min-h-[90px] flex flex-col justify-between"
            id="home-grid-learn-btn"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#E7EEE9] text-[#315C4C] flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-[#315C4C]" />
              </div>
              <span className="text-[9px] font-semibold text-[#315C4C] bg-[#E7EEE9] px-2 py-0.5 rounded">
                Guide
              </span>
            </div>
            <div className="mt-2">
              <span className="text-sm font-bold text-[#252A27] block">📚 Learn</span>
              <span className="text-[11px] text-[#626963] font-normal block leading-tight">
                Breeds, First Aid & Care
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 3. TODAY'S CARE & UPCOMING REMINDERS BANNER */}
      {reminders.length > 0 && (
        <div
          id="home-reminders-banner"
          className="bg-white border border-[#E5E3DC] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5"
        >
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E3DC]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#E7EEE9] text-[#315C4C] flex items-center justify-center">
                <Bell className="w-4 h-4 text-[#315C4C]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#252A27]">
                  Care Schedule ({reminders.length})
                </h3>
                <span className="text-[11px] text-[#626963] font-normal">
                  Follow-ups, vaccinations & deworming
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate("profile")}
              className="text-xs text-[#315C4C] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Manage All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {reminders.slice(0, 4).map((rem) => {
              const due = new Date(rem.dueDate);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isOverdue = due < today;
              const isDueToday = due.toDateString() === new Date().toDateString();
              const diffTime = due.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const isTomorrow = diffDays === 1;

              const isFollowUp = rem.reminderType === "follow_up" || rem.type === "follow_up";

              if (isFollowUp) {
                return (
                  <div
                    key={rem.id}
                    className={`p-3.5 rounded-xl border space-y-2.5 transition-colors ${
                      isOverdue
                        ? "bg-[#FDF2F2] border-[#F2D6D6]"
                        : isDueToday
                        ? "bg-[#FEF9E7] border-[#F9E79F]"
                        : "bg-[#FAF9F5] border-[#E5E3DC]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isOverdue
                              ? "bg-[#FBE8E8] text-[#B44A4A]"
                              : isDueToday
                              ? "bg-[#FCF3CF] text-[#9A7D0A]"
                              : "bg-[#E7EEE9] text-[#315C4C]"
                          }`}
                        >
                          <Stethoscope className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-[#252A27]">
                              {isDueToday
                                ? "🩺 Vet Visit Today"
                                : isOverdue
                                ? "⚠️ Vet Visit Overdue"
                                : isTomorrow
                                ? "📅 Vet Visit Tomorrow"
                                : "📅 Upcoming Vet Visit"}
                            </span>
                            <span
                              className={`text-[9px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                                isOverdue
                                  ? "bg-[#B44A4A] text-white"
                                  : isDueToday
                                  ? "bg-[#9A7D0A] text-white"
                                  : "bg-[#315C4C] text-white"
                              }`}
                            >
                              {isOverdue
                                ? "Overdue"
                                : isDueToday
                                ? "Due Today"
                                : isTomorrow
                                ? "Tomorrow"
                                : due.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                          <p className="text-xs text-[#626963] font-normal mt-0.5">
                            <strong className="text-[#252A27]">{rem.animalName}</strong>'s follow-up is {isDueToday ? "scheduled for today" : isTomorrow ? "scheduled for tomorrow" : `due on ${rem.dueDate}`}.
                            {rem.reason && (
                              <span className="text-[#626963] block sm:inline sm:ml-1">
                                ({rem.reason})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons for Follow-Up */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5 pl-10">
                      <button
                        type="button"
                        onClick={onOpenNearbyVet}
                        className="px-2.5 py-1 bg-white hover:bg-[#FAF9F5] text-[#315C4C] border border-[#E5E3DC] rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <MapPin className="w-3 h-3 text-[#315C4C]" />
                        <span>Find Vet</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onStartScan("camera")}
                        className="px-2.5 py-1 bg-white hover:bg-[#FAF9F5] text-[#315C4C] border border-[#E5E3DC] rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Camera className="w-3 h-3 text-[#315C4C]" />
                        <span>Recovery Photo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingReminder(rem)}
                        className="px-2.5 py-1 bg-white hover:bg-[#FAF9F5] text-[#626963] border border-[#E5E3DC] rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Edit2 className="w-3 h-3 text-[#858B86]" />
                        <span>Reschedule</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCompleteReminder(rem)}
                        className="px-2.5 py-1 bg-[#315C4C] hover:bg-[#25473B] text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ml-auto"
                      >
                        <CheckCircle2 className="w-3 h-3 text-white" />
                        <span>Mark Done</span>
                      </button>
                    </div>
                  </div>
                );
              }

              // Vaccination & Deworming reminders
              return (
                <div
                  key={rem.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    isOverdue
                      ? "bg-[#FDF2F2] border-[#F2D6D6]"
                      : isDueToday
                      ? "bg-[#FEF9E7] border-[#F9E79F]"
                      : "bg-[#FAF9F5] border-[#E5E3DC]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        rem.type === "vaccination"
                          ? "bg-[#E7EEE9] text-[#315C4C]"
                          : "bg-[#E7EEE9] text-[#315C4C]"
                      }`}
                    >
                      {rem.type === "vaccination" ? (
                        <Syringe className="w-4 h-4" />
                      ) : (
                        <Pill className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#252A27] truncate">
                          {rem.title}
                        </span>
                        <span
                          className={`text-[9px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                            isOverdue
                              ? "bg-[#B44A4A] text-white"
                              : isDueToday
                              ? "bg-[#9A7D0A] text-white"
                              : "bg-[#E7EEE9] text-[#25473B]"
                          }`}
                        >
                          {isOverdue
                            ? "Overdue"
                            : isDueToday
                            ? "Due Today"
                            : `Due ${due.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#626963] font-normal block truncate">
                        Animal: <strong className="text-[#252A27]">{rem.animalName}</strong> (
                        {rem.species || "Animal"})
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCompleteReminder(rem)}
                    className="px-3 py-1.5 bg-white hover:bg-[#FAF9F5] text-[#315C4C] border border-[#E5E3DC] rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
                    title="Mark Done"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#315C4C]" />
                    <span>Done</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Set Follow Up Modal on Home screen */}
      {editingReminder && (
        <SetFollowUpModal
          isOpen={Boolean(editingReminder)}
          onClose={() => setEditingReminder(null)}
          onSaved={() => {
            refreshReminders();
            setEditingReminder(null);
          }}
          defaultAnimalName={editingReminder.animalName}
          defaultAnimalProfileId={editingReminder.animalProfileId}
          defaultDate={editingReminder.dueDate}
          defaultReason={editingReminder.reason || editingReminder.title?.replace(/^Follow-Up: /, "")}
          prescriptionId={editingReminder.prescriptionId}
          screeningId={editingReminder.screeningId}
          settings={settings}
        />
      )}

      {/* 4. RECENT SCREENING SUMMARY CARD (if any) */}
      {latestScan && (
        <div
          id="home-recent-scan-card"
          className="bg-white rounded-2xl p-5 border border-[#E5E3DC] shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E3DC]">
            <div className="text-xs font-bold text-[#252A27] flex items-center gap-1.5">
              <History className="w-4 h-4 text-[#315C4C]" />
              <span>Recent Health Check</span>
            </div>
            <button
              onClick={() => onNavigate("history")}
              className="text-xs text-[#315C4C] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>All Checks ({recentRecords.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div
            onClick={() => onSelectRecord(latestScan)}
            className="flex items-center gap-3.5 p-3 rounded-xl bg-[#FAF9F5] hover:bg-[#F2EFE9] border border-[#E5E3DC] transition-colors cursor-pointer group"
          >
            <img
              src={latestScan.imageThumbnail}
              alt="Recent scan"
              className="w-14 h-14 rounded-lg object-cover border border-[#E5E3DC] shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-sm text-[#252A27] truncate">
                  {(typeof latestScan.result.detectedAnimal === "object" &&
                  latestScan.result.detectedAnimal !== null
                    ? latestScan.result.detectedAnimal.name
                    : latestScan.result.detectedAnimal) ||
                    latestScan.result.animalType ||
                    latestScan.selectedAnimal ||
                    "Animal"}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                    latestScan.result.severity === "Emergency"
                      ? "bg-[#FDF2F2] text-[#B44A4A] border-[#F2D6D6]"
                      : latestScan.result.severity === "Serious"
                      ? "bg-[#FEF5E7] text-[#B9770E] border-[#FAD7A0]"
                      : latestScan.result.severity === "Moderate"
                      ? "bg-[#FEF9E7] text-[#9A7D0A] border-[#F9E79F]"
                      : "bg-[#E7EEE9] text-[#25473B] border-[#D2DFD7]"
                  }`}
                >
                  {latestScan.result.severity === "Emergency"
                    ? "Urgent Attention"
                    : latestScan.result.severity === "Serious"
                    ? "Vet Recommended"
                    : latestScan.result.severity === "Moderate"
                    ? "Needs Attention"
                    : "Looks Normal"}
                </span>
              </div>
              <p className="text-xs text-[#626963] truncate font-normal">
                {latestScan.result.possibleConditions[0]?.name ||
                  latestScan.result.affectedBodyArea ||
                  "Screening completed"}
              </p>
              <div className="text-[11px] text-[#858B86] mt-0.5 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-[#858B86]" />
                <span>
                  {new Date(latestScan.timestamp).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#858B86] group-hover:text-[#252A27] shrink-0" />
          </div>
        </div>
      )}

      {/* 5. SIMPLE PHOTO-TAKING TIPS CARD */}
      <div
        id="home-photo-tips-card"
        className="bg-white rounded-2xl p-5 border border-[#E5E3DC] shadow-xs space-y-3"
      >
        <div className="flex items-center justify-between pb-2 border-b border-[#E5E3DC]">
          <h2 className="text-xs font-bold text-[#252A27] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#315C4C]" />
            <span>Photo Guidelines for Best Clarity</span>
          </h2>
          <span className="text-[10px] font-semibold text-[#315C4C] bg-[#E7EEE9] px-2 py-0.5 rounded">
            Guidelines
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-[#FAF9F5] rounded-xl p-3 text-center border border-[#E5E3DC] flex flex-col items-center">
            <div className="w-8 h-8 bg-white rounded-lg border border-[#E5E3DC] flex items-center justify-center text-[#315C4C] mb-1.5">
              <Sun className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-[#252A27] mb-0.5">Good Light</div>
            <div className="text-[11px] text-[#626963] leading-tight font-normal">
              {getTranslation(lang, "tipLighting")}
            </div>
          </div>

          <div className="bg-[#FAF9F5] rounded-xl p-3 text-center border border-[#E5E3DC] flex flex-col items-center">
            <div className="w-8 h-8 bg-white rounded-lg border border-[#E5E3DC] flex items-center justify-center text-[#315C4C] mb-1.5">
              <Focus className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-[#252A27] mb-0.5">Hold Steady</div>
            <div className="text-[11px] text-[#626963] leading-tight font-normal">
              {getTranslation(lang, "tipFocus")}
            </div>
          </div>

          <div className="bg-[#FAF9F5] rounded-xl p-3 text-center border border-[#E5E3DC] flex flex-col items-center">
            <div className="w-8 h-8 bg-white rounded-lg border border-[#E5E3DC] flex items-center justify-center text-[#315C4C] mb-1.5">
              <Smile className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-[#252A27] mb-0.5">Keep Calm</div>
            <div className="text-[11px] text-[#626963] leading-tight font-normal">
              {getTranslation(lang, "tipCalm")}
            </div>
          </div>

          <div className="bg-[#FAF9F5] rounded-xl p-3 text-center border border-[#E5E3DC] flex flex-col items-center">
            <div className="w-8 h-8 bg-white rounded-lg border border-[#E5E3DC] flex items-center justify-center text-[#315C4C] mb-1.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-[#252A27] mb-0.5">Stay Safe</div>
            <div className="text-[11px] text-[#626963] leading-tight font-normal">
              {getTranslation(lang, "tipSafety")}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="bg-[#FAF9F5] rounded-xl p-4 text-center text-[#626963] text-xs border border-[#E5E3DC] space-y-1">
        <div className="flex items-center justify-center gap-1.5 font-bold text-[#252A27]">
          <PawPrint className="w-4 h-4 text-[#315C4C]" />
          <span>VetCheck • Animal Health Support</span>
        </div>
        <p className="leading-relaxed text-[11px] text-[#626963]">
          Provides preliminary visual health screening & first-aid triage. Always consult a certified veterinary doctor for prescriptions and clinical treatment.
        </p>
      </div>
    </div>
  );
};
