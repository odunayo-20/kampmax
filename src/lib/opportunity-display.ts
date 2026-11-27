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

/**
 * When a posting stops taking responses, in words: "Closes today", "Closes tomorrow", "Closes in 5 days", or
 * "Closed". Null when there is no usable deadline. The mobile app's freelance-ux deadlineNote says the same.
 * (timeAgo only counts backwards, so it said "just now" for every future date.)
 */
export function closesText(deadline: string | null | undefined, now: number = Date.now()): string | null {
  if (!deadline) return null;
  const end = new Date(deadline).getTime();
  if (!Number.isFinite(end)) return null;
  if (end < now) return "Closed";
  const days = Math.ceil((end - now) / 86_400_000);
  if (days === 0) return "Closes today";
  if (days === 1) return "Closes tomorrow";
  return `Closes in ${days} days`;
}
