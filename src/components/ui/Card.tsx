import React from "react";

export type CardVariant = "default" | "interactive" | "flat" | "emergency" | "success" | "warning" | "teal";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  rounded?: "md" | "lg" | "xl" | "2xl" | "3xl";
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = "default",
  padding = "md",
  rounded = "2xl",
  children,
  className = "",
  ...props
}) => {
  const paddingMap = {
    none: "p-0",
    sm: "p-3",
    md: "p-4 sm:p-5",
    lg: "p-5 sm:p-6",
    xl: "p-6 sm:p-8",
  };

  const roundedMap = {
    md: "rounded-xl",
    lg: "rounded-2xl",
    xl: "rounded-2xl sm:rounded-3xl",
    "2xl": "rounded-3xl",
    "3xl": "rounded-3xl sm:rounded-[2rem]",
  };

  const variantMap = {
    default: "bg-white border border-slate-200/90 shadow-xs text-slate-900",
    interactive:
      "bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-teal-300 transition-all duration-150 active:scale-[0.99] cursor-pointer text-slate-900",
    flat: "bg-slate-50/80 border border-slate-200/80 text-slate-900",
    emergency: "bg-rose-50/90 border-2 border-rose-300 text-rose-950 shadow-xs",
    success: "bg-emerald-50/80 border border-emerald-200 text-emerald-950 shadow-xs",
    warning: "bg-amber-50/80 border border-amber-200 text-amber-950 shadow-xs",
    teal: "bg-teal-50/70 border border-teal-200 text-teal-950 shadow-xs",
  };

  return (
    <div
      className={`${variantMap[variant]} ${paddingMap[padding]} ${roundedMap[rounded]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
