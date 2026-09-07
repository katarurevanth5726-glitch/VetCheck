import React, { useState, useEffect } from "react";
import {
  Bell,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Syringe,
  Pill,
  Stethoscope,
  Camera,
  Globe,
  Download,
} from "lucide-react";
import { UserSettings } from "../types";
import {
  checkPushNotificationSupport,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  sendTestPushNotification,
  getStoredNotificationCategories,
  saveStoredNotificationCategories,
  PushCategorySettings,
  DEFAULT_NOTIFICATION_CATEGORIES,
} from "../utils/pushManager";

interface NotificationSettingsCardProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
}

const COMMON_TIMEZONES = [
  { label: "India Standard Time (IST) - UTC+05:30", value: "Asia/Kolkata" },
  { label: "Gulf Standard Time (GST) - UTC+04:00", value: "Asia/Dubai" },
  { label: "Bangladesh Time (BST) - UTC+06:00", value: "Asia/Dhaka" },
  { label: "Pakistan Standard Time (PKT) - UTC+05:00", value: "Asia/Karachi" },
  { label: "Singapore / Malaysia (SGT) - UTC+08:00", value: "Asia/Singapore" },
  { label: "United Kingdom (GMT/BST) - London", value: "Europe/London" },
  { label: "US Eastern (EST/EDT) - New York", value: "America/New_York" },
  { label: "US Pacific (PST/PDT) - Los Angeles", value: "America/Los_Angeles" },
  { label: "Universal Coordinated Time (UTC)", value: "UTC" },
];

export const NotificationSettingsCard: React.FC<NotificationSettingsCardProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [supportState, setSupportState] = useState(checkPushNotificationSupport());
  const [categories, setCategories] = useState<PushCategorySettings>(() => {
    return settings.notificationCategories || getStoredNotificationCategories();
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const currentTimezone =
    settings.userTimezone ||
    (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Asia/Kolkata") ||
    "Asia/Kolkata";

  useEffect(() => {
    setSupportState(checkPushNotificationSupport());

    // Listen for PWA install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Check if already in standalone mode
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleToggleMaster = async (enabled: boolean) => {
    const newCategories = { ...categories, careReminders: enabled };
    setCategories(newCategories);
    saveStoredNotificationCategories(newCategories);
    onUpdateSettings({
      notificationsEnabled: enabled,
      notificationCategories: newCategories,
    });

    if (enabled) {
      if (supportState.permission !== "granted") {
        setIsProcessing(true);
        const res = await subscribeToPushNotifications({
          userId: settings.userProfile?.name,
          categories: newCategories,
          language: settings.language,
          timezone: currentTimezone,
        });
        setIsProcessing(false);
        setSupportState(checkPushNotificationSupport());
      }
    } else {
      await unsubscribeFromPushNotifications();
      setSupportState(checkPushNotificationSupport());
    }
  };

  const handleToggleCategory = (categoryKey: keyof PushCategorySettings, value: boolean) => {
    const newCategories = { ...categories, [categoryKey]: value };
    setCategories(newCategories);
    saveStoredNotificationCategories(newCategories);
    onUpdateSettings({
      notificationCategories: newCategories,
    });
  };

  const handleEnablePush = async () => {
    setIsProcessing(true);
    setTestResult(null);

    const res = await subscribeToPushNotifications({
      userId: settings.userProfile?.name,
      categories: categories,
      language: settings.language,
      timezone: currentTimezone,
    });

    setIsProcessing(false);
    setSupportState(checkPushNotificationSupport());

    if (res.success) {
      onUpdateSettings({ notificationsEnabled: true });
      setTestResult({
        success: true,
        message: "Background push notifications enabled successfully! Reminders will arrive even when closed.",
      });
    } else {
      setTestResult({
        success: false,
        message: res.error || "Could not enable push notifications. Check browser permissions.",
      });
    }
  };

  const handleSendTestPush = async () => {
    setIsProcessing(true);
    setTestResult(null);

    const res = await sendTestPushNotification("Rocky (Dog)", "vaccination", settings.language);
    setIsProcessing(false);
    setTestResult(res);
  };

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert("To install VetCheck: Tap your browser's menu (⋮ or Share) and select 'Add to Home Screen' or 'Install App'.");
    }
  };

  return (
    <div id="settings-notifications-card" className="bg-white border border-[#E3E1D9] rounded-2xl p-5 shadow-xs space-y-4">
      {/* Header & Status */}
      <div className="flex items-start justify-between border-b border-[#E3E1D9] pb-3 gap-2">
        <div>
          <div className="text-sm font-bold text-[#252A27] flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#315C4C]" />
            <span>Care & Background Notifications</span>
          </div>
          <p className="text-xs text-[#626963] mt-0.5">
            Receive timely vaccination, deworming and vet follow-up alerts when VetCheck is closed
          </p>
        </div>

        {/* Status Badge */}
        <div>
          {supportState.permission === "granted" && categories.careReminders ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold bg-[#E7EEE9] text-[#315C4C] border border-[#CBD8D0]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#315C4C] animate-pulse"></span>
              <span>Push Active</span>
            </span>
          ) : supportState.permission === "denied" ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold bg-[#FFF5F5] text-[#8F3B3B] border border-[#F0CECE]">
              <BellOff className="w-3 h-3" />
              <span>Blocked</span>
            </span>
          ) : !supportState.isSupported ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-semibold bg-[#FAF9F5] text-[#626963] border border-[#E3E1D9]">
              <span>In-App Only</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-semibold bg-[#FAF9F5] text-[#858B86] border border-[#E3E1D9]">
              <span>Not Configured</span>
            </span>
          )}
        </div>
      </div>

      {/* Permission Advisories */}
      {supportState.permission === "denied" && (
        <div className="p-3.5 bg-[#FAF9F5] border border-[#E3E1D9] rounded-xl text-xs text-[#252A27] space-y-2">
          <div className="flex items-center gap-2 font-bold text-[#8F3B3B]">
            <AlertTriangle className="w-4 h-4 text-[#8F3B3B] shrink-0" />
            <span>Notifications are currently turned off in your browser</span>
          </div>
          <p className="text-2xs text-[#626963] leading-relaxed">
            Your reminders will still appear as active cards when you open VetCheck. To receive background alerts when closed, allow notifications in your browser's site settings.
          </p>
        </div>
      )}

      {!supportState.isSupported && (
        <div className="p-3.5 bg-[#FAF9F5] border border-[#E3E1D9] rounded-xl text-xs text-[#252A27] space-y-1">
          <p className="font-semibold text-[#252A27]">Platform Capability Notice:</p>
          <p className="text-2xs text-[#626963] leading-relaxed">
            Background notifications are not supported on this device or preview iframe. Your reminders will still appear as due and overdue alerts when VetCheck is opened.
          </p>
        </div>
      )}

      {/* 1. Master Care Reminders Toggle */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E3E1D9]">
        <div className="pr-2">
          <div className="text-xs sm:text-sm font-bold text-[#252A27] flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-[#315C4C]" />
            <span>Care Reminders (Master Toggle)</span>
          </div>
          <div className="text-2xs text-[#626963] font-medium mt-0.5">
            Enable all automated animal health, vaccination, and follow-up notifications
          </div>
        </div>
        <input
          type="checkbox"
          checked={categories.careReminders}
          onChange={(e) => handleToggleMaster(e.target.checked)}
          className="w-5 h-5 accent-[#315C4C] cursor-pointer rounded shrink-0"
        />
      </div>

      {/* 2. Specific Category Controls */}
      <div className="space-y-2 pt-1">
        <div className="text-2xs font-bold uppercase tracking-wider text-[#858B86]">
          Reminder Categories
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Vaccination */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF9F5] border border-[#E3E1D9]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#E7EEE9] text-[#315C4C] flex items-center justify-center shrink-0">
                <Syringe className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#252A27]">💉 Vaccination</div>
                <div className="text-3xs text-[#626963]">Booster & annual shots</div>
              </div>
            </div>
            <input
              type="checkbox"
              disabled={!categories.careReminders}
              checked={categories.vaccination}
              onChange={(e) => handleToggleCategory("vaccination", e.target.checked)}
              className="w-4 h-4 accent-[#315C4C] cursor-pointer rounded disabled:opacity-40"
            />
          </div>

          {/* Deworming */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF9F5] border border-[#E3E1D9]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#E7EEE9] text-[#315C4C] flex items-center justify-center shrink-0">
                <Pill className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#252A27]">💊 Deworming</div>
                <div className="text-3xs text-[#626963]">Quarterly medicine cycles</div>
              </div>
            </div>
            <input
              type="checkbox"
              disabled={!categories.careReminders}
              checked={categories.deworming}
              onChange={(e) => handleToggleCategory("deworming", e.target.checked)}
              className="w-4 h-4 accent-[#315C4C] cursor-pointer rounded disabled:opacity-40"
            />
          </div>

          {/* Vet Follow-Up */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF9F5] border border-[#E3E1D9]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#E7EEE9] text-[#315C4C] flex items-center justify-center shrink-0">
                <Stethoscope className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#252A27]">🩺 Vet Follow-Up</div>
                <div className="text-3xs text-[#626963]">Post-treatment checkups</div>
              </div>
            </div>
            <input
              type="checkbox"
              disabled={!categories.careReminders}
              checked={categories.vetFollowUp}
              onChange={(e) => handleToggleCategory("vetFollowUp", e.target.checked)}
              className="w-4 h-4 accent-[#315C4C] cursor-pointer rounded disabled:opacity-40"
            />
          </div>

          {/* Recovery Photo Check */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF9F5] border border-[#E3E1D9]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#E7EEE9] text-[#315C4C] flex items-center justify-center shrink-0">
                <Camera className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#252A27]">📷 Recovery Check</div>
                <div className="text-3xs text-[#626963]">Add progress photos</div>
              </div>
            </div>
            <input
              type="checkbox"
              disabled={!categories.careReminders}
              checked={categories.recovery}
              onChange={(e) => handleToggleCategory("recovery", e.target.checked)}
              className="w-4 h-4 accent-[#315C4C] cursor-pointer rounded disabled:opacity-40"
            />
          </div>
        </div>
      </div>

      {/* 3. Timezone Setting */}
      <div className="space-y-1.5 pt-1">
        <label className="text-xs font-semibold text-[#252A27] flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-[#315C4C]" />
          <span>Reminder Timezone</span>
        </label>
        <select
          value={currentTimezone}
          onChange={(e) => onUpdateSettings({ userTimezone: e.target.value })}
          className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-[#D5D8D2] bg-[#FAF9F5] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#315C4C] text-[#252A27]"
        >
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
          {!COMMON_TIMEZONES.some((t) => t.value === currentTimezone) && (
            <option value={currentTimezone}>{currentTimezone} (Detected)</option>
          )}
        </select>
        <p className="text-3xs text-[#858B86]">
          Reminders are scheduled accurately to your local morning & afternoon times.
        </p>
      </div>

      {/* 4. Action Buttons: Enable / Test Push */}
      <div className="pt-2 flex flex-wrap items-center gap-2">
        {supportState.isSupported && supportState.permission !== "granted" && (
          <button
            type="button"
            onClick={handleEnablePush}
            disabled={isProcessing}
            className="px-4 py-2 bg-[#315C4C] hover:bg-[#25473B] text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Enable Background Notifications</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleSendTestPush}
          disabled={isProcessing}
          className="px-4 py-2 bg-[#FAF9F5] hover:bg-[#F2EFE9] border border-[#E3E1D9] text-[#252A27] rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60"
        >
          {isProcessing ? (
            <span className="w-3.5 h-3.5 border-2 border-[#315C4C] border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <Send className="w-3.5 h-3.5 text-[#315C4C]" />
          )}
          <span>Send Test Background Notification</span>
        </button>

        {!isInstalled && (
          <button
            type="button"
            onClick={handleInstallPwa}
            className="px-4 py-2 bg-[#E7EEE9] hover:bg-[#D5E2D9] text-[#315C4C] border border-[#CBD8D0] rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#315C4C]" />
            <span>Install VetCheck App</span>
          </button>
        )}
      </div>

      {/* Test feedback toast */}
      {testResult && (
        <div
          className={`p-3 rounded-xl text-xs font-medium border flex items-start gap-2 ${
            testResult.success
              ? "bg-[#FAF9F5] text-[#315C4C] border-[#CBD8D0]"
              : "bg-[#FFF5F5] text-[#8F3B3B] border-[#F0CECE]"
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 text-[#315C4C] shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-[#8F3B3B] shrink-0 mt-0.5" />
          )}
          <span>{testResult.message}</span>
        </div>
      )}
    </div>
  );
};
