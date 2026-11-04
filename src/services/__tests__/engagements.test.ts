import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-client", () => ({ apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

import { engagementToContract } from "../contract";
import { engagementToDashboardContract } from "../employer-dashboard";
import { engagementActionsFor } from "@/components/engagements/EngagementActions";
import type { Engagement, EngagementStatus } from "../jobs";

const party = { id: "p", userId: "u", username: "ada", fullName: "Ada Nwosu", avatar: null };
const engagement = (status: EngagementStatus): Engagement => ({
  id: "e1",
  proposalId: "p1",
  jobId: "j1",
  job: { id: "j1", title: "Build a site", slug: "build-a-site" },
  freelancerId: "f1",
  freelancer: party,
  employerId: "em1",
  employer: { ...party, fullName: "Acme Ltd" },
  agreedAmount: "75000" as unknown as number,
  currency: "NGN",
  paymentType: "FIXED",
  hourlyRate: null,
  weeklyHourLimit: null,
  feeRate: null,
  feeMinimum: null,
  revisions: { allowed: 3, used: 0, remaining: 3, requests: [] },
  currentMilestonePosition: 1,
  milestones: [
    {
      id: "m1",
      position: 1,
      title: "Complete project",
      description: null,
      amount: 75000,
      dueDate: null,
      kind: "FIXED" as const,
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
    },
  ],
  status,
  startDate: null,
  expectedCompletionDate: null,
  submittedAt: null,
  autoReleaseAt: null,
  completedAt: null,
  autoReleasedAt: null,
  cancelledAt: null,
  cancellationReason: null,
  revisionNote: null,
  revisionCount: 0,
  dispute: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
});

describe("engagement -> contract mapping", () => {
  it.each([
    ["PENDING_PAYMENT", "AWAITING_FUNDING"],
    ["FUNDED", "ACTIVE"],
    ["IN_PROGRESS", "ACTIVE"],
    ["SUBMITTED", "AWAITING_CLIENT_REVIEW"],
    ["REVISION_REQUESTED", "REVISION_REQUESTED"],
    ["COMPLETED", "COMPLETED"],
    ["DISPUTED", "DISPUTED"],
    ["CANCELLED", "CANCELLED"],
  ] as const)("%s shows as %s on both sides", (backend, expected) => {
    expect(engagementToContract(engagement(backend)).status).toBe(expected);
    expect(engagementToDashboardContract(engagement(backend)).status).toBe(expected);
  });

  it("maps the freelancer view: client, amount as a number, and the single payment as one milestone", () => {
    const c = engagementToContract(engagement("IN_PROGRESS"));
    expect(c.client.displayName).toBe("Acme Ltd");
    expect(c.agreedAmount).toBe(75000);
    expect(c.totalMilestones).toBe(1);
    expect(c.milestones.map((m) => [m.title, m.status])).toEqual([["Complete project", "ACTIVE"]]);
    expect(c.canCancel).toBe(false);
    expect(engagementToContract(engagement("FUNDED")).canCancel).toBe(true);
  });

  describe("with several milestones", () => {
    const milestone = (position: number, status: "UPCOMING" | "ACTIVE" | "COMPLETED" | "CANCELLED", amount: number) => ({
      id: `m${position}`,
      position,
      title: ["", "Design", "Build", "Launch"][position],
      description: null,
      amount,
      dueDate: null,
      kind: "FIXED" as const,
      periodStart: null,
      periodEnd: null,
      loggedMinutes: 0,
      billedAmount: null,
      feeAmount: null,
      status,
      completedAt: status === "COMPLETED" ? "2026-09-10T00:00:00.000Z" : null,
      autoReleased: false,
      disputeOutcome: null,
      disputeResolution: null,
    });
    const threeMilestones = (backend: EngagementStatus): Engagement => ({
      ...engagement(backend),
      agreedAmount: 300000,
      paymentType: "FIXED",
      hourlyRate: null,
      weeklyHourLimit: null,
      currentMilestonePosition: 2,
      milestones: [milestone(1, "COMPLETED", 100000), milestone(2, "ACTIVE", 150000), milestone(3, "UPCOMING", 50000)],
    });

    it("shows real milestones, how many are paid, and progress", () => {
      const c = engagementToContract(threeMilestones("IN_PROGRESS"));
      expect(c.totalMilestones).toBe(3);
      expect(c.completedMilestones).toBe(1);
      expect(c.progress).toBe(33);
      expect(c.currentMilestone).toBe("Build");
      expect(c.milestones.map((m) => [m.title, m.status])).toEqual([
        ["Design", "COMPLETED"],
        ["Build", "ACTIVE"],
        ["Launch", "PENDING"],
      ]);
    });

    it("shows the current milestone as submitted while it awaits the client's review", () => {
      const c = engagementToContract(threeMilestones("SUBMITTED"));
      expect(c.milestones.map((m) => m.status)).toEqual(["COMPLETED", "SUBMITTED", "PENDING"]);
    });

    it("shows a revision request on the current milestone only", () => {
      const c = engagementToContract(threeMilestones("REVISION_REQUESTED"));
      expect(c.milestones.map((m) => m.status)).toEqual(["COMPLETED", "REVISION_REQUESTED", "PENDING"]);
    });

    it("is 100% only once the whole contract is complete", () => {
      expect(engagementToContract(threeMilestones("COMPLETED")).progress).toBe(100);
      expect(engagementToContract(threeMilestones("IN_PROGRESS")).progress).toBeLessThan(100);
    });
  });

  it("maps the employer view with the freelancer name and raw status", () => {
    const c = engagementToDashboardContract(engagement("SUBMITTED"));
    expect(c.freelancerName).toBe("Ada Nwosu");
    expect(c.engagementStatus).toBe("SUBMITTED");
    expect(c.nextAction).toMatch(/review/i);
  });

  it("tells the freelancer to resubmit when changes were requested", () => {
    expect(engagementToContract(engagement("REVISION_REQUESTED")).nextAction).toMatch(/resubmit/i);
  });
});

describe("which next steps each party is offered", () => {
  it("employer: fund -> start -> approve, may ask for changes, and may cancel before work starts", () => {
    expect(engagementActionsFor("employer", "PENDING_PAYMENT")).toEqual(["fund", "cancel"]);
    expect(engagementActionsFor("employer", "FUNDED")).toEqual(["start", "cancel"]);
    expect(engagementActionsFor("employer", "SUBMITTED")).toEqual(["complete", "revise", "dispute"]);
  });

  it("employer: can report a problem while work is underway, but not cancel", () => {
    expect(engagementActionsFor("employer", "IN_PROGRESS")).toEqual(["dispute"]);
    expect(engagementActionsFor("employer", "REVISION_REQUESTED")).toEqual(["dispute"]);
  });

  it("employer: still responds to submitted work with every revision used, because a mistake can still be reported", () => {
    // The count lives on the contract and the form closes only what is closed;
    // the buttons do not depend on it any more.
    expect(engagementActionsFor("employer", "SUBMITTED")).toEqual(["complete", "revise", "dispute"]);
  });

  it("freelancer: submits (or resubmits), can withdraw a submission, and can decline before funding", () => {
    expect(engagementActionsFor("freelancer", "PENDING_PAYMENT")).toEqual(["cancel"]);
    expect(engagementActionsFor("freelancer", "IN_PROGRESS")).toEqual(["submit", "dispute"]);
    expect(engagementActionsFor("freelancer", "SUBMITTED")).toEqual(["withdraw", "dispute"]);
    expect(engagementActionsFor("freelancer", "REVISION_REQUESTED")).toEqual(["submit", "dispute"]);
  });

  it("offers nothing once an engagement is finished or waiting on an admin", () => {
    for (const status of ["COMPLETED", "CANCELLED", "DISPUTED"] as const) {
      expect(engagementActionsFor("employer", status)).toEqual([]);
      expect(engagementActionsFor("freelancer", status)).toEqual([]);
    }
  });
});

describe("an hourly contract in the freelancer's contract view", () => {
  const week = (position: number, status: "ACTIVE" | "COMPLETED") => ({
    id: `w${position}`,
    position,
    title: `Week ${position}`,
    description: null,
    amount: 60000,
    dueDate: null,
    kind: "WEEK" as const,
    periodStart: "2026-11-04",
    periodEnd: "2026-11-10",
    loggedMinutes: 0,
    billedAmount: null,
    feeAmount: null,
    status,
    completedAt: null,
    autoReleased: false,
    disputeOutcome: null,
    disputeResolution: null,
  });
  const hourly = (backend: EngagementStatus): Engagement => ({
    ...engagement(backend),
    paymentType: "HOURLY",
    hourlyRate: 3000,
    weeklyHourLimit: 20,
    agreedAmount: 60000,
    currentMilestonePosition: 3,
    milestones: [week(1, "COMPLETED"), week(2, "COMPLETED"), week(3, "ACTIVE")],
  });

  it("is never partway complete: it runs until it is ended, however many weeks are paid", () => {
    expect(engagementToContract(hourly("IN_PROGRESS")).progress).toBe(0);
  });

  it("is complete only once the contract has ended", () => {
    expect(engagementToContract(hourly("COMPLETED")).progress).toBe(100);
  });

  it("still counts the paid weeks", () => {
    const c = engagementToContract(hourly("IN_PROGRESS"));
    expect(c.totalMilestones).toBe(3);
    expect(c.completedMilestones).toBe(2);
  });

  it("does not change how a fixed-price contract's progress is worked out", () => {
    const fixed: Engagement = {
      ...engagement("IN_PROGRESS"),
      currentMilestonePosition: 2,
      milestones: [
        { ...week(1, "COMPLETED"), kind: "FIXED" },
        { ...week(2, "ACTIVE"), kind: "FIXED" },
      ],
    };
    expect(engagementToContract(fixed).progress).toBe(50);
  });
});
