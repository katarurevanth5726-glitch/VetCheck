import React from "react";
import { AlertCircle } from "lucide-react";

interface FormFieldProps {
  label: string;
  id: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  id,
  optional = false,
  hint,
  error,
  className = "",
  children,
}) => {
  return (
    <div className={`space-y-1.5 text-left ${className}`}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs sm:text-sm font-bold text-slate-900 block">
          {label}
        </label>
        {optional && (
          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            Optional
          </span>
        )}
      </div>

      {children}

      {hint && !error && (
        <p id={`${id}-hint`} className="text-[11px] text-slate-500 font-medium">
          {hint}
        </p>
      )}

      {error && (
        <p
          id={`${id}-error`}
          className="text-xs font-semibold text-rose-600 flex items-center gap-1 bg-rose-50 p-2 rounded-xl border border-rose-200"
          role="alert"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};
