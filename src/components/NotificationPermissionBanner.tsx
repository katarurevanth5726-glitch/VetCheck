import React, { useState, useEffect } from "react";
import {
  Bell,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import {
  checkPushNotificationSupport,
  subscribeToPushNotifications,
  isPushPromptDismissed,
  setPushPromptDismissed,
} from "../utils/pushManager";
import { UserSettings } from "../types";
import { getTranslation } from "../data/translations";

interface NotificationPermissionBannerProps {
  settings: UserSettings;
  onPermissionChanged?: (granted: boolean) => void;
  forceShow?: boolean;
  onClose?: () => void;
}

export const NotificationPermissionBanner: React.FC<NotificationPermissionBannerProps> = ({
  settings,
  onPermissionChanged,
  forceShow = false,
  onClose,
}) => {
  const [supportState, setSupportState] = useState(checkPushNotificationSupport());
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [justGranted, setJustGranted] = useState(false);
  const [isDismissed, setIsDismissed] = useState(isPushPromptDismissed());

  const lang = settings.language || "en";

  useEffect(() => {
    setSupportState(checkPushNotificationSupport());
  }, []);

  if (!forceShow && isDismissed) {
    return null;
  }

  if (supportState.permission === "granted" && !forceShow && !justGranted) {
    return null;
  }

  const handleAllowNotifications = async () => {
    setIsSubscribing(true);
    setErrorMsg(null);

    const result = await subscribeToPushNotifications({
      userId: settings.userProfile?.name || "user-default",
      language: settings.language,
      timezone: settings.userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    setIsSubscribing(false);

    if (result.success) {
      setJustGranted(true);
      setSupportState(checkPushNotificationSupport());
      if (onPermissionChanged) onPermissionChanged(true);
      setTimeout(() => {
        if (onClose) onClose();
      }, 2500);
    } else {
      if (result.permission === "denied") {
        setErrorMsg("Notification permission was denied in browser settings. You can re-enable it in browser site settings.");
      } else if (result.error) {
        setErrorMsg(result.error);
      }
      setSupportState(checkPushNotificationSupport());
      if (onPermissionChanged) onPermissionChanged(false);
    }
  };

  const handleDismiss = () => {
    setPushPromptDismissed(true);
    setIsDismissed(true);
    if (onClose) onClose();
  };

  // Success state
  if (justGranted) {
    return (
      <div
        id="notification-permission-granted"
        className="bg-emerald-50 border-2 border-emerald-400/80 rounded-3xl p-4 sm:p-5 shadow-xs text-emerald-950 flex items-center gap-3.5 animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-extrabold text-sm text-emerald-900">
            Background Reminders Active!
          </h4>
          <p className="text-xs text-emerald-800 mt-0.5">
            VetCheck will notify your device on time for vaccinations, deworming, and vet checkups—even when the app is closed.
          </p>
        </div>
      </div>
    );
  }

  // Unsupported state
  if (!supportState.isSupported) {
    if (!forceShow) return null;
    return (
      <div
        id="notification-permission-unsupported"
        className="bg-stone-50 border border-stone-200 rounded-3xl p-4 sm:p-5 shadow-2xs text-stone-800 space-y-2"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 font-extrabold text-stone-800 text-sm">
            <BellOff className="w-4 h-4 text-stone-500 shrink-0" />
            <span>Background Notifications</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-xs text-stone-600 leading-relaxed">
          Background notifications are not supported on this device or preview iframe. Your reminders will still appear as active cards and overdue alerts when VetCheck is opened.
        </p>
      </div>
    );
  }

  // Denied state
  if (supportState.permission === "denied") {
    if (!forceShow) return null;
    return (
      <div
        id="notification-permission-denied"
        className="bg-amber-50 border border-amber-300 rounded-3xl p-4 sm:p-5 shadow-xs text-amber-950 space-y-2.5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 font-black text-amber-900 text-sm">
            <BellOff className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Notifications are currently turned off</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-amber-500 hover:text-amber-800 p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-xs text-amber-900 leading-relaxed">
          To receive vaccination, deworming and vet follow-up alerts when VetCheck is closed:
        </p>
        <div className="bg-white/80 p-3 rounded-2xl border border-amber-200 text-xs text-stone-700 space-y-1">
          <p className="font-semibold text-stone-900">How to re-enable:</p>
          <p>1. Tap the lock/tune icon 🔒 in your browser address bar.</p>
          <p>2. Select <strong>Site settings / Permissions</strong>.</p>
          <p>3. Set <strong>Notifications</strong> to <strong>Allow</strong>, then refresh.</p>
        </div>
      </div>
    );
  }

  // Contextual Permission Request Banner
  return (
    <div
      id="notification-permission-prompt"
      className="bg-gradient-to-br from-[#154734]/5 via-emerald-50/70 to-teal-50/50 border-2 border-emerald-600/30 rounded-3xl p-4 sm:p-5 shadow-xs text-slate-900 space-y-3.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#154734] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Bell className="w-5 h-5 text-amber-300 animate-pulse" />
          </div>
          <div>
            <h4 className="font-black text-sm text-[#154734] flex items-center gap-1.5">
              <span>🔔 Get Care Reminders</span>
            </h4>
            <p className="text-xs text-stone-600 font-medium mt-0.5">
              Allow VetCheck to notify you when vaccinations, deworming or vet visits are due.
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-stone-400 hover:text-stone-700 p-1 rounded-md cursor-pointer transition-colors"
          title="Not now"
          aria-label="Close notification prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        <div className="bg-white/90 border border-emerald-100 rounded-xl p-2 text-center text-2xs text-stone-700 font-bold flex flex-col items-center gap-1">
          <span>💉 Vaccination</span>
          <span className="text-3xs text-emerald-700 font-medium">Due dates & boosters</span>
        </div>
        <div className="bg-white/90 border border-emerald-100 rounded-xl p-2 text-center text-2xs text-stone-700 font-bold flex flex-col items-center gap-1">
          <span>💊 Deworming</span>
          <span className="text-3xs text-emerald-700 font-medium">Quarterly cycles</span>
        </div>
        <div className="bg-white/90 border border-emerald-100 rounded-xl p-2 text-center text-2xs text-stone-700 font-bold flex flex-col items-center gap-1">
          <span>🩺 Vet Visits</span>
          <span className="text-3xs text-emerald-700 font-medium">Follow-up checkups</span>
        </div>
        <div className="bg-white/90 border border-emerald-100 rounded-xl p-2 text-center text-2xs text-stone-700 font-bold flex flex-col items-center gap-1">
          <span>📷 Recovery</span>
          <span className="text-3xs text-emerald-700 font-medium">Progress check photos</span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-2.5 pt-1">
        <button
          type="button"
          onClick={handleDismiss}
          className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-100 border border-stone-200 rounded-xl transition-all cursor-pointer min-h-[38px]"
        >
          Not Now
        </button>
        <button
          type="button"
          onClick={handleAllowNotifications}
          disabled={isSubscribing}
          className="px-4 py-2 text-xs font-extrabold text-white bg-[#154734] hover:bg-[#103828] rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer min-h-[38px] disabled:opacity-60"
        >
          {isSubscribing ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Enabling...</span>
            </>
          ) : (
            <>
              <Bell className="w-3.5 h-3.5 text-amber-300" />
              <span>Allow Notifications</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
