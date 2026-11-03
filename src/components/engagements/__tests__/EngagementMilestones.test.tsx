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

  it("renders nothing for a contract with a single payment", () => {
    const { container } = render(<EngagementMilestones milestones={[m(1, "ACTIVE", 250000)]} />);
    expect(container.textContent).toBe("");
  });
});
