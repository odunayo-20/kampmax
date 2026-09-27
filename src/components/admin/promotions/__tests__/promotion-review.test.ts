import { describe, expect, it } from "vitest";
import { reviewBadge } from "../promotions-meta";
import { reviewNotice } from "@/components/vendor-promotions/promotions-meta";

describe("reviewBadge (admin)", () => {
  it("flags a pending vendor promotion", () => {
    expect(reviewBadge("pending")).toEqual({ label: "Needs review", variant: "warning" });
  });

  it("flags a rejected one", () => {
    expect(reviewBadge("rejected")).toEqual({ label: "Rejected", variant: "error" });
  });

  it("says nothing for approved or platform promotions", () => {
    expect(reviewBadge("approved")).toBeNull();
    expect(reviewBadge(undefined)).toBeNull();
  });
});

describe("reviewNotice (vendor)", () => {
  it("explains that a pending promotion cannot be redeemed yet", () => {
    const notice = reviewNotice({ review: "pending" });
    expect(notice?.tone).toBe("warning");
    expect(notice?.title).toMatch(/awaiting approval/i);
    expect(notice?.body).toMatch(/can't use this code/i);
  });

  it("shows the reason for a rejection and how to resubmit", () => {
    const notice = reviewNotice({ review: "rejected", reviewNote: "Discount too deep." });
    expect(notice?.tone).toBe("error");
    expect(notice?.body).toContain("Discount too deep.");
    expect(notice?.body).toMatch(/resubmit/i);
  });

  it("still tells the vendor how to resubmit when no reason was given", () => {
    expect(reviewNotice({ review: "rejected" })?.body).toMatch(/resubmit/i);
  });

  it("has nothing to say once approved", () => {
    expect(reviewNotice({ review: "approved" })).toBeNull();
    expect(reviewNotice({})).toBeNull();
  });
});
