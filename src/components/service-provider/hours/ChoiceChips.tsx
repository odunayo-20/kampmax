"use client";

import { cn } from "@/lib/utils";

/** One choice out of a few, shown as pills so every option is visible at once. */
export function ChoiceChips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
            value === o.value
              ? "border-primary-600 bg-primary-50 text-primary-700"
              : "border-kampmax-border bg-white text-kampmax-text-secondary hover:border-primary-300"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
