import React, { useEffect, useState } from "react";
import { Sparkles, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { getTranslation } from "../data/translations";

interface AnalysisLoadingProps {
  imagePreview: string;
  language: string;
  onCancel?: () => void;
  stage?: "preparing" | "validating" | "analyzing" | "synthesizing" | "complete";
  customStatus?: string | null;
}

export const AnalysisLoading: React.FC<AnalysisLoadingProps> = ({
  imagePreview,
  language,
  onCancel,
  stage = "validating",
  customStatus,
}) => {
  const steps = [
    "Preparing photo...",
    "Checking animal photo...",
    "Analyzing health signs...",
    "Preparing health report...",
  ];

  const getActiveStepIndex = () => {
    switch (stage) {
      case "preparing":
        return 0;
      case "validating":
        return 1;
      case "analyzing":
        return 2;
      case "synthesizing":
      case "complete":
        return 3;
      default:
        return 1;
    }
  };

  const activeStepIndex = getActiveStepIndex();

  const activeStatusText =
    customStatus ||
    steps[activeStepIndex] ||
    "Analyzing health signs...";

  return (
    <div id="analysis-loading-container" className="max-w-md mx-auto py-6 px-4 space-y-6 text-center">
      {/* Scanning Target Image Card */}
      <div className="relative mx-auto w-64 h-64 rounded-3xl overflow-hidden shadow-lg border-4 border-[#154734]/30 bg-stone-900">
        <img
          src={imagePreview}
          alt="Scanning target animal"
          className="w-full h-full object-cover opacity-90"
        />

        {/* Gentle Scanning Laser Bar */}
        <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#f59e0b] animate-bounce duration-1000 top-1/3" />

        {/* Soft Grid Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />

        {/* Floating status pill */}
        <div className="absolute bottom-3 inset-x-3 bg-[#154734]/95 backdrop-blur-md rounded-xl p-2.5 text-white text-xs font-bold flex items-center justify-center gap-2 border border-white/20 shadow-md">
          <Loader2 className="w-4 h-4 text-amber-300 animate-spin shrink-0" />
          <span className="truncate">{activeStatusText}</span>
        </div>
      </div>

      {/* Main Title & Description */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 text-[#154734] border border-emerald-200 text-xs font-black mb-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
          <span>VetCheck Health Screening</span>
        </div>
        <h2 className="text-xl font-black text-slate-900">
          {activeStepIndex <= 1
            ? "Checking Animal Photo..."
            : "Screening Health Signs..."}
        </h2>
        <p className="text-xs text-stone-600 max-w-sm mx-auto mt-1 font-medium">
          {activeStepIndex <= 1
            ? "Verifying animal presence and image clarity before preliminary screening."
            : "Examining visible clinical indicators to prepare your health summary."}
        </p>
      </div>

      {/* Progress Checklist */}
      <div className="bg-white border border-[#E8E2D5] rounded-3xl p-5 shadow-xs text-left space-y-3">
        {steps.map((step, idx) => {
          const isDone = idx < activeStepIndex;
          const isCurrent = idx === activeStepIndex;

          return (
            <div
              key={idx}
              className={`flex items-start gap-2.5 text-xs transition-colors ${
                isDone
                  ? "text-[#154734] font-bold"
                  : isCurrent
                  ? "text-slate-900 font-black"
                  : "text-stone-400 font-medium"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-amber-700 animate-spin" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-stone-300 flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </div>
                )}
              </div>
              <span className="leading-snug text-sm">{step}</span>
            </div>
          );
        })}
      </div>

      {/* Reassurance Note */}
      <div className="bg-[#FAF8F5] border border-[#E8E2D5] rounded-2xl p-3.5 text-xs text-slate-700 flex items-center gap-2.5 text-left font-medium">
        <ShieldCheck className="w-5 h-5 text-[#154734] shrink-0" />
        <span>
          Your report will include immediate care steps and clear guidance on when to see a veterinarian.
        </span>
      </div>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-extrabold text-stone-500 hover:text-stone-800 underline cursor-pointer"
        >
          Cancel
        </button>
      )}
    </div>
  );
};
