"use client";

import { useId, useState, useEffect } from "react";
import { Phone, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type TelcoCarrier = "MTN" | "Airtel" | "Glo" | "9mobile" | null;

interface TelcoInfo {
  carrier: TelcoCarrier;
  badgeClass: string;
}

/**
 * Detects the Nigerian mobile network operator from the first 4-5 digits.
 */
export function detectNigerianCarrier(phoneDigits: string): TelcoInfo {
  // Strip country code if present
  let local = phoneDigits.replace(/^\+234/, "0").replace(/\D/g, "");
  if (!local.startsWith("0") && local.length > 0) {
    local = "0" + local;
  }

  const prefix4 = local.slice(0, 4);

  const mtnPrefixes = [
    "0803", "0806", "0703", "0706", "0813", "0816", "0810", "0814", "0903", "0906", "0913", "0916"
  ];
  const airtelPrefixes = [
    "0802", "0808", "0708", "0701", "0812", "0902", "0901", "0904", "0907", "0912"
  ];
  const gloPrefixes = [
    "0805", "0807", "0705", "0815", "0811", "0905", "0915"
  ];
  const nineMobilePrefixes = [
    "0809", "0817", "0818", "0909", "0908"
  ];

  if (mtnPrefixes.includes(prefix4)) {
    return { carrier: "MTN", badgeClass: "bg-amber-100 text-amber-900 border-amber-300" };
  }
  if (airtelPrefixes.includes(prefix4)) {
    return { carrier: "Airtel", badgeClass: "bg-rose-100 text-rose-900 border-rose-300" };
  }
  if (gloPrefixes.includes(prefix4)) {
    return { carrier: "Glo", badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300" };
  }
  if (nineMobilePrefixes.includes(prefix4)) {
    return { carrier: "9mobile", badgeClass: "bg-teal-100 text-teal-900 border-teal-300" };
  }

  return { carrier: null, badgeClass: "" };
}

/**
 * Normalizes input digits to E.164 format: +234XXXXXXXXXX
 */
export function normalizeNigerianPhone(rawInput: string): string {
  const digitsOnly = rawInput.replace(/\D/g, "");
  if (!digitsOnly) return "";

  // If already starts with 234 and 13 digits
  if (digitsOnly.startsWith("234") && digitsOnly.length >= 13) {
    return `+${digitsOnly.slice(0, 13)}`;
  }

  // If starts with 0 and has 11 digits: e.g. 08031234567 -> +2348031234567
  if (digitsOnly.startsWith("0")) {
    const withoutZero = digitsOnly.slice(1, 11);
    return `+234${withoutZero}`;
  }

  // If just entered 10 digits without leading 0: e.g. 8031234567
  if (digitsOnly.length <= 10) {
    return `+234${digitsOnly}`;
  }

  return `+${digitsOnly}`;
}

/**
 * Pretty-formats Nigerian phone digits for user typing display: e.g. "0803 123 4567"
 */
export function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
}

interface NigerianPhoneInputProps {
  value: string; // E.164 formatted (+234...) or local string
  onChange: (normalizedE164: string, displayVal: string) => void;
  label?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

export function NigerianPhoneInput({
  value,
  onChange,
  label = "Phone number (optional)",
  error,
  required = false,
  className,
}: NigerianPhoneInputProps) {
  const id = useId();

  // Local display state
  const [displayValue, setDisplayValue] = useState(() => {
    if (!value) return "";
    let local = value.replace(/^\+234/, "0");
    return formatPhoneDisplay(local);
  });

  // Keep display synchronized if value changes externally
  useEffect(() => {
    if (!value) {
      setDisplayValue("");
      return;
    }
    const local = value.replace(/^\+234/, "0");
    const formatted = formatPhoneDisplay(local);
    setDisplayValue((prev) => (prev.replace(/\s/g, "") === local.replace(/\s/g, "") ? prev : formatted));
  }, [value]);

  const telco = detectNigerianCarrier(displayValue);
  const isValidLength = displayValue.replace(/\D/g, "").length === 11;

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const formatted = formatPhoneDisplay(raw);
    setDisplayValue(formatted);

    const normalized = normalizeNigerianPhone(raw);
    onChange(normalized, formatted);
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-kampmax-text flex items-center gap-1">
          {label}
          {required && (
            <span className="text-kampmax-error" title="Required">
              *
            </span>
          )}
        </label>
        {telco.carrier && (
          <span
            className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all animate-in fade-in",
              telco.badgeClass
            )}
          >
            {telco.carrier}
          </span>
        )}
      </div>

      <div className="relative flex items-center">
        {/* Country Code Fixed Badge */}
        <div className="absolute left-1 top-1 bottom-1 flex items-center gap-1.5 px-2.5 bg-neutral-100/90 rounded-md border-r border-neutral-200 text-xs font-semibold text-kampmax-text select-none">
          <span className="text-sm">🇳🇬</span>
          <span>+234</span>
        </div>

        <input
          id={id}
          type="tel"
          value={displayValue}
          onChange={handleInputChange}
          placeholder="0801 234 5678"
          maxLength={14} // formatted "0803 123 4567" is 13 chars
          autoComplete="tel-national"
          className={cn(
            "w-full h-11 pl-23 pr-9 text-sm bg-kampmax-bg border rounded-lg",
            "focus:outline-none focus:ring-2 transition-all placeholder:text-kampmax-text-muted",
            error
              ? "border-kampmax-error focus:border-kampmax-error focus:ring-kampmax-error/20"
              : "border-kampmax-border focus:border-kampmax-blue focus:ring-kampmax-blue/20"
          )}
        />

        {/* Right Status Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {isValidLength ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <Phone className="h-4 w-4 text-kampmax-text-muted" />
          )}
        </div>
      </div>

      {error ? (
        <p className="text-xs text-kampmax-error flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      ) : (
        <p className="text-[11px] text-kampmax-text-secondary">
          Used for buyer-seller pickup notifications and SMS verification.
        </p>
      )}
    </div>
  );
}
