import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock("@/lib/api-client", () => ({
  apiClient: { get: mocks.get, post: mocks.post },
}));

import { getMyProposalsApi, mapBackendProposal, submitProposalApi } from "../proposals";

const backendProposal = {
  id: "p1",
  jobId: "j1",
  job: { id: "j1", title: "Build a site", slug: "build-a-site" },
  freelancerId: "f1",
  coverLetter: "I can build this quickly and well.",
  proposedAmount: "250000.00",
  currency: "NGN",
  estimatedDeliveryDays: 14,
  status: "VIEWED",
  submittedAt: "2026-09-01T10:00:00.000Z",
  withdrawnAt: null,
  reviewedAt: "2026-09-02T10:00:00.000Z",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-02T10:00:00.000Z",
};

describe("mapBackendProposal", () => {
  it("maps status, amount, delivery and timeline", () => {
    const p = mapBackendProposal(backendProposal);

    expect(p).toMatchObject({
      id: "p1",
      opportunityId: "j1",
      jobTitle: "Build a site",
      status: "under_review",
      proposedAmount: 250000,
      delivery: { value: 2, unit: "weeks" },
    });
    expect(p.timeline.map((t) => t.status)).toEqual(["submitted", "under_review"]);
  });

  it("treats expired proposals as no longer active", () => {
    expect(mapBackendProposal({ ...backendProposal, status: "EXPIRED" }).status).toBe("withdrawn");
  });
});

describe("proposals API", () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.post.mockReset();
  });

  it("submits the backend DTO shape (jobId, proposedAmount, estimatedDeliveryDays)", async () => {
    mocks.post.mockResolvedValue({ data: backendProposal, error: null });

    const { proposal, error } = await submitProposalApi({
      opportunityId: "j1",
      coverLetter: "I can build this quickly and well.",
      proposedAmount: 250000,
      delivery: { value: 2, unit: "weeks" },
      screeningAnswers: [],
      attachments: [],
    });

    expect(error).toBeNull();
    expect(proposal?.id).toBe("p1");
    expect(mocks.post).toHaveBeenCalledWith("/proposals", {
      jobId: "j1",
      coverLetter: "I can build this quickly and well.",
      proposedAmount: 250000,
      estimatedDeliveryDays: 14,
    });
  });

  it("refuses to submit without an amount instead of sending an invalid request", async () => {
    const { proposal, error } = await submitProposalApi({
      opportunityId: "j1",
      coverLetter: "I can build this quickly and well.",
      delivery: { value: 0, unit: "days" },
      screeningAnswers: [],
      attachments: [],
    });

    expect(proposal).toBeNull();
    expect(error?.message).toMatch(/amount/i);
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("reads the { items, meta } list envelope and maps the backend status filter", async () => {
    mocks.get.mockResolvedValue({
      data: { items: [backendProposal], meta: { total: 1, page: 1, limit: 100, totalPages: 1 } },
      error: null,
    });

    const { proposals } = await getMyProposalsApi({ status: "under_review", limit: 100 });

    expect(mocks.get).toHaveBeenCalledWith("/proposals/me?limit=100&status=VIEWED");
    expect(proposals).toHaveLength(1);
    expect(proposals[0].status).toBe("under_review");
  });
});
