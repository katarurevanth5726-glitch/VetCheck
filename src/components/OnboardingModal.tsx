import React, { useState, useEffect } from "react";
import {
  Camera,
  HeartPulse,
  Globe,
  Sliders,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Volume2,
  Eye,
  Award,
} from "lucide-react";
import { VetCheckLogo } from "./ui/VetCheckLogo";
import { Button } from "./ui/Button";
import { SUPPORTED_LANGUAGES } from "../data/translations";
import { UserSettings } from "../types";
import { useModalHistory } from "../utils/useModalHistory";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
  onSelectLanguage: (code: string) => void;
  settings?: UserSettings;
  onUpdateSettings?: (newPartial: Partial<UserSettings>) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  language,
  onSelectLanguage,
  settings,
  onUpdateSettings,
}) => {
  useModalHistory({
    isOpen,
    onClose,
    modalKey: "onboarding",
  });

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const slides = [
    {
      title: "Capture or upload an animal image.",
      subtitle:
        "Take clear photos of visible skin patches, eyes, limbs, or wounds in daylight. Multi-angle uploads help veterinary visual triage.",
      icon: Camera,
      iconBg: "bg-teal-600",
      accent: "text-teal-700",
      bgLight: "bg-teal-50/70 border-teal-200",
      features: [
        "Natural daylight or steady torch lighting",
        "Close-up of the affected area + full animal posture",
        "Safe handling with no forced restraint",
      ],
    },
    {
      title: "Receive preliminary AI-based screening and safe guidance.",
      subtitle:
        "Instant visual triage categorizes severity (Mild, Moderate, Serious, Emergency) with safe first-aid protocols and a strict 'What NOT to do' firewall.",
      icon: HeartPulse,
      iconBg: "bg-emerald-600",
      accent: "text-emerald-700",
      bgLight: "bg-emerald-50/70 border-emerald-200",
      features: [
        "Preliminary AI screening & visible abnormality inspection",
        "Emergency alerts & direct 1962 veterinary helpline",
        "Shareable private veterinary summary report",
      ],
    },
    {
      title: "Use your preferred language, voice assistance and high contrast.",
      subtitle:
        "Access VetCheck in 10+ Indian regional languages with spoken voice narration, high-contrast support, and uncluttered rural-first layout.",
      icon: Globe,
      iconBg: "bg-teal-800",
      accent: "text-teal-900",
      bgLight: "bg-teal-50/70 border-teal-200",
      features: [
        "10+ Indian regional languages (Hindi, Telugu, Tamil, Marathi...)",
        "Voice input for vernacular symptoms + audio playback",
        "High-contrast display mode for field clarity",
      ],
    },
  ];

  const current = slides[currentSlide];
  const Icon = current.icon;

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Top Header with Brand */}
        <div className="bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-700 text-white p-5 text-center shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-white/15 text-teal-100 px-2.5 py-0.5 rounded-full backdrop-blur-xs border border-white/20">
              <Award className="w-3 h-3 text-emerald-300" />
              <span>Smart India Hackathon • HealthTech</span>
            </div>

            <button
              onClick={onClose}
              className="text-xs font-bold text-teal-100/80 hover:text-white underline cursor-pointer"
            >
              Skip
            </button>
          </div>

          <div className="flex justify-center mb-2">
            <VetCheckLogo size="md" textColor="text-white" showText={true} />
          </div>
          <p className="text-xs text-teal-100 font-medium">
            See the signs. Support them sooner.
          </p>
        </div>

        {/* Slide Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Slide Indicator */}
          <div className="flex items-center justify-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  currentSlide === idx ? "w-8 bg-teal-700" : "w-2 bg-slate-200 hover:bg-slate-300"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Slide Card */}
          <div className={`p-4 rounded-2xl border ${current.bgLight} transition-all duration-200`}>
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 rounded-2xl ${current.iconBg} text-white flex items-center justify-center shadow-xs shrink-0`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Step {currentSlide + 1} of 3
              </div>
            </div>

            <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug mb-1.5">
              “{current.title}”
            </h2>

            <p className="text-xs text-slate-600 leading-relaxed font-medium mb-3">
              {current.subtitle}
            </p>

            <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
              {current.features.map((feat, fIdx) => (
                <div key={fIdx} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Slide 3 Controls: Language & Accessibility Shortcuts */}
          {currentSlide === 2 && (
            <div className="space-y-3 pt-1">
              {/* Quick Language Selector */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                <label htmlFor="onboarding-lang-select" className="text-xs font-bold text-slate-900 block mb-1.5">
                  Select Preferred Language (भाषा चुनें):
                </label>
                <select
                  id="onboarding-lang-select"
                  value={language}
                  onChange={(e) => onSelectLanguage(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-teal-600"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.nativeName} ({l.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Accessibility Shortcuts */}
              {onUpdateSettings && (
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-2">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-teal-700" />
                    <span>Accessibility Shortcuts</span>
                  </div>

                  <div>
                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer">
                      <span>High Contrast Mode</span>
                      <input
                        type="checkbox"
                        checked={!!settings?.highContrastMode}
                        onChange={(e) => onUpdateSettings({ highContrastMode: e.target.checked })}
                        className="w-4 h-4 accent-teal-600 rounded"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Navigation Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 shrink-0 flex items-center justify-between gap-3">
          {currentSlide > 0 ? (
            <Button
              variant="outline"
              size="sm"
              icon={<ChevronLeft className="w-4 h-4" />}
              onClick={handlePrev}
            >
              Previous
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Skip Tour
            </Button>
          )}

          {currentSlide < slides.length - 1 ? (
            <Button
              variant="primary"
              size="sm"
              icon={<ChevronRight className="w-4 h-4" />}
              iconPosition="right"
              onClick={handleNext}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              icon={<CheckCircle2 className="w-4 h-4" />}
              iconPosition="right"
              onClick={onClose}
            >
              Get Started
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
