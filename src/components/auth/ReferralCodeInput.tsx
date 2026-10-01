"use client";

import { useState, useId } from "react";
import {
  Gift,
  ChevronDown,
  CheckCircle2,
  X,
  Sparkles,
  Award,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ReferralCodeInputProps {
  value: string;
  onChange: (code: string, isValid: boolean) => void;
  className?: string;
}

export interface ReferralValidationResult {
  isValid: boolean;
  type?: "ambassador" | "peer";
  note?: string;
  badgeLabel?: string;
}

export function validateReferralCode(rawCode: string): ReferralValidationResult {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return { isValid: false };
  }

  // Ambassador codes (starts with AMB- or matches platform keys)
  if (
    code.startsWith("AMB-") ||
    code === "AMBASSADOR" ||
    code === "KAMPMAX-VIP" ||
    code === "CAMPUS-LEAD"
  ) {
    return {
      isValid: true,
      type: "ambassador",
      badgeLabel: "Official Campus Ambassador",
      note: "Your registration will be linked with your campus ambassador.",
    };
  }

  // General peer referral codes: format KM-XXXX or 5+ alphanumeric characters
  const peerRegex = /^(KM-)?[A-Z0-9]{4,10}$/;
  if (peerRegex.test(code) && code.length >= 5) {
    return {
      isValid: true,
      type: "peer",
      badgeLabel: "Student Referral Code",
      note: "Referral code verified and linked to your inviter.",
    };
  }

  return { isValid: false };
}

export function ReferralCodeInput({
  value,
  onChange,
  className,
}: ReferralCodeInputProps) {
  const inputId = useId();
  const [isOpen, setIsOpen] = useState(Boolean(value));
  const [inputValue, setInputValue] = useState(value);

  const validation = validateReferralCode(inputValue);

  function handleInputChange(text: string) {
    // Uppercase and remove whitespace/special characters except hyphen
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    setInputValue(cleaned);
    const result = validateReferralCode(cleaned);
    onChange(cleaned, result.isValid);
  }

  function handleClear() {
    setInputValue("");
    onChange("", false);
  }

  return (
    <div
      className={cn(
        "rounded-lg border transition-all",
        isOpen
          ? "border-kampmax-border bg-neutral-50/50 p-3.5 space-y-3"
          : "border-dashed border-kampmax-border bg-transparent p-2.5",
        className
      )}
    >
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between text-left text-xs font-medium text-kampmax-text hover:text-kampmax-blue transition-colors group"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Gift className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold">
            {value && validation.isValid
              ? "Referral Code Applied"
              : "Have a referral or ambassador code?"}
          </span>
          {value && validation.isValid && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
              Applied
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-neutral-400 group-hover:text-kampmax-blue">
          <span className="text-[11px] font-normal">
            {isOpen ? "Hide" : "Add code"}
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="space-y-2.5 pt-1 animate-in fade-in duration-150">
          <div className="relative flex items-center">
            <Tag className="absolute left-3 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
            <input
              id={inputId}
              type="text"
              placeholder="e.g. KM-8492 or AMB-UNILAG"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              maxLength={15}
              className={cn(
                "w-full pl-8.5 pr-8 py-2 text-xs font-mono tracking-wider rounded-lg border bg-white uppercase transition-all",
                validation.isValid
                  ? "border-emerald-500 ring-1 ring-emerald-500/20 text-emerald-900"
                  : "border-kampmax-border focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue/30 text-kampmax-text"
              )}
            />
            {inputValue && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2.5 text-neutral-400 hover:text-neutral-600 p-0.5"
                title="Clear referral code"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Validation Banner */}
          {validation.isValid ? (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-start gap-2 text-xs text-emerald-800">
              {validation.type === "ambassador" ? (
                <Award className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <p className="font-semibold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 inline" />
                  {validation.badgeLabel}
                </p>
                <p className="text-[11px] text-emerald-700 mt-0.5 leading-snug">
                  {validation.note}
                </p>
              </div>
            </div>
          ) : inputValue.length > 0 ? (
            <p className="text-[11px] text-neutral-500">
              Code not recognized, but you can still proceed with registration without one.
            </p>
          ) : (
            <p className="text-[11px] text-kampmax-text-secondary leading-tight">
              Enter an invite code from a fellow student or campus ambassador if you have one.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
