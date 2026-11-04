import type { Opportunity, OpportunityPayPeriod } from "@/types/opportunity";
import { PAY_PERIOD_UNIT } from "@/config/opportunity";
import { formatNairaCompact } from "@/lib/utils";

/** "₦30k–₦50k", "₦30k+", "Up to ₦50k" — or null when no pay is quoted. */
export function payRangeText(min?: number, max?: number): string | null {
  if (min !== undefined && max !== undefined) {
    return min === max
      ? formatNairaCompact(min)
      : `${formatNairaCompact(min)}–${formatNairaCompact(max)}`;
  }
  if (min !== undefined) return `${formatNairaCompact(min)}+`;
  if (max !== undefined) return `Up to ${formatNairaCompact(max)}`;
  return null;
}

/**
 * The pay line of a vacancy or internship: "Unpaid", "₦30k–₦50k/month", or
 * "Pay not stated" when the employer left the range out.
 */
export function hiringPayText(o: Pick<Opportunity, "budget" | "hiring">): string {
  if (!o.hiring.isPaid) return "Unpaid";
  const range = payRangeText(o.budget.min, o.budget.max);
  if (!range) return "Pay not stated";
  const unit = o.hiring.payPeriod ? PAY_PERIOD_UNIT[o.hiring.payPeriod as OpportunityPayPeriod] : "";
  return `${range}${unit}`;
}

/** "1 month", "6 months", "2 years" for a length given in months. */
export function monthsText(months: number): string {
  if (months % 12 === 0 && months >= 12) {
    const years = months / 12;
    return `${years} ${years === 1 ? "year" : "years"}`;
  }
  return `${months} ${months === 1 ? "month" : "months"}`;
}

/** "1 opening", "3 openings". */
export function openingsText(openings: number): string {
  return `${openings} ${openings === 1 ? "opening" : "openings"}`;
}
