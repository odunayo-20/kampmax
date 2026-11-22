"use client";

import { useState, useId } from "react";
import { Gift, ChevronDown, X, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReferralCodeInputProps {
  value: string;
  onChange: (code: string, isValid: boolean) => void;
  className?: string;
}

/** Whether this looks like an invite code. Whether it is a real one is for the server to say when the account is made. */
export function validateReferralCode(rawCode: string): { isValid: boolean } {
  return { isValid: /^[A-Z0-9-]{4,20}$/.test(rawCode.trim().toUpperCase()) };
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
              : "Have a friend's invite code?"}
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
              placeholder="e.g. KAMP-1A2B3C4D"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              maxLength={20}
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

          {validation.isValid ? (
            <p className="text-[11px] text-emerald-700 leading-tight">
              Code added. We check it when you create your account, and you both get credit after your first purchase.
            </p>
          ) : inputValue.length > 0 ? (
            <p className="text-[11px] text-neutral-500">
              That does not look like an invite code. You can still sign up without one.
            </p>
          ) : (
            <p className="text-[11px] text-kampmax-text-secondary leading-tight">
              A friend can share their code from the Kampmax app.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
