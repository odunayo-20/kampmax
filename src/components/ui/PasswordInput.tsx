"use client";

import { forwardRef, useState, InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  hint?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-kampmax-text mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={visible ? "text" : "password"}
            className={cn(
              "w-full h-11 px-3 pr-10 text-sm bg-white border rounded-lg",
              "placeholder:text-kampmax-text-secondary/60",
              "focus:outline-none focus:ring-1 transition-colors",
              error
                ? "border-kampmax-error focus:ring-kampmax-error focus:border-kampmax-error"
                : "border-kampmax-border focus:ring-kampmax-blue focus:border-kampmax-blue",
              className
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-kampmax-text-secondary hover:text-kampmax-text transition-colors"
          >
            {visible ? (
              <EyeOff className="h-4 w-4" aria-hidden />
            ) : (
              <Eye className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
        {error && (
          <p className="mt-1 text-xs text-kampmax-error">{error}</p>
        )}
        {hint && !error && (
          <p className="mt-1 text-xs text-kampmax-text-secondary">{hint}</p>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
