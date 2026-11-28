import { describe, expect, it } from "vitest";
import { contractGroup, contractsHeadline, defaultContractGroup, nextStep, paidPercent } from "../contract-groups";

const e = (status: string, paymentType: "FIXED" | "HOURLY" = "FIXED") => ({ status, paymentType }) as Parameters<typeof contractGroup>[0];

describe("contract groups", () => {
  it("puts the freelancer's turn under Needs you, and the rest by whether it is still open", () => {
    expect(contractGroup(e("IN_PROGRESS"))).toBe("yours");
    expect(contractGroup(e("REVISION_REQUESTED"))).toBe("yours");
    expect(contractGroup(e("SUBMITTED"))).toBe("moving");
    expect(contractGroup(e("DISPUTED"))).toBe("moving");
    expect(contractGroup(e("COMPLETED"))).toBe("done");
    expect(defaultContractGroup([e("COMPLETED"), e("FUNDED")])).toBe("moving");
    expect(contractsHeadline([e("IN_PROGRESS"), e("REVISION_REQUESTED")])).toBe("2 contracts are waiting for you");
    expect(contractsHeadline([e("SUBMITTED")])).toBeNull();
  });

  it("words the next step and the share paid", () => {
    expect(nextStep(e("IN_PROGRESS", "HOURLY"))).toMatch(/Log your hours/);
    const contract = {
      status: "IN_PROGRESS",
      agreedAmount: 100000,
      milestones: [
        { status: "COMPLETED", amount: 25000 },
        { status: "ACTIVE", amount: 75000 },
      ],
    } as unknown as Parameters<typeof paidPercent>[0];
    expect(paidPercent(contract)).toBe(25);
  });
});
