"use client";

import { useMemo } from "react";
import { Check, X, ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordCheckItem {
  id: string;
  label: string;
  test: (val: string) => boolean;
}

export const PASSWORD_CRITERIA: PasswordCheckItem[] = [
  { id: "length", label: "8+ characters", test: (p) => p.length >= 8 },
  { id: "uppercase", label: "Uppercase letter (A-Z)", test: (p) => /[A-Z]/.test(p) },
  { id: "lowercase", label: "Lowercase letter (a-z)", test: (p) => /[a-z]/.test(p) },
  { id: "number", label: "Number (0-9)", test: (p) => /\d/.test(p) },
  {
    id: "special",
    label: "Symbol (@, $, !, %, #, etc.)",
    test: (p) => /[@$!%*?&#^()_+\-=]/.test(p),
  },
];

interface PasswordStrengthMeterProps {
  password: string;
  confirmPassword?: string;
  className?: string;
}

export function PasswordStrengthMeter({
  password,
  confirmPassword,
  className,
}: PasswordStrengthMeterProps) {
  const checkResults = useMemo(() => {
    return PASSWORD_CRITERIA.map((criterion) => ({
      ...criterion,
      passed: criterion.test(password),
    }));
  }, [password]);

  const score = useMemo(() => {
    if (!password) return 0;
    return checkResults.filter((r) => r.passed).length;
  }, [password, checkResults]);

  const { level, color, label } = useMemo(() => {
    if (!password) return { level: 0, color: "bg-neutral-200", label: "Too short" };
    if (score <= 2) return { level: 1, color: "bg-rose-500", label: "Weak" };
    if (score === 3) return { level: 2, color: "bg-amber-500", label: "Moderate" };
    if (score === 4) return { level: 3, color: "bg-kampmax-blue", label: "Good" };
    return { level: 4, color: "bg-emerald-500", label: "Strong" };
  }, [password, score]);

  const passwordsMatch = useMemo(() => {
    if (!confirmPassword) return null;
    return password === confirmPassword;
  }, [password, confirmPassword]);

  if (!password && !confirmPassword) return null;

  return (
    <div className={cn("space-y-2.5 pt-1", className)}>
      {/* Strength Bar */}
      {password && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-kampmax-text-secondary">Password strength:</span>
            <span
              className={cn("font-semibold flex items-center gap-1", {
                "text-rose-500": level === 1,
                "text-amber-600": level === 2,
                "text-kampmax-blue": level === 3,
                "text-emerald-600": level === 4,
              })}
            >
              {level >= 3 ? (
                <ShieldCheck className="h-3.5 w-3.5 inline" />
              ) : (
                <ShieldAlert className="h-3.5 w-3.5 inline" />
              )}
              {label}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  step <= level ? color : "bg-neutral-200"
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Criteria Checklist */}
      {password && score < 5 && (
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 border-t border-neutral-100">
          {checkResults.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-1.5 text-[11px] transition-colors",
                item.passed ? "text-emerald-600 font-medium" : "text-kampmax-text-muted"
              )}
            >
              {item.passed ? (
                <Check className="h-3 w-3 shrink-0 text-emerald-600" />
              ) : (
                <div className="h-1.5 w-1.5 rounded-full bg-neutral-300 shrink-0 ml-1 mr-0.5" />
              )}
              <span className="truncate">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Password Match Status */}
      {confirmPassword !== undefined && confirmPassword.length > 0 && (
        <div
          className={cn(
            "flex items-center gap-1.5 text-xs pt-1",
            passwordsMatch ? "text-emerald-600 font-medium" : "text-rose-500"
          )}
        >
          {passwordsMatch ? (
            <>
              <Check className="h-3.5 w-3.5 shrink-0" />
              <span>Passwords match</span>
            </>
          ) : (
            <>
              <X className="h-3.5 w-3.5 shrink-0" />
              <span>Passwords do not match yet</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
