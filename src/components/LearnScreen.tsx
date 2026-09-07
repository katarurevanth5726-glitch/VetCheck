import React, { useState, useMemo, useEffect } from "react";
import {
  BookOpen,
  Search,
  CheckSquare,
  Bell,
  AlertTriangle,
  ShieldAlert,
  Bookmark,
  BookmarkCheck,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Eye,
  Utensils,
  Home,
  Bug,
  ShieldCheck,
  Sun,
  HeartHandshake,
  AlertOctagon,
  Stethoscope,
  Plus,
  Trash2,
  Check,
  Clock,
  Calendar,
  Filter,
  PhoneCall,
  MapPin,
  WifiOff,
  Droplets,
  Activity,
  Wind,
  Ban,
  Pill,
  ExternalLink,
  Info,
  X,
  Share2,
} from "lucide-react";
import { UserSettings, AnimalProfile, LearnTopic, LearnCategory, CareReminder, DailyChecklistState } from "../types";
import {
  LEARN_TOPICS,
  LEARN_CATEGORIES,
  ANIMAL_FILTER_OPTIONS,
  AVOID_HARMFUL_ACTIONS,
  DAILY_CHECKLIST_ITEMS,
} from "../data/learnContent";
import {
  getStoredBookmarks,
  toggleLearnBookmark,
  getStoredDailyChecklists,
  saveDailyChecklist,
  getStoredReminders,
  saveReminder,
  deleteReminder,
  toggleReminderCompleted,
  requestNotificationPermission,
  triggerCareNotification,
} from "../utils/storage";
import { ttsManager } from "../utils/speechHelper";
import { getTranslation } from "../data/translations";

interface LearnScreenProps {
  settings: UserSettings;
  profiles: AnimalProfile[];
  initialSubTab?: "topics" | "checklist" | "reminders" | "emergency" | "harmful" | "saved";
  initialAnimalFilter?: string;
  initialCategoryFilter?: LearnCategory | "all";
  onOpenNearbyVet: () => void;
  onNavigateEmergency: () => void;
}

export const LearnScreen: React.FC<LearnScreenProps> = ({
  settings,
  profiles,
  initialSubTab = "topics",
  initialAnimalFilter = "All",
  initialCategoryFilter = "all",
  onOpenNearbyVet,
  onNavigateEmergency,
}) => {
  const lang = settings.language;
  const isRtl = settings.isRtl || lang === "ur";

  // Tab State
  const [activeSubTab, setActiveSubTab] = useState<"topics" | "checklist" | "reminders" | "emergency" | "harmful" | "saved">(
    initialSubTab
  );

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAnimal, setSelectedAnimal] = useState<string>(initialAnimalFilter);
  const [selectedCategory, setSelectedCategory] = useState<LearnCategory | "all">(initialCategoryFilter);

  // Expanded topic IDs
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  // Bookmarks state
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);

  // TTS State
  const [playingTopicId, setPlayingTopicId] = useState<string | null>(null);

  // Daily Checklist State
  const [checklistDate, setChecklistDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [checklistAnimal, setChecklistAnimal] = useState<string>(
    profiles.length > 0 ? profiles[0].name : "General Livestock / Pet"
  );
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
  const [checklistNotes, setChecklistNotes] = useState<string>("");
  const [showChecklistSavedNotice, setShowChecklistSavedNotice] = useState(false);

  // Reminders State
  const [reminders, setReminders] = useState<CareReminder[]>([]);
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [reminderAnimal, setReminderAnimal] = useState(
    profiles.length > 0 ? profiles[0].name : "General Animal"
  );
  const [reminderType, setReminderType] = useState<CareReminder["reminderType"]>("vaccination");
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDueDate, setReminderDueDate] = useState(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().split("T")[0]
  );
  const [reminderDueTime, setReminderDueTime] = useState("09:00");
  const [reminderNotes, setReminderNotes] = useState("");
  const [notificationPermissionState, setNotificationPermissionState] = useState<string>("default");

  // Load initial bookmarks and reminders
  useEffect(() => {
    setBookmarkedIds(getStoredBookmarks());
    setReminders(getStoredReminders());

    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermissionState(Notification.permission);
    }
  }, []);

  // Load checklist for selected date & animal
  useEffect(() => {
    const allChecklists = getStoredDailyChecklists();
    const compositeKey = `${checklistDate}_${checklistAnimal}`;
    if (allChecklists[compositeKey]) {
      setChecklistState(allChecklists[compositeKey].items || {});
      setChecklistNotes(allChecklists[compositeKey].notes || "");
    } else {
      setChecklistState({});
      setChecklistNotes("");
    }
  }, [checklistDate, checklistAnimal]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      ttsManager.stop();
    };
  }, []);

  // Handle TTS
  const handleToggleSpeak = (id: string, textToRead: string) => {
    if (playingTopicId === id) {
      ttsManager.stop();
      setPlayingTopicId(null);
    } else {
      ttsManager.stop();
      setPlayingTopicId(id);
      ttsManager.speak(
        textToRead,
        settings.language,
        settings.ttsVoiceSpeed || 1.0,
        settings.ttsPitch || 1.0,
        () => setPlayingTopicId(null)
      );
    }
  };

  // Toggle Bookmark
  const handleToggleBookmark = (topicId: string) => {
    const res = toggleLearnBookmark(topicId);
    setBookmarkedIds(res.bookmarks);
  };

  // Toggle Topic Expansion
  const toggleTopicExpand = (id: string) => {
    setExpandedTopics((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Filtered Topics
  const filteredTopics = useMemo(() => {
    return LEARN_TOPICS.filter((topic) => {
      // Animal filter
      if (selectedAnimal !== "All") {
        const matchesAnimal =
          topic.animalTargets.includes("All") ||
          topic.animalTargets.some((t) => t.toLowerCase() === selectedAnimal.toLowerCase()) ||
          (topic.animalKeywords && topic.animalKeywords.some((k) => k.includes(selectedAnimal.toLowerCase())));
        if (!matchesAnimal) return false;
      }

      // Category filter
      if (selectedCategory !== "all" && topic.category !== selectedCategory) {
        return false;
      }

      // Search Query
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchesText =
          topic.title.toLowerCase().includes(q) ||
          topic.summary.toLowerCase().includes(q) ||
          topic.keyTips.some((tip) => tip.toLowerCase().includes(q)) ||
          topic.whatToAvoid.some((a) => a.toLowerCase().includes(q)) ||
          topic.whenToCallVet.toLowerCase().includes(q);
        if (!matchesText) return false;
      }

      return true;
    });
  }, [selectedAnimal, selectedCategory, searchQuery]);

  // Saved / Bookmarked topics list
  const bookmarkedTopics = useMemo(() => {
    return LEARN_TOPICS.filter((t) => bookmarkedIds.includes(t.id));
  }, [bookmarkedIds]);

  // Icon Resolver
  const renderIcon = (iconName: string, className: string = "w-5 h-5") => {
    switch (iconName) {
      case "Sparkles":
        return <Sparkles className={className} />;
      case "Eye":
        return <Eye className={className} />;
      case "ShieldAlert":
        return <ShieldAlert className={className} />;
      case "Utensils":
        return <Utensils className={className} />;
      case "Home":
        return <Home className={className} />;
      case "Bug":
        return <Bug className={className} />;
      case "ShieldCheck":
        return <ShieldCheck className={className} />;
      case "Sun":
        return <Sun className={className} />;
      case "HeartHandshake":
        return <HeartHandshake className={className} />;
      case "AlertOctagon":
        return <AlertOctagon className={className} />;
      case "AlertTriangle":
        return <AlertTriangle className={className} />;
      case "Stethoscope":
        return <Stethoscope className={className} />;
      case "Droplets":
        return <Droplets className={className} />;
      case "Activity":
        return <Activity className={className} />;
      case "Wind":
        return <Wind className={className} />;
      case "Ban":
        return <Ban className={className} />;
      case "Pill":
        return <Pill className={className} />;
      default:
        return <BookOpen className={className} />;
    }
  };

  // Daily Checklist Handlers
  const handleToggleChecklistItem = (itemId: string) => {
    const updated = {
      ...checklistState,
      [itemId]: !checklistState[itemId],
    };
    setChecklistState(updated);

    const savedState: DailyChecklistState = {
      dateKey: checklistDate,
      animalName: checklistAnimal,
      items: updated,
      completedAt: Date.now(),
      notes: checklistNotes,
    };
    saveDailyChecklist(savedState);
    setShowChecklistSavedNotice(true);
    setTimeout(() => setShowChecklistSavedNotice(false), 2000);
  };

  const handleSaveChecklistNotes = () => {
    const savedState: DailyChecklistState = {
      dateKey: checklistDate,
      animalName: checklistAnimal,
      items: checklistState,
      completedAt: Date.now(),
      notes: checklistNotes,
    };
    saveDailyChecklist(savedState);
    setShowChecklistSavedNotice(true);
    setTimeout(() => setShowChecklistSavedNotice(false), 2000);
  };

  const handleResetChecklist = () => {
    const cleared = {};
    setChecklistState(cleared);
    saveDailyChecklist({
      dateKey: checklistDate,
      animalName: checklistAnimal,
      items: cleared,
      notes: "",
    });
  };

  // Reminders Handlers
  const handleSaveNewReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderTitle.trim()) return;

    const newRem = saveReminder({
      animalName: reminderAnimal,
      reminderType,
      title: reminderTitle.trim(),
      dueDate: reminderDueDate,
      dueTime: reminderDueTime,
      notes: reminderNotes.trim(),
      completed: false,
    });

    setReminders(newRem);
    setReminderTitle("");
    setReminderNotes("");
    setIsAddingReminder(false);

    // If permission granted, notify user that reminder is active
    if (Notification.permission === "granted") {
      triggerCareNotification(
        `Reminder Saved: ${reminderTitle.trim()}`,
        `Scheduled for ${reminderAnimal} on ${reminderDueDate} at ${reminderDueTime}`
      );
    }
  };

  const handleRequestNotifications = async () => {
    const perm = await requestNotificationPermission();
    if (perm !== "unsupported") {
      setNotificationPermissionState(perm);
      if (perm === "granted") {
        triggerCareNotification("VetCheck Reminders Active", "You will receive timely care & vaccination alerts on this device.");
      }
    }
  };

  const handleDeleteReminder = (id: string) => {
    const updated = deleteReminder(id);
    setReminders(updated);
  };

  const handleToggleReminder = (id: string) => {
    const updated = toggleReminderCompleted(id);
    setReminders(updated);
  };

  const completedChecklistCount = Object.values(checklistState).filter(Boolean).length;
  const isAllChecklistDone = completedChecklistCount === DAILY_CHECKLIST_ITEMS.length;

  return (
    <div className={`space-y-5 pb-20 max-w-3xl mx-auto ${isRtl ? "rtl" : ""}`} id="learn-screen-container">
      {/* Top Header & Context */}
      <div className="bg-[#315C4C] text-white rounded-2xl p-6 shadow-xs border border-[#25473B] relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white text-xs font-semibold">
            <BookOpen className="w-3.5 h-3.5 text-white/90" />
            <span>Preventive Veterinary Education</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {getTranslation(lang, "learnTitle") || "Learn & Prevent"}
          </h1>
          <p className="text-xs sm:text-sm text-white/85 leading-relaxed max-w-xl">
            {getTranslation(lang, "learnSubtitle") ||
              "Simple preventive animal-care education for pet owners, dairy farmers, and rural caregivers."}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/20 border border-white/20 text-[11px] font-semibold text-white/90">
              <WifiOff className="w-3.5 h-3.5 text-[#A3D9C9]" />
              <span>All Articles Available Offline</span>
            </div>
            <button
              onClick={onOpenNearbyVet}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-[#315C4C] hover:bg-[#FAF9F5] text-[11px] font-bold transition-colors cursor-pointer shadow-xs"
              id="learn-find-vet-top-btn"
            >
              <MapPin className="w-3.5 h-3.5 text-[#315C4C]" />
              <span>{getTranslation(lang, "findVetHelpBtn") || "Find Nearby Vet"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mandatory Regulatory & Medical Disclaimer Banner */}
      <div className="bg-[#FAF9F5] border border-[#E3E1D9] rounded-2xl p-4 flex items-start gap-3 text-[#252A27] text-xs shadow-xs">
        <Info className="w-5 h-5 text-[#858B86] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold block uppercase tracking-wider text-[10px] text-[#626963]">
            Veterinary Education Notice
          </span>
          <p className="leading-relaxed text-[#626963]">
            {getTranslation(lang, "learnDisclaimer") ||
              "“VetCheck provides general animal-care education. It does not replace examination, diagnosis or treatment by a qualified veterinarian.”"}
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-[#FAF9F5] rounded-xl border border-[#E3E1D9] overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSubTab("topics")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeSubTab === "topics"
              ? "bg-white text-[#315C4C] shadow-xs border border-[#CBD8D0]"
              : "text-[#626963] hover:text-[#252A27]"
          }`}
          id="learn-tab-topics"
        >
          <BookOpen className="w-4 h-4 text-[#315C4C]" />
          <span>Care Guides</span>
        </button>

        <button
          onClick={() => setActiveSubTab("checklist")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeSubTab === "checklist"
              ? "bg-white text-[#315C4C] shadow-xs border border-[#CBD8D0]"
              : "text-[#626963] hover:text-[#252A27]"
          }`}
          id="learn-tab-checklist"
        >
          <CheckSquare className="w-4 h-4 text-[#315C4C]" />
          <span>Daily Checklist</span>
          {completedChecklistCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#E7EEE9] text-[#315C4C] text-[10px] flex items-center justify-center font-bold">
              {completedChecklistCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab("reminders")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeSubTab === "reminders"
              ? "bg-white text-[#315C4C] shadow-xs border border-[#CBD8D0]"
              : "text-[#626963] hover:text-[#252A27]"
          }`}
          id="learn-tab-reminders"
        >
          <Bell className="w-4 h-4 text-[#315C4C]" />
          <span>Reminders</span>
          {reminders.filter((r) => !r.completed).length > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#E7EEE9] text-[#315C4C] text-[10px] flex items-center justify-center font-bold">
              {reminders.filter((r) => !r.completed).length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab("emergency")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeSubTab === "emergency"
              ? "bg-[#8F3B3B] text-white shadow-xs"
              : "text-[#8F3B3B] hover:bg-[#FFF5F5]"
          }`}
          id="learn-tab-emergency"
        >
          <AlertOctagon className="w-4 h-4" />
          <span>Warning Signs</span>
        </button>

        <button
          onClick={() => setActiveSubTab("harmful")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeSubTab === "harmful"
              ? "bg-white text-[#8F3B3B] shadow-xs border border-[#F0CECE]"
              : "text-[#626963] hover:text-[#252A27]"
          }`}
          id="learn-tab-harmful"
        >
          <Ban className="w-4 h-4 text-[#8F3B3B]" />
          <span>Avoid Harmful Actions</span>
        </button>

        <button
          onClick={() => setActiveSubTab("saved")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeSubTab === "saved"
              ? "bg-white text-[#315C4C] shadow-xs border border-[#CBD8D0]"
              : "text-[#626963] hover:text-[#252A27]"
          }`}
          id="learn-tab-saved"
        >
          <Bookmark className="w-4 h-4 text-[#C08518]" />
          <span>Saved ({bookmarkedTopics.length})</span>
        </button>
      </div>

      {/* SUB-VIEW 1: Care Guides & Educational Topics */}
      {activeSubTab === "topics" && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                getTranslation(lang, "searchTopicsPlaceholder") ||
                "Search topics (e.g. eye care, ticks, fodder, bloat)..."
              }
              className="w-full bg-white pl-10 pr-10 py-3 rounded-2xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-500 shadow-xs"
              id="learn-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Animal Filter Chips */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1">
              <span>Select Animal:</span>
              {selectedAnimal !== "All" && (
                <button
                  onClick={() => setSelectedAnimal("All")}
                  className="text-teal-700 hover:underline cursor-pointer"
                >
                  Reset to All
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {ANIMAL_FILTER_OPTIONS.map((animal) => {
                const isSelected = selectedAnimal === animal;
                return (
                  <button
                    key={animal}
                    onClick={() => setSelectedAnimal(animal)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-teal-700 border-teal-800 text-white shadow-2xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                    id={`filter-animal-${animal.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {animal === "All" ? "🐾 All Animals" : animal}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 12 Required Care Categories Filter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1">
              <span>Care Categories (12 Topics):</span>
              {selectedCategory !== "all" && (
                <button
                  onClick={() => setSelectedCategory("all")}
                  className="text-teal-700 hover:underline cursor-pointer"
                >
                  View All Categories
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  selectedCategory === "all"
                    ? "bg-slate-900 border-slate-950 text-white shadow-2xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                All Categories ({LEARN_TOPICS.length})
              </button>
              {LEARN_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const count = LEARN_TOPICS.filter((t) => t.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-teal-700 border-teal-800 text-white shadow-2xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                    id={`filter-cat-${cat.id}`}
                  >
                    {renderIcon(cat.iconName, "w-3.5 h-3.5")}
                    <span>{cat.shortLabel}</span>
                    <span className="opacity-70 text-[10px]">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Topics Count & Active Filter Summary */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
            <span>
              Showing <strong className="text-slate-800">{filteredTopics.length}</strong> preventive topics
            </span>
            {selectedAnimal !== "All" && (
              <span className="bg-teal-50 text-teal-800 text-[11px] font-bold px-2 py-0.5 rounded-full border border-teal-200">
                Filtered: {selectedAnimal}
              </span>
            )}
          </div>

          {/* Cards List */}
          {filteredTopics.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 space-y-3">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-slate-800">No matching topics found</h2>
                <p className="text-xs text-slate-500">
                  Try adjusting your search keywords or switching back to "All Animals".
                </p>
              </div>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedAnimal("All");
                  setSelectedCategory("all");
                }}
                className="px-4 py-2 bg-teal-50 text-teal-800 rounded-xl text-xs font-bold border border-teal-200 hover:bg-teal-100 cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTopics.map((topic) => {
                const isExpanded = !!expandedTopics[topic.id];
                const isBookmarked = bookmarkedIds.includes(topic.id);
                const isSpeaking = playingTopicId === topic.id;
                const catMeta = LEARN_CATEGORIES.find((c) => c.id === topic.category);

                const speechText = `${topic.title}. Summary: ${topic.summary}. Key preventive steps: ${topic.keyTips.join(
                  ". "
                )}. What to avoid: ${topic.whatToAvoid.join(". ")}. When to call veterinarian: ${
                  topic.whenToCallVet
                }`;

                return (
                  <div
                    key={topic.id}
                    className={`bg-white rounded-3xl border transition-all duration-200 shadow-xs ${
                      isExpanded
                        ? "border-teal-300 ring-2 ring-teal-100/50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    id={`learn-card-${topic.id}`}
                  >
                    {/* Card Header Bar */}
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 shrink-0 mt-0.5">
                            {renderIcon(topic.iconName, "w-5 h-5")}
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                                  catMeta?.badgeBg || "bg-slate-100 text-slate-800"
                                }`}
                              >
                                {catMeta?.shortLabel || topic.category}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                {topic.animalTargets.includes("All")
                                  ? "All Animals"
                                  : topic.animalTargets.slice(0, 3).join(", ")}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <WifiOff className="w-2.5 h-2.5" />
                                <span>Offline</span>
                              </span>
                            </div>

                            <h2 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                              {topic.title}
                            </h2>
                          </div>
                        </div>

                        {/* Card Top Action Buttons: TTS & Bookmark */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Audio Speaker Button */}
                          <button
                            onClick={() => handleToggleSpeak(topic.id, speechText)}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                              isSpeaking
                                ? "bg-teal-600 text-white animate-pulse"
                                : "bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-700"
                            }`}
                            title={isSpeaking ? "Stop voice narration" : "Listen in selected language"}
                            aria-label={isSpeaking ? "Stop speech" : "Read aloud"}
                          >
                            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          </button>

                          {/* Bookmark Toggle Button */}
                          <button
                            onClick={() => handleToggleBookmark(topic.id)}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                              isBookmarked
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                            }`}
                            title={isBookmarked ? "Remove from saved" : "Bookmark this guide"}
                            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
                          >
                            {isBookmarked ? (
                              <BookmarkCheck className="w-4 h-4 fill-current" />
                            ) : (
                              <Bookmark className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Short Summary */}
                      <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed mt-2.5">
                        {topic.summary}
                      </p>

                      {/* Expand / Collapse Button */}
                      <button
                        onClick={() => toggleTopicExpand(topic.id)}
                        className="mt-3 w-full pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-extrabold text-teal-800 hover:text-teal-950 cursor-pointer"
                      >
                        <span>{isExpanded ? "Hide Details" : "View Preventive Steps & Warnings"}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-teal-700" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-teal-700" />
                        )}
                      </button>
                    </div>

                    {/* Expandable Details Container */}
                    {isExpanded && (
                      <div className="px-4 sm:px-5 pb-5 pt-1 space-y-3.5 bg-slate-50/70 border-t border-slate-100 rounded-b-3xl text-xs sm:text-sm">
                        {/* Key Preventive Tips */}
                        <div className="space-y-1.5">
                          <span className="font-black text-slate-900 text-xs flex items-center gap-1.5 text-teal-900">
                            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                            <span>Recommended Preventive Steps:</span>
                          </span>
                          <ul className="space-y-1.5 pl-1">
                            {topic.keyTips.map((tip, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-slate-700 font-medium leading-relaxed">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 shrink-0" />
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* What to Avoid */}
                        {topic.whatToAvoid.length > 0 && (
                          <div className="bg-rose-50/80 border border-rose-200/80 rounded-2xl p-3 space-y-1.5 text-rose-950">
                            <span className="font-black text-xs flex items-center gap-1.5 text-rose-900">
                              <Ban className="w-3.5 h-3.5 text-rose-600" />
                              <span>What to AVOID Doing:</span>
                            </span>
                            <ul className="space-y-1 pl-1">
                              {topic.whatToAvoid.map((avoid, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-xs font-semibold text-rose-900 leading-relaxed">
                                  <span className="text-rose-500 font-bold">•</span>
                                  <span>{avoid}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* When to Call Vet */}
                        <div className="bg-teal-50 border border-teal-200/80 rounded-2xl p-3 space-y-1 text-teal-950">
                          <span className="font-black text-xs flex items-center gap-1.5 text-teal-900">
                            <Stethoscope className="w-3.5 h-3.5 text-teal-700" />
                            <span>When to Contact a Veterinarian:</span>
                          </span>
                          <p className="text-xs text-teal-900 font-medium leading-relaxed">
                            {topic.whenToCallVet}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 2: Daily Care Checklist */}
      {activeSubTab === "checklist" && (
        <div className="space-y-4" id="daily-checklist-container">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            {/* Header & Date/Animal Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-emerald-600" />
                  <span>{getTranslation(lang, "dailyChecklistTitle") || "Daily Care Checklist"}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track vital daily wellness signs locally to detect health deviations early.
                </p>
              </div>

              {/* Date Picker */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={checklistDate}
                  onChange={(e) => setChecklistDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  id="checklist-date-input"
                />
              </div>
            </div>

            {/* Animal Selection for Checklist */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Checklist For Animal:</label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setChecklistAnimal(p.name)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                      checklistAnimal === p.name
                        ? "bg-emerald-700 border-emerald-800 text-white shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    🐾 {p.name} ({p.species})
                  </button>
                ))}
                <button
                  onClick={() => setChecklistAnimal("General Herd / Pets")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                    checklistAnimal === "General Herd / Pets"
                      ? "bg-emerald-700 border-emerald-800 text-white shadow-2xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  General Herd / Pets
                </button>
              </div>
            </div>

            {/* Completion Progress Bar */}
            <div className="bg-slate-100 rounded-2xl p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Today's Checks for {checklistAnimal}:</span>
                <span className="text-emerald-700 font-extrabold">
                  {completedChecklistCount} of {DAILY_CHECKLIST_ITEMS.length} Checked
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300 rounded-full"
                  style={{
                    width: `${(completedChecklistCount / DAILY_CHECKLIST_ITEMS.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Checklist Items List (8 required items) */}
            <div className="space-y-2 pt-1">
              {DAILY_CHECKLIST_ITEMS.map((item) => {
                const isChecked = !!checklistState[item.id];
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleChecklistItem(item.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                      isChecked
                        ? "bg-emerald-50/80 border-emerald-300 shadow-2xs"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                    id={`checklist-item-${item.id}`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                        isChecked
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "border-2 border-slate-300 bg-white"
                      }`}
                    >
                      {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-900">
                          {item.label}
                        </span>
                        {isChecked && (
                          <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.2 rounded-full">
                            Normal
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        {item.subtext}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Optional Daily Observation Notes */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-slate-700">Optional Notes / Observations:</label>
              <textarea
                value={checklistNotes}
                onChange={(e) => setChecklistNotes(e.target.value)}
                onBlur={handleSaveChecklistNotes}
                placeholder="Enter any notes (e.g. slight cough in morning, fed green sorghum, cleaned shed)..."
                rows={2}
                className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* Reset & Save Feedback */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                onClick={handleResetChecklist}
                className="text-xs text-slate-400 hover:text-rose-600 font-bold transition-colors cursor-pointer"
              >
                Reset Today's Checks
              </button>

              {showChecklistSavedNotice && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full animate-fade-in">
                  ✓ Saved Locally
                </span>
              )}
            </div>
          </div>

          {/* Mandatory Checklist Disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-950 space-y-1">
            <span className="font-bold block text-amber-900">Important Checklist Clarification:</span>
            <p className="leading-relaxed font-medium">
              {getTranslation(lang, "checklistDisclaimer") ||
                "Clarification: Completing this daily checklist helps monitor daily trends but does not prove that an animal is free from underlying medical issues. Always consult a veterinarian if you observe abnormalities."}
            </p>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: Vaccination & Care Reminders */}
      {activeSubTab === "reminders" && (
        <div className="space-y-4" id="reminders-container">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            {/* Header & Add Button */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-teal-600" />
                  <span>{getTranslation(lang, "careRemindersTitle") || "Vaccination & Care Reminders"}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track veterinary-recommended immunization and checkup schedules.
                </p>
              </div>

              <button
                onClick={() => setIsAddingReminder(!isAddingReminder)}
                className="bg-teal-700 hover:bg-teal-800 text-white px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-transform active:scale-98 cursor-pointer"
                id="add-reminder-btn"
              >
                <Plus className="w-4 h-4" />
                <span>{isAddingReminder ? "Cancel" : "Add Reminder"}</span>
              </button>
            </div>

            {/* Notification Permission Banner */}
            {notificationPermissionState !== "granted" && (
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5 text-teal-950">
                  <span className="font-bold block">Enable Browser Notifications</span>
                  <p className="text-teal-800 font-medium">
                    Receive alert popups on your device when a vaccination or check-up date arrives.
                  </p>
                </div>
                <button
                  onClick={handleRequestNotifications}
                  className="bg-teal-800 text-white font-bold px-3 py-1.5 rounded-xl text-xs whitespace-nowrap hover:bg-teal-900 cursor-pointer shadow-xs"
                >
                  Enable Alerts
                </button>
              </div>
            )}

            {/* Create Reminder Form Modal/Accordion */}
            {isAddingReminder && (
              <form
                onSubmit={handleSaveNewReminder}
                className="bg-slate-50 rounded-2xl p-4 border border-teal-200 space-y-3 animate-in fade-in duration-150"
              >
                <div className="font-black text-xs text-slate-900 flex items-center gap-1.5 text-teal-900">
                  <Plus className="w-4 h-4 text-teal-600" />
                  <span>New Care Reminder (User-Entered Veterinary Schedule)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Animal Profile */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Animal Profile / Name:</label>
                    <select
                      value={reminderAnimal}
                      onChange={(e) => setReminderAnimal(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold"
                    >
                      {profiles.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name} ({p.species})
                        </option>
                      ))}
                      <option value="Dairy Herd (All Cows)">Dairy Herd (All Cows)</option>
                      <option value="General Buffaloes">General Buffaloes</option>
                      <option value="Goat Flock">Goat Flock</option>
                      <option value="Pet Dog">Pet Dog</option>
                      <option value="Pet Cat">Pet Cat</option>
                      <option value="Other Animal">Other Animal</option>
                    </select>
                  </div>

                  {/* Activity Type */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Activity Type:</label>
                    <select
                      value={reminderType}
                      onChange={(e) => setReminderType(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold"
                    >
                      <option value="vaccination">Vaccination (Immunization)</option>
                      <option value="deworming">Deworming</option>
                      <option value="checkup">Veterinary Check-up</option>
                      <option value="follow_up">Follow-up Screening</option>
                      <option value="wound_observation">Wound Observation</option>
                      <option value="other">Other Care Activity</option>
                    </select>
                  </div>
                </div>

                {/* Reminder Title */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">
                    Reminder Title / Purpose (e.g. FMD Vaccine Booster, Ear Check):
                  </label>
                  <input
                    type="text"
                    required
                    value={reminderTitle}
                    onChange={(e) => setReminderTitle(e.target.value)}
                    placeholder="e.g. Annual Rabies Booster, Deworming Dose"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Due Date */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Date (Recommended by Vet):</label>
                    <input
                      type="date"
                      required
                      value={reminderDueDate}
                      onChange={(e) => setReminderDueDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-medium"
                    />
                  </div>

                  {/* Due Time */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Time (Optional):</label>
                    <input
                      type="time"
                      value={reminderDueTime}
                      onChange={(e) => setReminderDueTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-medium"
                    />
                  </div>
                </div>

                {/* Optional Note */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Optional Notes / Doctor's Instructions:</label>
                  <input
                    type="text"
                    value={reminderNotes}
                    onChange={(e) => setReminderNotes(e.target.value)}
                    placeholder="e.g. Administer on empty stomach, bring vaccination card to clinic"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-medium"
                  />
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  Note: VetCheck does not automatically generate medical schedules. Please enter dates recommended by your veterinarian.
                </p>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingReminder(false)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-teal-700 text-white text-xs font-extrabold hover:bg-teal-800 shadow-sm cursor-pointer"
                  >
                    Save Reminder
                  </button>
                </div>
              </form>
            )}

            {/* List of Reminders */}
            {reminders.length === 0 ? (
              <div className="bg-slate-50 rounded-2xl p-6 text-center border border-slate-100 space-y-2">
                <Bell className="w-8 h-8 text-slate-300 mx-auto" />
                <span className="text-xs font-bold text-slate-700 block">No Reminders Created Yet</span>
                <p className="text-[11px] text-slate-500">
                  Tap "Add Reminder" to schedule upcoming vaccinations, deworming, or vet visits.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {reminders.map((rem) => (
                  <div
                    key={rem.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                      rem.completed
                        ? "bg-slate-50/70 border-slate-200 opacity-75"
                        : "bg-white border-slate-200 shadow-xs hover:border-teal-300"
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        onClick={() => handleToggleReminder(rem.id)}
                        className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
                          rem.completed
                            ? "bg-emerald-600 text-white"
                            : "border-2 border-slate-300 hover:border-teal-500 bg-white"
                        }`}
                        title={rem.completed ? "Mark as pending" : "Mark as completed"}
                      >
                        {rem.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-xs font-black truncate ${
                              rem.completed ? "line-through text-slate-400" : "text-slate-900"
                            }`}
                          >
                            {rem.title}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-100">
                            {rem.animalName}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                            {rem.reminderType.replace("_", " ")}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{new Date(rem.dueDate).toLocaleDateString()}</span>
                          </span>
                          {rem.dueTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{rem.dueTime}</span>
                            </span>
                          )}
                        </div>

                        {rem.notes && (
                          <p className="text-xs text-slate-600 italic bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            "{rem.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteReminder(rem.id)}
                      className="text-slate-300 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                      title="Delete reminder"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: Emergency Warning-Sign Guide */}
      {activeSubTab === "emergency" && (
        <div className="space-y-4" id="emergency-warning-guide-container">
          <div className="bg-rose-600 text-white rounded-3xl p-6 shadow-xl space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-700 border border-rose-400/40 text-xs font-extrabold text-rose-100">
                <AlertOctagon className="w-4 h-4 text-white animate-pulse" />
                <span>Life-Threatening Red Flags</span>
              </div>
              <span className="text-[10px] font-black uppercase bg-white text-rose-900 px-2.5 py-1 rounded-full shadow-xs">
                Act Fast
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              11 Critical Signs Requiring Immediate Veterinary Care
            </h2>
            <p className="text-xs sm:text-sm text-rose-100 leading-relaxed max-w-xl font-normal">
              If an animal exhibits any of the following emergency warning signs, seek immediate veterinary intervention.
              <strong> Never delay emergency care by asking the user to complete an AI scan.</strong>
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <a
                href="tel:1962"
                className="bg-white text-rose-900 hover:bg-rose-50 px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg transition-transform active:scale-98 cursor-pointer"
                id="emergency-call-1962-action"
              >
                <PhoneCall className="w-4 h-4 text-rose-600" />
                <span>Call 1962 (National Helpline)</span>
              </a>

              <button
                onClick={onOpenNearbyVet}
                className="bg-rose-800/80 hover:bg-rose-800 text-white border border-rose-400/40 px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm cursor-pointer"
                id="emergency-find-vet-action"
              >
                <MapPin className="w-4 h-4 text-rose-200" />
                <span>Find Nearby Clinics on Maps</span>
              </button>

              <button
                onClick={onNavigateEmergency}
                className="bg-rose-900/60 hover:bg-rose-900 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                View Step-by-Step SOS Guides
              </button>
            </div>
          </div>

          {/* 11 Emergency Critical Conditions Grid */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider text-rose-900 flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>11 Emergency Red Flag Conditions:</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {[
                { title: "Severe Bleeding", desc: "Arterial spurting or continuous pooling of blood from large wounds.", icon: "ShieldAlert" },
                { title: "Breathing Difficulty", desc: "Gasping, open-mouth neck extension, purple or blue gums/tongue.", icon: "Wind" },
                { title: "Seizures & Tremors", desc: "Violent continuous shaking, foaming at mouth, paddling limbs.", icon: "Activity" },
                { title: "Unconsciousness / Collapse", desc: "Animal is completely unresponsive or unable to be roused.", icon: "AlertOctagon" },
                { title: "Suspected Poisoning", desc: "Sudden staggering, acute vomiting, heavy salivation, pesticides.", icon: "AlertTriangle" },
                { title: "Major Burns / Scalds", desc: "Extensive fire, hot liquid, chemical burns across body.", icon: "Sun" },
                { title: "Serious Accidents / Trauma", desc: "Vehicle impact, fall from height, deep open bone fractures.", icon: "ShieldAlert" },
                { title: "Unable to Stand ('Downer')", desc: "Adult cattle, horse, or pet collapsed and unable to stand up.", icon: "AlertOctagon" },
                { title: "Difficult Delivery (Dystocia)", desc: "Hard labor pushing over 2 hours with no newborn progress.", icon: "HeartHandshake" },
                { title: "Rapidly Worsening Swelling", desc: "Acute left flank bloat in ruminants or facial swelling.", icon: "AlertTriangle" },
                { title: "Suspected Snakebite", desc: "Sudden extreme swelling, fang marks, bleeding from gums/urine.", icon: "Bug" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-rose-50/50 border border-rose-200/60 flex items-start gap-2.5"
                >
                  <div className="w-7 h-7 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0 font-black text-xs">
                    {idx + 1}
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-black text-slate-900 block">{item.title}</span>
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 5: Avoid Harmful Actions (Myths & Safety) */}
      {activeSubTab === "harmful" && (
        <div className="space-y-4" id="avoid-harmful-actions-container">
          <div className="bg-red-950 text-white rounded-3xl p-6 shadow-xl space-y-2 relative overflow-hidden">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-800 text-red-100 text-xs font-bold border border-red-700">
              <Ban className="w-3.5 h-3.5 text-red-300" />
              <span>Caregiver Safety & Myth Busting</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {getTranslation(lang, "avoidHarmfulTitle") || "Avoid Harmful Actions"}
            </h2>
            <p className="text-xs sm:text-sm text-red-100/90 leading-relaxed max-w-xl font-normal">
              Common folk remedies and well-intentioned human practices often cause permanent injury or death to animals.
              Follow these core safety rules.
            </p>
          </div>

          <div className="space-y-3">
            {AVOID_HARMFUL_ACTIONS.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-2.5"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-red-100 flex items-center justify-center text-red-700 shrink-0 mt-0.5">
                    <Ban className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h2 className="text-sm sm:text-base font-black text-red-900 leading-snug">
                      {item.rule}
                    </h2>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      {item.explanation}
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 flex items-start gap-2 text-emerald-950 text-xs">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block text-emerald-900">Safe Veterinary Alternative:</strong>
                    <span className="font-medium text-emerald-800">{item.safeAlternative}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 6: Saved Articles / Bookmarks */}
      {activeSubTab === "saved" && (
        <div className="space-y-4" id="saved-articles-container">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-amber-600" />
                  <span>{getTranslation(lang, "savedArticlesTitle") || "Saved Articles"}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your bookmarked care guides for quick offline reference.
                </p>
              </div>

              <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                {bookmarkedTopics.length} Saved
              </span>
            </div>

            {bookmarkedTopics.length === 0 ? (
              <div className="bg-slate-50 rounded-2xl p-8 text-center border border-slate-100 space-y-2">
                <Bookmark className="w-8 h-8 text-slate-300 mx-auto" />
                <span className="text-xs font-bold text-slate-700 block">No Articles Saved Yet</span>
                <p className="text-[11px] text-slate-500">
                  Tap the bookmark icon on any educational card in "Care Guides" to save it here for instant offline access.
                </p>
                <button
                  onClick={() => setActiveSubTab("topics")}
                  className="px-4 py-2 bg-teal-700 text-white rounded-xl text-xs font-extrabold hover:bg-teal-800 cursor-pointer shadow-xs"
                >
                  Browse Care Guides
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {bookmarkedTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-100">
                          {topic.category.replace("_", " ")}
                        </span>
                        <h2 className="text-sm font-black text-slate-900">{topic.title}</h2>
                      </div>

                      <button
                        onClick={() => handleToggleBookmark(topic.id)}
                        className="text-amber-600 hover:text-slate-400 p-1 cursor-pointer"
                        title="Remove bookmark"
                      >
                        <BookmarkCheck className="w-4 h-4 fill-current" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      {topic.summary}
                    </p>

                    <div className="bg-slate-50 p-2.5 rounded-xl text-xs text-slate-700 space-y-1 border border-slate-100">
                      <strong className="text-[11px] font-bold text-slate-900 block">Key Tips:</strong>
                      <ul className="space-y-1 pl-1">
                        {topic.keyTips.slice(0, 2).map((tip, idx) => (
                          <li key={idx} className="text-[11px] text-slate-600 flex items-start gap-1.5">
                            <span className="text-teal-600">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
