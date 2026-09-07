import React, { useEffect, useState } from "react";
import { VetCheckLogo } from "./ui/VetCheckLogo";

interface SplashScreenProps {
  onDismiss: () => void;
  minDurationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onDismiss,
  minDurationMs = 1200,
}) => {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // Check user preference for reduced motion
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const duration = prefersReducedMotion ? 400 : minDurationMs;

    const timer = setTimeout(() => {
      setFadingOut(true);
      setTimeout(onDismiss, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [onDismiss, minDurationMs]);

  const handleSkip = () => {
    setFadingOut(true);
    setTimeout(onDismiss, 100);
  };

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-teal-950 to-slate-950 text-white p-6 transition-opacity duration-300 cursor-pointer select-none ${
        fadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      role="dialog"
      aria-label="VetCheck Splash Screen"
    >
      <div className="flex flex-col items-center text-center max-w-sm w-full animate-in fade-in zoom-in-95 duration-300">
        {/* Animated Brand Logo */}
        <div className="mb-6 relative">
          <VetCheckLogo size="2xl" isScanning={true} />
        </div>

        {/* Brand Typography */}
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight flex items-center justify-center gap-1">
          <span className="text-white">Vet</span>
          <span className="text-emerald-400">Check</span>
        </h1>

        <p className="text-sm sm:text-base text-teal-200/90 font-medium tracking-tight mt-2 max-w-xs">
          See the signs. Support them sooner.
        </p>

        {/* SIH Innovation Badge */}
        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold text-teal-300 backdrop-blur-xs">
          <span>Smart India Hackathon</span>
          <span>•</span>
          <span className="text-emerald-300">HealthTech Triage</span>
        </div>

        {/* Lightweight loading indicator */}
        <div className="mt-8 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 rounded-full bg-emerald-300 animate-bounce" />
        </div>

        <p className="text-[11px] text-teal-300/60 mt-4">
          Tap anywhere to start
        </p>
      </div>
    </div>
  );
};
