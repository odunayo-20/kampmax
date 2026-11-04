// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { EngagementMilestones } from "../EngagementMilestones";
import type { EngagementMilestone, MilestoneStatus } from "@/services/jobs";

afterEach(cleanup);

const m = (
  position: number,
  status: MilestoneStatus,
  amount: number,
  extra: Partial<EngagementMilestone> = {}
): EngagementMilestone => ({
  id: `m${position}`,
  position,
  title: ["", "Design", "Build", "Launch"][position],
  description: null,
  amount,
  dueDate: null,
  kind: "FIXED",
  periodStart: null,
  periodEnd: null,
  loggedMinutes: 0,
  billedAmount: null,
  feeAmount: null,
  status,
  completedAt: null,
  autoReleased: false,
  disputeOutcome: null,
  disputeResolution: null,
  ...extra,
});

describe("EngagementMilestones", () => {
  it("shows every milestone in order with its amount and where it stands", () => {
    render(
      <EngagementMilestones milestones={[m(1, "COMPLETED", 100000), m(2, "ACTIVE", 150000), m(3, "UPCOMING", 50000)]} />
    );

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toContain("1. Design");
    expect(items[0].textContent).toContain("Paid");
    expect(items[0].textContent).toContain("₦100,000");
    expect(items[1].textContent).toContain("Current");
    expect(items[2].textContent).toContain("Up next");
    expect(screen.getByText("1 of 3 paid")).not.toBeNull();
  });

  it("says when a milestone was paid because the client never reviewed it", () => {
    render(
      <EngagementMilestones milestones={[m(1, "COMPLETED", 100000, { autoReleased: true }), m(2, "ACTIVE", 150000)]} />
    );
    expect(screen.getByText(/released automatically/)).not.toBeNull();
  });

  it("explains how a dispute on a milestone was settled", () => {
    render(
      <EngagementMilestones
        milestones={[m(1, "COMPLETED", 100000, { disputeOutcome: "RELEASE" }), m(2, "ACTIVE", 150000)]}
      />
    );
    expect(screen.getByText(/dispute was settled: paid to the freelancer/)).not.toBeNull();
  });

  it("marks milestones that were cancelled when the contract ended", () => {
    render(<EngagementMilestones milestones={[m(1, "CANCELLED", 100000), m(2, "CANCELLED", 150000)]} />);
    expect(screen.getAllByText("Cancelled")).toHaveLength(2);
  });

  it("shows when a milestone is due, and flags one that is overdue", () => {
    render(
      <EngagementMilestones
        milestones={[m(1, "ACTIVE", 100000, { dueDate: "2020-01-01" }), m(2, "UPCOMING", 150000, { dueDate: "2099-01-10" })]}
      />
    );
    const overdue = screen.getByText(/Overdue · due/);
    expect(overdue.textContent).toMatch(/2020/);
    expect(overdue.className).toContain("text-error-600");

    const upcoming = screen.getByText(/^Due .*2099/);
    expect(upcoming.className).not.toContain("text-error-600");
  });

  it("says nothing about the date of a milestone that is already paid", () => {
    render(
      <EngagementMilestones
        milestones={[m(1, "COMPLETED", 100000, { dueDate: "2020-01-01" }), m(2, "ACTIVE", 150000)]}
      />
    );
    expect(screen.queryByText(/Overdue/)).toBeNull();
    expect(screen.queryByText(/2020/)).toBeNull();
  });

  it("renders nothing for a contract with a single payment", () => {
    const { container } = render(<EngagementMilestones milestones={[m(1, "ACTIVE", 250000)]} />);
    expect(container.textContent).toBe("");
  });
});

describe("the weeks of an hourly contract", () => {
  const week = (position: number, status: MilestoneStatus, extra: Partial<EngagementMilestone> = {}) =>
    m(position, status, 60000, {
      kind: "WEEK",
      title: `Week ${position}`,
      periodStart: "2026-11-04",
      periodEnd: "2026-11-10",
      ...extra,
    });

  it("is headed 'Weeks', and counts weeks paid", () => {
    render(<EngagementMilestones milestones={[week(1, "COMPLETED"), week(2, "ACTIVE")]} />);
    expect(screen.getByRole("heading", { name: "Weeks" })).not.toBeNull();
    expect(screen.getByText("1 week paid")).not.toBeNull();
  });

  it("shows what a paid week actually paid and the hours worked, not the escrow it was funded with", () => {
    render(
      <EngagementMilestones
        milestones={[week(1, "COMPLETED", { loggedMinutes: 1110, billedAmount: 55500 }), week(2, "ACTIVE")]}
      />
    );
    const [paid, current] = within(screen.getByRole("list")).getAllByRole("listitem");

    expect(paid.textContent).toContain("Week 1");
    expect(paid.textContent).toContain("18h 30m");
    expect(paid.textContent).toContain("₦55,500");
    expect(paid.textContent).not.toContain("60,000");
    // The week still open can cost at most what was funded.
    expect(current.textContent).toContain("up to ₦60,000");
  });

  it("names the days each week covers", () => {
    render(<EngagementMilestones milestones={[week(1, "COMPLETED", { billedAmount: 1000 }), week(2, "ACTIVE")]} />);
    expect(screen.getAllByText(/4.*Nov.*–.*10.*Nov/)).toHaveLength(2);
  });

  it("does not flag a week's own end date as overdue", () => {
    render(
      <EngagementMilestones
        milestones={[week(1, "COMPLETED", { billedAmount: 1000 }), week(2, "ACTIVE", { dueDate: "2020-01-01" })]}
      />
    );
    expect(screen.queryByText(/Overdue/)).toBeNull();
  });

  it("lists only the latest few weeks of a long contract, and says how many it left out", () => {
    const many = Array.from({ length: 8 }, (_, i) => week(i + 1, i < 7 ? "COMPLETED" : "ACTIVE", { billedAmount: 1000 }));
    render(<EngagementMilestones milestones={many} />);

    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByText("3 earlier weeks not shown")).not.toBeNull();
    expect(screen.getByText("7 weeks paid")).not.toBeNull();
    expect(screen.queryByText(/^Week 1\b/)).toBeNull();
    expect(screen.getByText(/^Week 8\b/)).not.toBeNull();
  });

  it("says nothing about earlier weeks when there are few", () => {
    render(<EngagementMilestones milestones={[week(1, "COMPLETED", { billedAmount: 1000 }), week(2, "ACTIVE")]} />);
    expect(screen.queryByText(/earlier/)).toBeNull();
  });
});

describe("EngagementMilestones service fee", () => {
  const paidWithFee = [
    m(1, "COMPLETED", 100000, { feeAmount: 10000 }),
    m(2, "ACTIVE", 150000),
    m(3, "UPCOMING", 50000),
  ];

  it("tells the freelancer what a paid milestone came to after the fee", () => {
    render(<EngagementMilestones milestones={paidWithFee} showFee />);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items[0].textContent).toContain("₦90,000 received after the ₦10,000 service fee");
    expect(items[1].textContent).not.toContain("received");
  });

  it("keeps the fee out of the client's view of the same contract", () => {
    render(<EngagementMilestones milestones={paidWithFee} />);
    expect(screen.queryByText(/service fee/)).toBeNull();
  });

  it("says nothing for a milestone that carried no fee", () => {
    render(<EngagementMilestones milestones={[m(1, "COMPLETED", 100000, { feeAmount: 0 }), m(2, "ACTIVE", 1000)]} showFee />);
    expect(screen.queryByText(/service fee/)).toBeNull();
  });
});
