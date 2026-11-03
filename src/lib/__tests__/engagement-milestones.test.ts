import { describe, expect, it } from "vitest";
import { describeCurrentMilestone, describeDue, formatDueDate, milestoneAtStake } from "../engagement-milestones";
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
  dueDate: null,
  status,
  completedAt: null,
  autoReleased: false,
  disputeOutcome: null,
  disputeResolution: null,
  ...extra,
});

const THREE = [milestone(1, "COMPLETED", 100000), milestone(2, "ACTIVE", 150000), milestone(3, "UPCOMING", 50000)];

describe("formatDueDate", () => {
  it("writes the day and month, leaving out the year when it is this one", () => {
    const text = formatDueDate("2026-12-01", "2026-11-03");
    expect(text).toMatch(/1\s+Dec/);
    expect(text).not.toMatch(/2026/);
  });

  it("adds the year when it is another one", () => {
    expect(formatDueDate("2027-01-05", "2026-11-03")).toMatch(/2027/);
  });

  it("never shifts the day with the viewer's timezone", () => {
    // Built from the parts, so the first of the month stays the first.
    expect(formatDueDate("2026-12-01", "2026-11-03")).toMatch(/^1\s/);
    expect(formatDueDate("2026-12-31", "2026-11-03")).toMatch(/^31\s/);
  });
});

describe("describeDue", () => {
  const TODAY = "2026-11-03";

  it("says when a current or waiting milestone is due", () => {
    expect(describeDue("2026-12-01", "ACTIVE", TODAY)).toEqual({ label: expect.stringMatching(/^Due 1\s+Dec/), overdue: false });
    expect(describeDue("2026-12-01", "UPCOMING", TODAY)?.overdue).toBe(false);
  });

  it("does not call a milestone overdue on the day it is due", () => {
    expect(describeDue("2026-11-03", "ACTIVE", TODAY)?.overdue).toBe(false);
  });

  it("calls it overdue the day after, and still says when it was due", () => {
    expect(describeDue("2026-11-02", "ACTIVE", TODAY)).toEqual({
      label: expect.stringMatching(/^Overdue · due 2\s+Nov/),
      overdue: true,
    });
  });

  it("has nothing to say without a date, or once the milestone is paid or cancelled", () => {
    expect(describeDue(null, "ACTIVE", TODAY)).toBeNull();
    expect(describeDue("2026-11-02", "COMPLETED", TODAY)).toBeNull();
    expect(describeDue("2026-11-02", "CANCELLED", TODAY)).toBeNull();
  });
});

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
