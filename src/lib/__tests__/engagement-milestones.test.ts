import { describe, expect, it } from "vitest";
import {
  contractPriceLabel,
  describeCurrentMilestone,
  describeDue,
  formatDueDate,
  milestoneAtStake,
} from "../engagement-milestones";
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
  kind: "FIXED",
  periodStart: null,
  periodEnd: null,
  loggedMinutes: 0,
  billedAmount: null,
  status,
  completedAt: null,
  autoReleased: false,
  disputeOutcome: null,
  disputeResolution: null,
  ...extra,
});

const THREE = [milestone(1, "COMPLETED", 100000), milestone(2, "ACTIVE", 150000), milestone(3, "UPCOMING", 50000)];

const FIXED = { paymentType: "FIXED" as const, hourlyRate: null };

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
    expect(describeCurrentMilestone({ ...FIXED, milestones: THREE, currentMilestonePosition: 2 })).toEqual({
      position: 2,
      total: 3,
      title: "Build",
      amount: 150000,
      paidCount: 1,
    });
  });

  it("has nothing to say for a single-payment contract, which keeps the plain wording", () => {
    expect(describeCurrentMilestone({ ...FIXED, milestones: [milestone(1, "ACTIVE", 250000)], currentMilestonePosition: 1 })).toBeUndefined();
    expect(describeCurrentMilestone({ ...FIXED, milestones: [], currentMilestonePosition: 1 })).toBeUndefined();
  });

  it("does not guess when the current milestone is missing", () => {
    expect(describeCurrentMilestone({ ...FIXED, milestones: THREE, currentMilestonePosition: 9 })).toBeUndefined();
  });
});

describe("milestoneAtStake", () => {
  const open = { resolvedAt: null } as never;

  it("is the current milestone for an open dispute, not the contract total", () => {
    expect(
      milestoneAtStake({ ...FIXED, milestones: THREE, currentMilestonePosition: 2, agreedAmount: 300000, dispute: open })
    ).toEqual({ amount: 150000, release: 150000, label: "milestone 2 of 3, “Build”" });
  });

  it("is the milestone that carries the ruling once the dispute is settled and the contract has moved on", () => {
    const settled = [
      milestone(1, "COMPLETED", 100000, { disputeOutcome: "RELEASE", disputeResolution: "Matched the scope" }),
      milestone(2, "ACTIVE", 150000),
      milestone(3, "UPCOMING", 50000),
    ];
    expect(
      milestoneAtStake({
        ...FIXED,
        milestones: settled,
        currentMilestonePosition: 2,
        agreedAmount: 300000,
        dispute: { resolvedAt: "2026-11-03T00:00:00Z" } as never,
      })
    ).toEqual({ amount: 100000, release: 100000, label: "milestone 1 of 3, “Design”" });
  });

  it("is the whole amount, without a label, for a single-payment contract", () => {
    expect(
      milestoneAtStake({
        ...FIXED,
        milestones: [milestone(1, "ACTIVE", 250000)],
        currentMilestonePosition: 1,
        agreedAmount: 250000,
        dispute: open,
      })
    ).toEqual({ amount: 250000, release: 250000, label: undefined });
  });

  it("falls back to the agreed amount when there are no milestones at all", () => {
    expect(milestoneAtStake({ ...FIXED, milestones: [], currentMilestonePosition: 1, agreedAmount: 75000, dispute: open })).toEqual({
      amount: 75000,
      release: 75000,
    });
  });
});

// ── hourly contracts ────────────────────────────────────────

const HOURLY = { paymentType: "HOURLY" as const, hourlyRate: 3000 };
const week = (position: number, status: MilestoneStatus, minutes = 0, extra: Partial<EngagementMilestone> = {}) =>
  milestone(position, status, 60000, {
    kind: "WEEK",
    title: `Week ${position}`,
    loggedMinutes: minutes,
    ...extra,
  });

describe("describeCurrentMilestone for an hourly contract", () => {
  it("describes the current week even when it is the first, with what the hours are worth", () => {
    expect(
      describeCurrentMilestone({ ...HOURLY, milestones: [week(1, "ACTIVE", 1110)], currentMilestonePosition: 1 })
    ).toEqual({
      position: 1,
      total: 1,
      title: "Week 1",
      amount: 60000,
      paidCount: 0,
      // 18h 30m at 3,000 an hour.
      hourly: { loggedMinutes: 1110, worth: 55500 },
    });
  });

  it("counts the weeks already paid", () => {
    const info = describeCurrentMilestone({
      ...HOURLY,
      milestones: [week(1, "COMPLETED", 1200), week(2, "COMPLETED", 600), week(3, "ACTIVE", 0)],
      currentMilestonePosition: 3,
    });
    expect(info?.paidCount).toBe(2);
    expect(info?.hourly).toEqual({ loggedMinutes: 0, worth: 0 });
  });

  it("rounds what the hours are worth to the nearest kobo, as the backend pays it", () => {
    const info = describeCurrentMilestone({
      paymentType: "HOURLY",
      hourlyRate: 1000,
      milestones: [week(1, "ACTIVE", 7)],
      currentMilestonePosition: 1,
    });
    expect(info?.hourly?.worth).toBe(116.67);
  });
});

describe("contractPriceLabel", () => {
  it("is the price of a fixed contract", () => {
    expect(contractPriceLabel({ ...FIXED, weeklyHourLimit: null, agreedAmount: 250000 })).toBe("₦250,000");
  });

  it("is the rate and weekly limit of an hourly contract, not its weekly maximum", () => {
    expect(contractPriceLabel({ ...HOURLY, weeklyHourLimit: 20, agreedAmount: 60000 })).toBe("₦3,000/hr · up to 20 h/week");
  });

  it("falls back to the amount if the hourly terms are missing", () => {
    expect(contractPriceLabel({ paymentType: "HOURLY", hourlyRate: null, weeklyHourLimit: null, agreedAmount: 60000 })).toBe("₦60,000");
  });
});

describe("milestoneAtStake for an hourly week", () => {
  const open = { resolvedAt: null } as never;

  it("shows that a ruling to release pays the hours worked, while a refund returns the whole escrow", () => {
    expect(
      milestoneAtStake({
        hourlyRate: 3000,
        milestones: [week(1, "ACTIVE", 900)],
        currentMilestonePosition: 1,
        agreedAmount: 60000,
        dispute: open,
      })
    ).toEqual({ amount: 60000, release: 45000, label: "week 1" });
  });

  it("shows what a settled week actually paid", () => {
    expect(
      milestoneAtStake({
        hourlyRate: 3000,
        milestones: [week(1, "COMPLETED", 900, { billedAmount: 45000, disputeOutcome: "RELEASE" }), week(2, "ACTIVE", 0)],
        currentMilestonePosition: 2,
        agreedAmount: 60000,
        dispute: { resolvedAt: "2026-11-03T00:00:00Z" } as never,
      })
    ).toEqual({ amount: 60000, release: 45000, label: "week 1" });
  });
});
