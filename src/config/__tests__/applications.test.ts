import { describe, expect, it } from "vitest";
import { lowestOpenAmount } from "../applications";

describe("lowestOpenAmount", () => {
  it("marks the cheapest proposal still open, only when there are two to compare", () => {
    expect(lowestOpenAmount([{ status: "submitted", proposedAmount: 50000 }, { status: "shortlisted", proposedAmount: 30000 }, { status: "rejected", proposedAmount: 10000 }])).toBe(30000);
    expect(lowestOpenAmount([{ status: "submitted", proposedAmount: 50000 }])).toBeNull();
    expect(lowestOpenAmount([{ status: "submitted", proposedAmount: 50000 }, { status: "withdrawn", proposedAmount: 20000 }])).toBeNull();
  });
});
