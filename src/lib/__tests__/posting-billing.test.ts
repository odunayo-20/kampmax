import { describe, expect, it } from "vitest";
import type { PostingPricing } from "@/services/jobs";
import { anyPostingFeeSet, liveAndRenewalLine, showFreePostings } from "../posting-billing";

const pricing = (over: Partial<PostingPricing> = {}): PostingPricing =>
  ({
    hiringEnabled: true,
    internshipFee: 0,
    unpaidInternshipFee: 0,
    partTimeFee: 0,
    fullTimeFee: 0,
    contractFee: 0,
    renewalDiscountPercent: 20,
    liveDays: 30,
    freeAllowance: { total: 2, used: 1, remaining: 1 },
    ...over,
  }) as PostingPricing;

describe("posting billing words", () => {
  it("counts the unpaid internship fee as a fee", () => {
    expect(anyPostingFeeSet(pricing())).toBe(false);
    expect(anyPostingFeeSet(pricing({ unpaidInternshipFee: 1500 }))).toBe(true);
  });

  it("says how much cheaper renewing is, and nothing about renewing without a discount", () => {
    expect(liveAndRenewalLine(pricing())).toBe("Each posting stays live for 30 days. Renewing an expired one is 20% cheaper.");
    expect(liveAndRenewalLine(pricing({ renewalDiscountPercent: 0, liveDays: 1 }))).toBe("Each posting stays live for 1 day.");
  });

  it("hides the free postings card with no allowance or while hiring is closed", () => {
    expect(showFreePostings(pricing())).toBe(true);
    expect(showFreePostings(pricing({ freeAllowance: { total: 0, used: 0, remaining: 0 } }))).toBe(false);
    expect(showFreePostings(pricing({ hiringEnabled: false }))).toBe(false);
  });
});
