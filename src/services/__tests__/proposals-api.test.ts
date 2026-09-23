import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }));

vi.mock("@/lib/api-client", () => ({
  apiClient: { get: mocks.get, post: mocks.post, delete: mocks.delete },
}));

import {
  acceptProposalApi,
  discardProposalDraftApi,
  getMyDraftForJobApi,
  getMyProposalsApi,
  getReceivedApplicationsApi,
  mapBackendApplication,
  mapBackendProposal,
  saveProposalDraftApi,
  shortlistProposalApi,
  submitProposalApi,
} from "../proposals";

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
    mocks.delete.mockReset();
  });

  it("submits the backend DTO shape (jobId, proposedAmount, estimatedDeliveryDays)", async () => {
    mocks.post.mockResolvedValue({ data: backendProposal, error: null });

    const { proposal, error } = await submitProposalApi({
      opportunityId: "j1",
      coverLetter: "I can build this quickly and well.",
      proposedAmount: 250000,
      delivery: { value: 2, unit: "weeks" },
      screeningAnswers: [{ questionId: "q1", answer: "Because I ship." }],
      attachments: [{ id: "m1", filename: "cv.pdf", sizeBytes: 10, mimeType: "application/pdf" }],
    });

    expect(error).toBeNull();
    expect(proposal?.id).toBe("p1");
    expect(mocks.post).toHaveBeenCalledWith("/proposals", {
      jobId: "j1",
      coverLetter: "I can build this quickly and well.",
      proposedAmount: 250000,
      estimatedDeliveryDays: 14,
      screeningAnswers: [{ questionId: "q1", answer: "Because I ship." }],
      // attachments are sent as the media ids returned by the upload
      mediaIds: ["m1"],
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

describe("drafts, answers and attachments", () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.post.mockReset();
    mocks.delete.mockReset();
  });

  const draft = {
    ...backendProposal,
    id: "d1",
    status: "DRAFT",
    submittedAt: null,
    reviewedAt: null,
    screeningAnswers: [{ questionId: "q1", answer: "Because I ship." }],
    attachments: [
      { id: "m1", filename: "cv.pdf", sizeBytes: 4096, mimeType: "application/pdf", url: null },
    ],
  };

  it("maps a draft: no timeline or submission date, with answers and attachments", () => {
    const p = mapBackendProposal(draft);

    expect(p.status).toBe("draft");
    expect(p.submittedAt).toBeUndefined();
    expect(p.timeline).toEqual([]);
    expect(p.screeningAnswers).toEqual([{ questionId: "q1", answer: "Because I ship." }]);
    expect(p.attachments).toEqual([
      { id: "m1", filename: "cv.pdf", sizeBytes: 4096, mimeType: "application/pdf" },
    ]);
  });

  it("saves a draft through /proposals/drafts even when the amount is blank", async () => {
    mocks.post.mockResolvedValue({ data: draft, error: null });

    const { proposal } = await saveProposalDraftApi({
      opportunityId: "j1",
      coverLetter: "half",
      delivery: { value: 0, unit: "days" },
      screeningAnswers: [],
      attachments: [],
    });

    expect(proposal?.status).toBe("draft");
    expect(mocks.post).toHaveBeenCalledWith("/proposals/drafts", {
      jobId: "j1",
      coverLetter: "half",
      proposedAmount: undefined,
      estimatedDeliveryDays: undefined,
      screeningAnswers: [],
      mediaIds: [],
    });
  });

  it("finds my draft for a job among my draft proposals", async () => {
    mocks.get.mockResolvedValue({
      data: {
        items: [draft, { ...draft, id: "d2", jobId: "other" }],
        meta: { total: 2, page: 1, limit: 100, totalPages: 1 },
      },
      error: null,
    });

    const { draft: found } = await getMyDraftForJobApi("j1");

    expect(mocks.get).toHaveBeenCalledWith("/proposals/me?limit=100&status=DRAFT");
    expect(found?.id).toBe("d1");
  });

  it("discards a draft with DELETE", async () => {
    mocks.delete.mockResolvedValue({ data: { success: true }, error: null });
    const { error } = await discardProposalDraftApi("d1");
    expect(error).toBeNull();
    expect(mocks.delete).toHaveBeenCalledWith("/proposals/d1");
  });
});

describe("employer applications", () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.post.mockReset();
  });

  const received = {
    ...backendProposal,
    job: { id: "j1", title: "Build a site", slug: "build-a-site", status: "PUBLISHED" },
    freelancer: {
      id: "f1",
      userId: "u1",
      username: "ada",
      fullName: "Ada Nwosu",
      avatar: null,
      headline: "Full-stack developer",
    },
  };

  it("maps a proposal into an application with its job and candidate preview", () => {
    const app = mapBackendApplication(received);

    expect(app.job).toEqual({ id: "j1", title: "Build a site", status: "open" });
    expect(app.candidate).toEqual({
      id: "f1",
      name: "Ada Nwosu",
      headline: "Full-stack developer",
      avatar: undefined,
    });
    expect(app.proposal.status).toBe("under_review");
  });

  it("queries received applications server-side and folds backend counts into UI statuses", async () => {
    mocks.get.mockResolvedValue({
      data: {
        items: [received],
        meta: { total: 1, page: 2, limit: 10, totalPages: 3 },
        counts: { all: 6, SUBMITTED: 2, VIEWED: 1, SHORTLISTED: 1, WITHDRAWN: 1, EXPIRED: 1 },
      },
      error: null,
    });

    const { page, error } = await getReceivedApplicationsApi({
      jobId: "j1",
      status: "under_review",
      search: " ada ",
      sort: "amount_high",
      page: 2,
      size: 10,
    });

    expect(error).toBeNull();
    expect(mocks.get).toHaveBeenCalledWith(
      "/proposals/received?jobId=j1&status=VIEWED&search=ada&sort=amount_high&page=2&limit=10"
    );
    expect(page.items).toHaveLength(1);
    expect(page.totalPages).toBe(3);
    expect(page.counts).toEqual({
      all: 6,
      submitted: 2,
      under_review: 1,
      shortlisted: 1,
      accepted: 0,
      rejected: 0,
      // an expired proposal is shown as withdrawn, so the two add up
      withdrawn: 2,
    });
  });

  it("ignores sort keys the backend does not support", async () => {
    mocks.get.mockResolvedValue({
      data: { items: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 }, counts: { all: 0 } },
      error: null,
    });
    await getReceivedApplicationsApi({ sort: "budget_high" });
    expect(String(mocks.get.mock.calls[0][0])).not.toContain("sort=");
  });

  it("returns an empty page plus the error when the request fails", async () => {
    mocks.get.mockResolvedValue({ data: null, error: { status: 403, message: "No employer profile" } });
    const { page, error } = await getReceivedApplicationsApi({});
    expect(error?.message).toBe("No employer profile");
    expect(page.items).toEqual([]);
    expect(page.counts.all).toBe(0);
  });

  it("returns the hired proposal and the new engagement id on accept", async () => {
    mocks.post.mockResolvedValue({
      data: { proposal: { ...received, status: "ACCEPTED" }, engagementId: "e1" },
      error: null,
    });
    const { proposal, engagementId } = await acceptProposalApi("p1");
    expect(mocks.post).toHaveBeenCalledWith("/proposals/p1/accept");
    expect(proposal?.status).toBe("accepted");
    expect(engagementId).toBe("e1");
  });

  it("maps the proposal returned by shortlist", async () => {
    mocks.post.mockResolvedValue({ data: { ...received, status: "SHORTLISTED" }, error: null });
    const { proposal } = await shortlistProposalApi("p1");
    expect(proposal?.status).toBe("shortlisted");
  });
});
