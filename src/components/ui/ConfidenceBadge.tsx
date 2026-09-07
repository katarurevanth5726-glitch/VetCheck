import React from "react";
import { ConfidenceLevel } from "../../types";

interface ConfidenceBadgeProps {
  confidence: ConfidenceLevel | string;
  size?: "sm" | "md";
  className?: string;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  confidence,
  size = "sm",
  className = "",
}) => {
  const normConf = (confidence || "Medium") as ConfidenceLevel;

  const styleMap: Record<ConfidenceLevel, { bg: string; text: string; border: string; dots: number }> = {
    High: {
      bg: "bg-teal-50",
      text: "text-teal-800 font-bold",
      border: "border-teal-200",
      dots: 3,
    },
    Medium: {
      bg: "bg-slate-100",
      text: "text-slate-700 font-bold",
      border: "border-slate-300",
      dots: 2,
    },
    Low: {
      bg: "bg-amber-50",
      text: "text-amber-800 font-medium",
      border: "border-amber-200",
      dots: 1,
    },
  };

  const current = styleMap[normConf] || styleMap.Medium;
  const sizeClasses = size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${current.bg} ${current.text} ${current.border} ${sizeClasses} ${className} select-none`}
      title={`AI Visual Confidence: ${normConf}`}
      aria-label={`AI Visual Confidence: ${normConf}`}
    >
      <span className="flex items-center gap-0.5" aria-hidden="true">
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        <span className={`w-1.5 h-1.5 rounded-full ${current.dots >= 2 ? "bg-current" : "bg-slate-300"}`} />
        <span className={`w-1.5 h-1.5 rounded-full ${current.dots >= 3 ? "bg-current" : "bg-slate-300"}`} />
      </span>
      <span>{normConf} Match</span>
    </span>
  );
};
