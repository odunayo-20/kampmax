import type { PostingPricing } from "@/services/jobs";

/**
 * What posting a vacancy or internship costs, in the words the billing page and the dashboard notice use. The mobile
 * app's lib/employer-billing says the same (allFree, pricingNote, allowanceView). Pure.
 */

/** True once an admin has set a price on any paid kind, the unpaid internship included; until then nothing is charged. */
export function anyPostingFeeSet(pricing: PostingPricing): boolean {
  return [pricing.internshipFee, pricing.unpaidInternshipFee, pricing.partTimeFee, pricing.fullTimeFee, pricing.contractFee].some((n) => n > 0);
}

/** "Each posting stays live for 30 days. Renewing an expired one is 20% cheaper." The renewal part only with a discount. */
export function liveAndRenewalLine(pricing: Pick<PostingPricing, "liveDays" | "renewalDiscountPercent">): string {
  const days = `Each posting stays live for ${pricing.liveDays} ${pricing.liveDays === 1 ? "day" : "days"}.`;
  return pricing.renewalDiscountPercent > 0 ? `${days} Renewing an expired one is ${pricing.renewalDiscountPercent}% cheaper.` : days;
}

/** The free-postings card is shown only when there is an allowance and vacancies and internships are open. */
export function showFreePostings(pricing: Pick<PostingPricing, "hiringEnabled" | "freeAllowance">): boolean {
  return pricing.hiringEnabled !== false && pricing.freeAllowance.total > 0;
}

export const FREE_POSTINGS_NOTE =
  "A free posting is used first when you publish a vacancy or internship, and one is given back if a posting is rejected. Gigs never use one.";
