import React from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "outline" | "ghost" | "amber";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  loading = false,
  fullWidth = false,
  children,
  className = "",
  disabled,
  ...props
}) => {
  const baseClasses =
    "inline-flex items-center justify-center font-bold rounded-2xl transition-all duration-150 active:scale-[0.98] focus:outline-hidden focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer select-none";

  const sizeClasses = {
    xs: "text-[11px] px-2.5 py-1.5 gap-1.5",
    sm: "text-xs px-3.5 py-2 gap-2",
    md: "text-sm px-4.5 py-2.5 gap-2.5",
    lg: "text-base px-6 py-3.5 gap-3",
  };

  const variantClasses = {
    primary:
      "bg-teal-700 hover:bg-teal-800 text-white shadow-sm hover:shadow-md focus:ring-teal-600 border border-teal-800",
    secondary:
      "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow-sm focus:ring-emerald-500 border border-emerald-700",
    danger:
      "bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus:ring-rose-500 border border-rose-700",
    outline:
      "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs focus:ring-teal-600",
    ghost:
      "bg-transparent hover:bg-slate-100 text-slate-700 focus:ring-slate-400",
    amber:
      "bg-amber-500 hover:bg-amber-600 text-amber-950 font-extrabold shadow-sm focus:ring-amber-400 border border-amber-600",
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        icon && iconPosition === "left" && <span className="shrink-0">{icon}</span>
      )}
      <span className="truncate">{children}</span>
      {!loading && icon && iconPosition === "right" && (
        <span className="shrink-0">{icon}</span>
      )}
    </button>
  );
};
