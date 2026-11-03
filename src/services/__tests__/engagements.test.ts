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

  it("maps the freelancer view: client, amount as a number, no invented milestones", () => {
    const c = engagementToContract(engagement("IN_PROGRESS"));
    expect(c.client.displayName).toBe("Acme Ltd");
    expect(c.agreedAmount).toBe(75000);
    expect(c.milestones).toEqual([]);
    expect(c.canCancel).toBe(false);
    expect(engagementToContract(engagement("FUNDED")).canCancel).toBe(true);
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

  it("employer: stops being offered changes once the limit is used", () => {
    expect(engagementActionsFor("employer", "SUBMITTED", 2)).toContain("revise");
    expect(engagementActionsFor("employer", "SUBMITTED", 3)).toEqual(["complete", "dispute"]);
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
