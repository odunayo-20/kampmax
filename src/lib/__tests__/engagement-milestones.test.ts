import { describe, expect, it } from "vitest";
import { describeCurrentMilestone, milestoneAtStake } from "../engagement-milestones";
import type { EngagementMilestone, MilestoneStatus } from "@/services/jobs";

const milestone = (
  position: number,
  status: MilestoneStatus,
  amount: number,
  extra: Partial<EngagementMilestone> = {}
): EngagementMilestone => ({
  id: `m${position}`,
  position,
  title: ["", "Design", "Build", "Launch"][position] ?? `Step ${position}`,
  description: null,
  amount,
  status,
  completedAt: null,
  autoReleased: false,
  disputeOutcome: null,
  disputeResolution: null,
  ...extra,
});

const THREE = [milestone(1, "COMPLETED", 100000), milestone(2, "ACTIVE", 150000), milestone(3, "UPCOMING", 50000)];

describe("describeCurrentMilestone", () => {
  it("says which milestone is current, how much it is, and how many were paid", () => {
    expect(describeCurrentMilestone({ milestones: THREE, currentMilestonePosition: 2 })).toEqual({
      position: 2,
      total: 3,
      title: "Build",
      amount: 150000,
      paidCount: 1,
    });
  });

  it("has nothing to say for a single-payment contract, which keeps the plain wording", () => {
    expect(describeCurrentMilestone({ milestones: [milestone(1, "ACTIVE", 250000)], currentMilestonePosition: 1 })).toBeUndefined();
    expect(describeCurrentMilestone({ milestones: [], currentMilestonePosition: 1 })).toBeUndefined();
  });

  it("does not guess when the current milestone is missing", () => {
    expect(describeCurrentMilestone({ milestones: THREE, currentMilestonePosition: 9 })).toBeUndefined();
  });
});

describe("milestoneAtStake", () => {
  const open = { resolvedAt: null } as never;

  it("is the current milestone for an open dispute, not the contract total", () => {
    expect(
      milestoneAtStake({ milestones: THREE, currentMilestonePosition: 2, agreedAmount: 300000, dispute: open })
    ).toEqual({ amount: 150000, label: "milestone 2 of 3, “Build”" });
  });

  it("is the milestone that carries the ruling once the dispute is settled and the contract has moved on", () => {
    const settled = [
      milestone(1, "COMPLETED", 100000, { disputeOutcome: "RELEASE", disputeResolution: "Matched the scope" }),
      milestone(2, "ACTIVE", 150000),
      milestone(3, "UPCOMING", 50000),
    ];
    expect(
      milestoneAtStake({
        milestones: settled,
        currentMilestonePosition: 2,
        agreedAmount: 300000,
        dispute: { resolvedAt: "2026-11-03T00:00:00Z" } as never,
      })
    ).toEqual({ amount: 100000, label: "milestone 1 of 3, “Design”" });
  });

  it("is the whole amount, without a label, for a single-payment contract", () => {
    expect(
      milestoneAtStake({
        milestones: [milestone(1, "ACTIVE", 250000)],
        currentMilestonePosition: 1,
        agreedAmount: 250000,
        dispute: open,
      })
    ).toEqual({ amount: 250000, label: undefined });
  });

  it("falls back to the agreed amount when there are no milestones at all", () => {
    expect(milestoneAtStake({ milestones: [], currentMilestonePosition: 1, agreedAmount: 75000, dispute: open })).toEqual({
      amount: 75000,
    });
  });
});
