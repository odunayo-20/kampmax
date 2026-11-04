// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ContractFeeNote } from "../ContractFeeNote";
import type { EngagementMilestone } from "@/services/jobs";

afterEach(cleanup);

const milestone = (extra: Partial<EngagementMilestone> = {}): EngagementMilestone => ({
  id: "m1",
  position: 1,
  title: "Complete project",
  description: null,
  amount: 50000,
  dueDate: null,
  kind: "FIXED",
  periodStart: null,
  periodEnd: null,
  loggedMinutes: 0,
  billedAmount: null,
  feeAmount: null,
  status: "ACTIVE",
  completedAt: null,
  autoReleased: false,
  disputeOutcome: null,
  disputeResolution: null,
  ...extra,
});

describe("ContractFeeNote", () => {
  it("explains the fee this contract was made with", () => {
    render(<ContractFeeNote engagement={{ feeRate: 10, feeMinimum: 100, milestones: [milestone()] }} />);
    expect(screen.getByTestId("contract-fee-note").textContent).toContain("10% of each payment, at least ₦100");
  });

  it("says nothing for a contract made before fees, or at no fee", () => {
    const { container, rerender } = render(
      <ContractFeeNote engagement={{ feeRate: null, feeMinimum: null, milestones: [milestone()] }} />
    );
    expect(container.textContent).toBe("");
    rerender(<ContractFeeNote engagement={{ feeRate: 0, feeMinimum: 500, milestones: [milestone()] }} />);
    expect(container.textContent).toBe("");
  });

  it("adds what a single payment came to once it was paid", () => {
    render(
      <ContractFeeNote
        engagement={{
          feeRate: 10,
          feeMinimum: 0,
          milestones: [milestone({ status: "COMPLETED", feeAmount: 5000 })],
        }}
      />
    );
    expect(screen.getByTestId("contract-fee-note").textContent).toContain(
      "₦45,000 received after the ₦5,000 service fee"
    );
  });

  it("leaves each payment's result to the milestone list when there are several", () => {
    render(
      <ContractFeeNote
        engagement={{
          feeRate: 10,
          feeMinimum: 0,
          milestones: [milestone({ status: "COMPLETED", feeAmount: 5000 }), milestone({ id: "m2", position: 2 })],
        }}
      />
    );
    expect(screen.getByTestId("contract-fee-note").textContent).not.toContain("received");
  });
});
