import React from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, ShieldAlert, LucideIcon } from "lucide-react";
import { SeverityLevel } from "../../types";

interface SeverityBadgeProps {
  severity: SeverityLevel | string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  size = "md",
  showIcon = true,
  className = "",
}) => {
  const normSev = (severity || "Moderate") as SeverityLevel;

  const config: Record<
    SeverityLevel,
    {
      bg: string;
      text: string;
      border: string;
      icon: LucideIcon;
      symbol: string;
      label: string;
      ariaLabel: string;
    }
  > = {
    Mild: {
      bg: "bg-emerald-50 text-emerald-800",
      text: "text-emerald-800",
      border: "border-emerald-200",
      icon: CheckCircle2,
      symbol: "✓",
      label: "Mild",
      ariaLabel: "Severity Level: Mild. Routine observation recommended.",
    },
    Moderate: {
      bg: "bg-amber-50 text-amber-900",
      text: "text-amber-900",
      border: "border-amber-200",
      icon: AlertCircle,
      symbol: "▲",
      label: "Moderate",
      ariaLabel: "Severity Level: Moderate. Active home care and veterinary monitoring advised.",
    },
    Serious: {
      bg: "bg-orange-50 text-orange-900",
      text: "text-orange-900",
      border: "border-orange-300",
      icon: AlertTriangle,
      symbol: "◆",
      label: "Serious",
      ariaLabel: "Severity Level: Serious. Prompt veterinary examination required.",
    },
    Emergency: {
      bg: "bg-rose-50 text-rose-800 animate-pulse",
      text: "text-rose-800",
      border: "border-rose-300 ring-2 ring-rose-200",
      icon: ShieldAlert,
      symbol: "⚠",
      label: "Emergency",
      ariaLabel: "Severity Level: Urgent Emergency. Immediate veterinary intervention or 1962 hotline needed.",
    },
  };

  const current = config[normSev] || config.Moderate;
  const Icon = current.icon;

  const sizeClasses = {
    sm: "text-[11px] px-2 py-0.5 gap-1 font-bold",
    md: "text-xs px-2.5 py-1 gap-1.5 font-extrabold",
    lg: "text-sm px-3.5 py-1.5 gap-2 font-black",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${current.bg} ${current.border} ${sizeClasses[size]} ${className} shrink-0 select-none`}
      role="status"
      aria-label={current.ariaLabel}
    >
      {showIcon && (
        <span className="shrink-0 flex items-center justify-center">
          <Icon className={`${iconSizes[size]} shrink-0`} aria-hidden="true" />
        </span>
      )}
      <span className="tracking-tight">{current.label}</span>
      <span className="opacity-60 text-[10px] ml-0.5" aria-hidden="true">
        [{current.symbol}]
      </span>
    </span>
  );
};
