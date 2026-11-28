import { describe, expect, it } from "vitest";
import { contractGroup, contractsHeadline, defaultContractGroup, nextStep, paidPercent } from "../contract-groups";

const e = (status: string, paymentType: "FIXED" | "HOURLY" = "FIXED") => ({ status, paymentType }) as Parameters<typeof contractGroup>[0];

describe("contract groups", () => {
  it("puts the freelancer's turn under Needs you, and the rest by whether it is still open", () => {
    expect(contractGroup(e("IN_PROGRESS"), "freelancer")).toBe("yours");
    expect(contractGroup(e("REVISION_REQUESTED"), "freelancer")).toBe("yours");
    expect(contractGroup(e("SUBMITTED"), "freelancer")).toBe("moving");
    expect(contractGroup(e("DISPUTED"), "freelancer")).toBe("moving");
    expect(contractGroup(e("COMPLETED"), "freelancer")).toBe("done");
    expect(defaultContractGroup([e("COMPLETED"), e("FUNDED")], "freelancer")).toBe("moving");
    expect(contractsHeadline([e("IN_PROGRESS"), e("REVISION_REQUESTED")], "freelancer")).toBe("2 contracts are waiting for you");
    expect(contractsHeadline([e("SUBMITTED")], "freelancer")).toBeNull();
  });

  it("puts funding, starting and reviewing under the employer's Needs you", () => {
    expect(contractGroup(e("PENDING_PAYMENT"), "employer")).toBe("yours");
    expect(contractGroup(e("FUNDED"), "employer")).toBe("yours");
    expect(contractGroup(e("SUBMITTED"), "employer")).toBe("yours");
    expect(contractGroup(e("IN_PROGRESS"), "employer")).toBe("moving");
    expect(nextStep(e("SUBMITTED"), "employer")).toMatch(/approve it to release the payment/);
  });

  it("words the next step and the share paid", () => {
    expect(nextStep(e("IN_PROGRESS", "HOURLY"), "freelancer")).toMatch(/Log your hours/);
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
