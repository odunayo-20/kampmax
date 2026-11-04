"use client";

import { Briefcase, Clock, FileText, GraduationCap, Hammer } from "lucide-react";
import type { OpportunityType } from "@/types/opportunity";
import { OPPORTUNITY_TYPE_META, OPPORTUNITY_TYPE_ORDER } from "@/config/opportunity";
import { usePostingPricing } from "@/hooks/use-posting-billing";
import { feeHint } from "@/lib/posting-fees";
import { cn } from "@/lib/utils";

const ICON: Record<OpportunityType, typeof Briefcase> = {
  gig: Hammer,
  internship: GraduationCap,
  full_time: Briefcase,
  part_time: Clock,
  contract: FileText,
};

/**
 * "What are you posting?": one card per opportunity type, each with what it is
 * and what it costs this employer to publish (the free postings they have left
 * are counted in). Gigs are free; vacancies and internships are paid.
 */
export function OpportunityTypePicker({
  value,
  isPaid,
  onChange,
  disabled,
}: {
  value: OpportunityType;
  /** Whether the role is paid, which changes an internship's price. */
  isPaid: boolean;
  onChange: (type: OpportunityType) => void;
  disabled?: boolean;
}) {
  const pricing = usePostingPricing();
  // Until hiring postings open, they can still be drafted but not published.
  const hiringClosed = pricing.data?.hiringEnabled === false;

  return (
    <div
      role="radiogroup"
      aria-label="What are you posting?"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {OPPORTUNITY_TYPE_ORDER.map((type) => {
        const meta = OPPORTUNITY_TYPE_META[type];
        const Icon = ICON[type];
        const selected = value === type;
        const closed = hiringClosed && type !== "gig";
        const hint = closed ? "Opening soon: you can save a draft now" : feeHint(pricing.data, type, isPaid);
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(type)}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              selected
                ? "border-primary-600 bg-primary-50 ring-2 ring-primary-600/20"
                : "border-neutral-200 bg-white hover:bg-neutral-50"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                selected ? "bg-primary-600 text-white" : "bg-neutral-100 text-neutral-500"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-neutral-900">{meta.label}</span>
              <span className="mt-0.5 block text-xs text-neutral-500">{meta.description}</span>
              {hint && (
                <span
                  className={cn(
                    "mt-1.5 block text-xs font-medium",
                    closed
                      ? "text-warning-700"
                      : hint.startsWith("Free")
                        ? "text-success-700"
                        : "text-neutral-700"
                  )}
                >
                  {hint}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
