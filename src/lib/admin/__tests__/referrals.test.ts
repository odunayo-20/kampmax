import { describe, expect, it } from "vitest";
import { looksSuspicious, reasonText, referralStatusText } from "../referrals";

describe("invite credit wording", () => {
  it("explains each rejection in plain words and never hides an unknown one", () => {
    expect(reasonText("SELF_DEALING")).toMatch(/other side/);
    expect(reasonText("PURCHASE_REVERSED")).toMatch(/refunded or cancelled/);
    expect(reasonText("SOMETHING_NEW")).toBe("SOMETHING_NEW");
    expect(reasonText(null)).toBe("");
  });

  it("says what kind of purchase an invite is waiting on or was paid for", () => {
    expect(referralStatusText({ status: "PENDING", vertical: null })).toMatch(/Waiting/);
    expect(referralStatusText({ status: "HOLDING", vertical: "MARKETPLACE" })).toBe("First purchase made, in the hold");
    expect(referralStatusText({ status: "REWARDED", vertical: "FREELANCE" })).toBe("Paid after a freelance job");
  });

  it("flags inviters whose invites are mostly rejected", () => {
    expect(looksSuspicious({ rewarded: 0, rejected: 3 })).toBe(true);
    expect(looksSuspicious({ rewarded: 5, rejected: 3 })).toBe(false);
    expect(looksSuspicious({ rewarded: 0, rejected: 2 })).toBe(false);
  });
});
