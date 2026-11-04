import type { PostingPricing } from "@/services/jobs";
import type { OpportunityType } from "@/types/opportunity";
import { formatNaira } from "@/lib/utils";

/**
 * The list price to publish one posting, for hints before a draft exists (the
 * type picker). DISPLAY ONLY: the backend prices every publish itself and the
 * confirm dialog shows its quote, never this number.
 */
export function listFee(pricing: PostingPricing, type: OpportunityType, isPaid: boolean): number {
  switch (type) {
    case "internship":
      return isPaid ? pricing.internshipFee : pricing.unpaidInternshipFee;
    case "part_time":
      return pricing.partTimeFee;
    case "full_time":
      return pricing.fullTimeFee;
    case "contract":
      return pricing.contractFee;
    default:
      return 0;
  }
}

/** "Free", "Free for you · 2 free postings left", or "₦10,000 to publish". */
export function feeHint(
  pricing: PostingPricing | undefined,
  type: OpportunityType,
  isPaid = true
): string {
  if (type === "gig") return "Free to post";
  if (!pricing) return "";
  const fee = listFee(pricing, type, isPaid);
  if (!(fee > 0)) return "Free to post";
  const left = pricing.freeAllowance.remaining;
  if (left > 0) {
    return `Free for you · ${left} free ${left === 1 ? "posting" : "postings"} left`;
  }
  return `${formatNaira(fee)} to publish`;
}
