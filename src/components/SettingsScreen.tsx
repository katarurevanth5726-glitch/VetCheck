import React, { useState } from "react";
import {
  Settings,
  Globe,
  Volume2,
  Trash2,
  RotateCcw,
  Award,
  Shield,
  HelpCircle,
  ExternalLink,
  Sparkles,
  Check,
  Search,
  Type,
  Sun,
  Eye,
  ShieldCheck,
  User,
  Bell,
  MapPin,
  Save,
  Lock,
  ChevronRight,
} from "lucide-react";
import { SUPPORTED_LANGUAGES, getTranslation } from "../data/translations";
import { UserProfile, UserSettings } from "../types";
import { NotificationSettingsCard } from "./NotificationSettingsCard";

interface SettingsScreenProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onClearAllData: () => void;
  onClearHistoryOnly?: () => void;
  onOpenOnboarding: () => void;
  onNavigateTab: (tab: any) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  onClearAllData,
  onClearHistoryOnly,
  onOpenOnboarding,
  onNavigateTab,
}) => {
  const lang = settings.language;
  const [langSearch, setLangSearch] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState<"history" | "all" | null>(null);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState(false);

  // Local state for profile inputs
  const [profileName, setProfileName] = useState(settings.userProfile?.name || "");
  const [profileType, setProfileType] = useState(settings.userProfile?.userType || "Pet Owner");
  const [profileLocation, setProfileLocation] = useState(settings.userProfile?.location || "");

  const filteredLanguages = SUPPORTED_LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.code.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.script.toLowerCase().includes(langSearch.toLowerCase())
  );

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedProfile: UserProfile = {
      name: profileName.trim(),
      userType: profileType,
      location: profileLocation.trim(),
      preferredLanguage: settings.language,
    };
    onUpdateSettings({ userProfile: updatedProfile });
    setProfileSuccessMsg(true);
    setTimeout(() => setProfileSuccessMsg(false), 3000);
  };

  const handleResetSettingsOnly = () => {
    onUpdateSettings({
      simpleMode: false,
      fontSize: "normal",
      highContrastMode: false,
      ttsVoiceSpeed: 1.0,
      ttsPitch: 1.0,
      autoSpeakResults: false,
      notificationsEnabled: false,
    });
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-20">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#252A27] flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#315C4C]" />
          <span>{getTranslation(lang, "settingsTitle")}</span>
        </h1>
        <p className="text-xs text-[#626963]">
          Preferences, language configuration, accessibility & local profile
        </p>
      </div>

      {/* 1. OPTIONAL LOCAL PROFILE CARD */}
      <div className="bg-white border border-[#E3E1D9] rounded-2xl p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-[#E3E1D9] pb-2.5">
          <div className="text-sm font-bold text-[#252A27] flex items-center gap-2">
            <User className="w-4 h-4 text-[#315C4C]" />
            <span>Optional User Profile</span>
          </div>
          <span className="text-[10px] font-semibold text-[#315C4C] bg-[#E7EEE9] border border-[#CBD8D0] px-2.5 py-0.5 rounded-full">
            No Login Required
          </span>
        </div>

        <p className="text-xs text-[#626963] leading-relaxed">
          Provide optional details to personalize your dashboard greetings and emergency location. All data is saved strictly in your device's browser local storage.
        </p>

        <form onSubmit={handleSaveProfile} className="space-y-3">
          {/* Name Field */}
          <div>
            <label className="text-xs font-semibold text-[#252A27] block mb-1">
              Your Name (Optional)
            </label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="e.g., Ramesh Kumar, Anita Patel..."
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[#D5D8D2] bg-[#FAF9F5] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#315C4C] font-medium text-[#252A27]"
            />
          </div>

          {/* User Type */}
          <div>
            <label className="text-xs font-semibold text-[#252A27] block mb-1">
              Role / User Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {["Pet Owner", "Farmer", "Animal Caregiver", "Other"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setProfileType(type)}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer text-center truncate ${
                    profileType === type
                      ? "bg-[#315C4C] text-white border-[#25473B] shadow-xs"
                      : "bg-[#FAF9F5] text-[#626963] border-[#E3E1D9] hover:bg-[#F2EFE9]"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Village / Town / City */}
          <div>
            <label className="text-xs font-semibold text-[#252A27] block mb-1">
              Village, Town, District or City (Optional)
            </label>
            <input
              type="text"
              value={profileLocation}
              onChange={(e) => setProfileLocation(e.target.value)}
              placeholder="e.g., Anand, Gujarat or Mandya, Karnataka..."
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[#D5D8D2] bg-[#FAF9F5] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#315C4C] font-medium text-[#252A27]"
            />
          </div>

          {/* Save Profile Button */}
          <div className="pt-1 flex items-center justify-between gap-2">
            <button
              type="submit"
              className="bg-[#315C4C] hover:bg-[#25473B] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Local Profile</span>
            </button>

            {profileSuccessMsg && (
              <span className="text-xs font-semibold text-[#315C4C] flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Profile updated!
              </span>
            )}
          </div>
        </form>
      </div>

      {/* 2. LANGUAGE SELECTION CARD */}
      <div className="bg-white border border-[#E3E1D9] rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#E3E1D9] pb-2.5">
          <div className="text-sm font-bold text-[#252A27] flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#315C4C]" />
            <span>{getTranslation(lang, "selectLanguage")}</span>
          </div>
          <span className="text-[11px] font-semibold text-[#315C4C] bg-[#E7EEE9] border border-[#CBD8D0] px-2.5 py-0.5 rounded-full">
            {SUPPORTED_LANGUAGES.length} Indian Languages
          </span>
        </div>

        {/* Search input for languages */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#858B86] absolute left-3.5 top-3" />
          <input
            type="text"
            value={langSearch}
            onChange={(e) => setLangSearch(e.target.value)}
            placeholder="Search language / भाषा खोजें (Hindi, Telugu, Tamil, Marathi...)"
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-[#D5D8D2] bg-[#FAF9F5] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#315C4C] font-medium text-[#252A27]"
          />
        </div>

        {/* Languages Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
          {filteredLanguages.map((l) => {
            const isSelected = settings.language === l.code;
            return (
              <button
                key={l.code}
                onClick={() => onUpdateSettings({ language: l.code })}
                className={`p-3 rounded-xl text-left border transition-colors flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? "bg-[#315C4C] text-white border-[#25473B] shadow-xs font-bold"
                    : "bg-[#FAF9F5] hover:bg-[#F2EFE9] text-[#252A27] border-[#E3E1D9]"
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="text-sm font-bold truncate flex items-center gap-1.5">
                    <span>{l.nativeName}</span>
                    {l.isRtl && (
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                          isSelected ? "bg-white/20 text-white" : "bg-[#FAF9F5] text-[#626963] border border-[#E3E1D9]"
                        }`}
                      >
                        RTL
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-xs truncate font-medium ${
                      isSelected ? "text-white/80" : "text-[#626963]"
                    }`}
                  >
                    {l.name} • <span className="opacity-75">{l.script}</span>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 shrink-0 text-white stroke-[3]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. ACCESSIBILITY & DISPLAY CARD */}
      <div className="bg-white border border-[#E3E1D9] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="text-sm font-bold text-[#252A27] flex items-center gap-2 border-b border-[#E3E1D9] pb-2.5">
          <Eye className="w-4 h-4 text-[#315C4C]" />
          <span>Accessibility & Display Options</span>
        </div>

        {/* Font Size Selection */}
        <div>
          <div className="text-xs font-semibold text-[#252A27] mb-2 flex items-center gap-1.5">
            <Type className="w-4 h-4 text-[#315C4C]" />
            <span>{getTranslation(lang, "fontSizeTitle")}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "normal", label: getTranslation(lang, "fontSizeNormal"), sizeText: "Aa (16px)" },
              { id: "large", label: getTranslation(lang, "fontSizeLarge"), sizeText: "Aa (18px)" },
              { id: "extra-large", label: getTranslation(lang, "fontSizeExtraLarge"), sizeText: "Aa (20px)" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => onUpdateSettings({ fontSize: f.id as any })}
                className={`py-2.5 px-2 rounded-xl border text-center transition-colors cursor-pointer ${
                  settings.fontSize === f.id
                    ? "bg-[#315C4C] text-white border-[#25473B] font-bold shadow-xs"
                    : "bg-[#FAF9F5] text-[#252A27] border-[#E3E1D9] hover:bg-[#F2EFE9] font-medium text-xs"
                }`}
              >
                <div className="text-sm font-bold">{f.sizeText}</div>
                <div className="text-[11px] opacity-90 mt-0.5">{f.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* High Contrast Mode Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E3E1D9]">
          <div className="pr-3">
            <div className="text-xs sm:text-sm font-semibold text-[#252A27] flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-[#C08518]" />
              <span>{getTranslation(lang, "highContrastTitle")}</span>
            </div>
            <div className="text-xs text-[#626963] mt-0.5">
              {getTranslation(lang, "highContrastDesc")}
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.highContrastMode}
            onChange={(e) => onUpdateSettings({ highContrastMode: e.target.checked })}
            className="w-5 h-5 accent-[#315C4C] cursor-pointer rounded shrink-0"
            id="settings-high-contrast-toggle"
          />
        </div>
      </div>

      {/* 4. VOICE NARRATION SETTINGS */}
      <div className="bg-white border border-[#E3E1D9] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="text-sm font-bold text-[#252A27] flex items-center gap-2 border-b border-[#E3E1D9] pb-2.5">
          <Volume2 className="w-4 h-4 text-[#315C4C]" />
          <span>Voice Narration (Text-to-Speech)</span>
        </div>

        {/* TTS Speed Controls */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-[#252A27] mb-2">
            <span>{getTranslation(lang, "ttsSpeed")}</span>
            <span className="text-[#315C4C] font-bold">{settings.ttsVoiceSpeed}x Speed</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Slow (0.8x)", val: 0.8 },
              { label: "Normal (1.0x)", val: 1.0 },
              { label: "Fast (1.2x)", val: 1.2 },
            ].map((spd) => (
              <button
                key={spd.val}
                onClick={() => onUpdateSettings({ ttsVoiceSpeed: spd.val })}
                className={`py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  settings.ttsVoiceSpeed === spd.val
                    ? "bg-[#315C4C] text-white border-[#25473B] shadow-xs"
                    : "bg-[#FAF9F5] text-[#252A27] border-[#E3E1D9] hover:bg-[#F2EFE9]"
                }`}
              >
                {spd.label}
              </button>
            ))}
          </div>
        </div>

        {/* Auto-read results switch */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E3E1D9]">
          <div className="pr-2">
            <div className="text-xs sm:text-sm font-semibold text-[#252A27]">Auto-Read Results Aloud</div>
            <div className="text-xs text-[#626963]">
              Automatically speak screening summary in {SUPPORTED_LANGUAGES.find((l) => l.code === settings.language)?.nativeName}
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.autoSpeakResults}
            onChange={(e) => onUpdateSettings({ autoSpeakResults: e.target.checked })}
            className="w-5 h-5 accent-[#315C4C] cursor-pointer rounded shrink-0"
          />
        </div>
      </div>

      {/* 5. NOTIFICATION & CARE REMINDER SETTINGS */}
      <NotificationSettingsCard
        settings={settings}
        onUpdateSettings={onUpdateSettings}
      />

      {/* 6. PRIVACY & LOCAL DATA GUARANTEE */}
      <div className="bg-white border border-[#E3E1D9] rounded-2xl p-5 shadow-xs space-y-3">
        <div className="text-sm font-bold text-[#252A27] flex items-center gap-2 border-b border-[#E3E1D9] pb-2.5">
          <ShieldCheck className="w-4 h-4 text-[#315C4C]" />
          <span>{getTranslation(lang, "privacyTitle")}</span>
        </div>

        <p className="text-xs text-[#626963] leading-relaxed">
          {getTranslation(lang, "privacyDesc")}
        </p>

        <div className="p-3 bg-[#FAF9F5] border border-[#E3E1D9] rounded-xl text-xs text-[#252A27] font-medium space-y-1">
          <div className="flex items-center gap-2 text-[#315C4C] font-semibold">
            <Check className="w-4 h-4 text-[#315C4C] shrink-0 stroke-[3]" />
            <span>100% Local Device Storage • Zero Remote Cloud Database</span>
          </div>
          <div className="flex items-center gap-2 text-[#626963] pl-6">
            <span>Location coordinates are never stored, logged or tracked.</span>
          </div>
        </div>
      </div>

      {/* 7. APP INFORMATION */}
      <div className="bg-white border border-[#E3E1D9] rounded-2xl p-5 shadow-xs space-y-3.5">
        <div className="text-sm font-bold text-[#252A27] flex items-center justify-between border-b border-[#E3E1D9] pb-2.5">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#315C4C]" />
            <span>App Information</span>
          </div>
        </div>

        <div className="text-xs text-[#626963] space-y-2 leading-relaxed">
          <p>
            <strong className="text-[#252A27]">VetCheck</strong> empowers pet owners, dairy farmers, and rural animal caregivers across India with preliminary AI image screening, safe care firewalls, and life-saving 1962 emergency triage.
          </p>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E3E1D9]">
          <div className="pr-2">
            <div className="text-xs sm:text-sm font-semibold text-[#252A27]">Guided Presentation Mode</div>
            <div className="text-xs text-[#626963]">
              Enlarge key text, high-contrast badges & clear display
            </div>
          </div>
          <input
            type="checkbox"
            checked={!!settings.presentationMode}
            onChange={(e) => onUpdateSettings({ presentationMode: e.target.checked })}
            className="w-5 h-5 accent-[#315C4C] cursor-pointer rounded shrink-0"
          />
        </div>

        <div className="pt-1">
          <button
            onClick={onOpenOnboarding}
            className="w-full bg-[#FAF9F5] hover:bg-[#F2EFE9] border border-[#E3E1D9] text-[#252A27] font-semibold text-xs py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-[#315C4C]" />
            <span>Replay Welcome Tour</span>
          </button>
        </div>
      </div>

      {/* 8. DATA MANAGEMENT & RESET OPTIONS */}
      <div className="bg-[#FFF5F5] border border-[#F0CECE] rounded-2xl p-5 shadow-xs space-y-3">
        <div className="text-xs font-bold text-[#8F3B3B] flex items-center gap-1.5 border-b border-[#F0CECE] pb-2">
          <Trash2 className="w-4 h-4 text-[#8F3B3B]" />
          <span>Data Management & Reset Options</span>
        </div>

        {showClearConfirm ? (
          <div className="p-4 bg-white rounded-xl border border-[#F0CECE] space-y-3">
            <p className="text-xs text-[#8F3B3B] font-semibold">
              {showClearConfirm === "history"
                ? "Are you sure you want to delete all saved screening records?"
                : "Are you sure? This will delete all screening records, clear your profile, and reset all app settings to defaults."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (showClearConfirm === "history") {
                    if (onClearHistoryOnly) onClearHistoryOnly();
                    else onClearAllData();
                  } else {
                    onClearAllData();
                  }
                  setShowClearConfirm(null);
                }}
                className="bg-[#8F3B3B] hover:bg-[#7A2E2E] text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer"
              >
                Yes, Confirm
              </button>
              <button
                onClick={() => setShowClearConfirm(null)}
                className="bg-[#FAF9F5] hover:bg-[#F2EFE9] border border-[#E3E1D9] text-[#252A27] font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => setShowClearConfirm("history")}
              className="bg-white hover:bg-[#FFF0F0] text-[#8F3B3B] border border-[#F0CECE] font-semibold text-xs py-2 px-3 rounded-lg transition-colors cursor-pointer text-center"
            >
              Clear Screening History
            </button>

            <button
              onClick={() => setShowClearConfirm("all")}
              className="bg-[#8F3B3B] hover:bg-[#7A2E2E] text-white font-bold text-xs py-2 px-3 rounded-lg transition-colors cursor-pointer text-center shadow-xs"
            >
              Reset All Data & Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
