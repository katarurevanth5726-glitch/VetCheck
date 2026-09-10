import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Award,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  ShieldCheck,
  Globe,
  Camera,
  MapPin,
  TrendingUp,
  Cpu,
  Layers,
  HeartHandshake,
  Users,
} from "lucide-react";
import { NavTab } from "../types";
import { useModalHistory } from "../utils/useModalHistory";

interface GuidedDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchDemoCase: (caseId: string) => void;
  onNavigateTab: (tab: NavTab) => void;
  onLoadDemoData: () => void;
}

export const GuidedDemoModal: React.FC<GuidedDemoModalProps> = ({
  isOpen,
  onClose,
  onLaunchDemoCase,
  onNavigateTab,
  onLoadDemoData,
}) => {
  useModalHistory({
    isOpen,
    onClose,
    modalKey: "guided_demo",
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

  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: "Smart India Hackathon Pitch: The Challenge",
      badge: "Problem Context",
      icon: AlertTriangle,
      color: "from-amber-600 to-orange-700",
      content: (
        <div className="space-y-4 text-slate-700 text-sm">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <h4 className="font-bold text-amber-950 flex items-center gap-2 mb-1.5">
              <span>🌾 Rural Livestock Care Crisis in India</span>
            </h4>
            <p className="text-xs text-amber-900 leading-relaxed">
              In rural India, there is only <strong>1 veterinarian for every 5,000+ livestock animals</strong>. Smallholder farmers often wait days for medical assistance, leading to undetected infections, milk yield collapse, or reliance on unsafe home remedies (like engine oil or salt burns).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-teal-600" />
                Target Beneficiaries
              </div>
              <p className="text-slate-600">Dairy farmers, rural goat/sheep rearers, poultry caregivers, and urban pet parents.</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-teal-600" />
                Language & Literacy Barriers
              </div>
              <p className="text-slate-600">Guidance must be available in regional languages with voice synthesis and audio playback.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Our Solution: Multimodal AI Animal Triage",
      badge: "Core Innovation",
      icon: Sparkles,
      color: "from-teal-600 to-emerald-700",
      content: (
        <div className="space-y-4 text-slate-700 text-sm">
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            <strong>VetCheck</strong> is an AI-powered preliminary triage tool that analyzes photos and symptoms of animals to provide instant, safe immediate care guidance, emergency escalation, and localized prevention.
          </p>

          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-3 p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900">
              <Camera className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <strong>1. Multimodal AI Image Quality Triage:</strong> Inspects lighting, focus, animal species, and affected areas before returning explainable insights.
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <strong>2. Safe Care Protocol Firewall:</strong> Clear "Do's and Don'ts" that specifically ban harmful home chemicals and restricted drugs.
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900">
              <Globe className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <strong>3. 10+ Indian Regional Languages:</strong> Full UI, voice input, and Text-to-Speech playback for rural accessibility.
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Explore Curated Live Demo Scenarios",
      badge: "Interactive Cases",
      icon: Stethoscope,
      color: "from-blue-600 to-indigo-700",
      content: (
        <div className="space-y-3 text-slate-700 text-sm">
          <p className="text-xs text-slate-600">
            Click any scenario to jump directly into the detailed AI screening report:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => {
                onLoadDemoData();
                onLaunchDemoCase("demo-cow-1");
                onClose();
              }}
              className="p-3 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between group"
            >
              <div>
                <span className="font-bold text-slate-900 block group-hover:text-teal-800">🐄 Indigenous Cow: Pinkeye</span>
                <span className="text-[11px] text-amber-700 font-medium">Moderate Severity • Saline Care</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
            </button>

            <button
              onClick={() => {
                onLoadDemoData();
                onLaunchDemoCase("demo-buffalo-3");
                onClose();
              }}
              className="p-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between group"
            >
              <div>
                <span className="font-bold text-rose-950 block group-hover:text-rose-800">🐃 Dairy Buffalo: Acute Bloat</span>
                <span className="text-[11px] text-rose-700 font-bold">EMERGENCY • 1962 SOS Triggered</span>
              </div>
              <ArrowRight className="w-4 h-4 text-rose-400 group-hover:text-rose-600" />
            </button>

            <button
              onClick={() => {
                onLoadDemoData();
                onLaunchDemoCase("demo-dog-2");
                onClose();
              }}
              className="p-3 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between group"
            >
              <div>
                <span className="font-bold text-slate-900 block group-hover:text-teal-800">🐕 Indie Dog: Skin Mange</span>
                <span className="text-[11px] text-teal-700 font-medium">Moderate • Bedding & Isolation</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
            </button>

            <button
              onClick={() => {
                onLoadDemoData();
                onLaunchDemoCase("demo-goat-4");
                onClose();
              }}
              className="p-3 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between group"
            >
              <div>
                <span className="font-bold text-slate-900 block group-hover:text-teal-800">🐐 Osmanabadi Goat: Orf Scabs</span>
                <span className="text-[11px] text-orange-700 font-medium">Serious • Zoonotic Protection</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
            </button>
          </div>
        </div>
      ),
    },
    {
      title: "Privacy, Architecture & Future Scaling",
      badge: "Tech & Vision",
      icon: Cpu,
      color: "from-emerald-700 to-teal-900",
      content: (
        <div className="space-y-4 text-slate-700 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <h5 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Zero Cloud Tracking
              </h5>
              <p className="text-slate-600">All screening history and user notes reside 100% on the user's device in localStorage.</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <h5 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                National Scale Vision
              </h5>
              <p className="text-slate-600">Phase 2 connects with NDDB Pashu Sakhi field workers and tele-veterinary helplines.</p>
            </div>
          </div>

          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900">
            <strong>Ready to present:</strong> Switch on <strong>Presentation Mode</strong> from Settings for high-visibility display.
          </div>
        </div>
      ),
    },
  ];

  const current = steps[currentStep];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with step gradient */}
        <div className={`p-5 sm:p-6 bg-gradient-to-r ${current.color} text-white flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider font-extrabold bg-white/20 px-2 py-0.5 rounded-full">
                  {current.badge}
                </span>
                <span className="text-xs text-white/80 font-medium">
                  Step {currentStep + 1} of {steps.length}
                </span>
              </div>
              <h3 className="text-lg font-black leading-snug mt-0.5">{current.title}</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div className="flex px-6 pt-4 gap-1.5">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`h-1.5 flex-1 rounded-full transition-all cursor-pointer ${
                idx === currentStep
                  ? "bg-teal-600"
                  : idx < currentStep
                  ? "bg-teal-300"
                  : "bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1">{current.content}</div>

        {/* Footer Navigation */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              currentStep === 0
                ? "text-slate-300 cursor-not-allowed"
                : "text-slate-700 bg-white border border-slate-200 hover:bg-slate-100"
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Previous
          </button>

          <div className="flex items-center gap-2">
            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-teal-200"
              >
                Next Step
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => {
                  onNavigateTab("home");
                  onClose();
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-200"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Finish & Start Exploring
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
