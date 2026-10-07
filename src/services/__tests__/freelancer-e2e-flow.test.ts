import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: mocks.get,
    post: mocks.post,
    patch: mocks.patch,
    delete: mocks.delete,
  },
}));

import {
  listPublicJobs,
  getJobById,
} from "../jobs";
import {
  saveProposalDraftApi,
  submitProposalApi,
  getMyProposalsApi,
} from "../proposals";
import { getFreelancerDashboardApi } from "../freelancer-dashboard";

describe("E2E Freelancer Flow: Browse Jobs -> View Details -> Submit Proposal -> Track in Dashboard", () => {
  const mockJob = {
    id: "job-101",
    employerId: "emp-202",
    employer: {
      id: "emp-202",
      userId: "user-888",
      displayName: "Campus Innovations Ltd",
    },
    title: "Fullstack Next.js Developer for Campus Portal",
    slug: "fullstack-nextjs-developer",
    description: "Build a modern campus portal using Next.js and NestJS.",
    summary: "Fullstack Next.js role",
    requirements: "Experience with React, Next.js, and Node.js.",
    categoryKey: "tech",
    category: { id: "cat-1", name: "Software Development" },
    campus: { id: "camp-1", name: "Main Campus" },
    budgetType: "FIXED",
    budgetMin: 150000,
    budgetMax: 250000,
    currency: "NGN",
    experienceLevel: "INTERMEDIATE",
    estimatedDuration: "1 month",
    locationType: "REMOTE",
    country: "Nigeria",
    state: "Lagos",
    city: "Yaba",
    applicationDeadline: "2026-10-15T00:00:00.000Z",
    status: "PUBLISHED" as const,
    visibility: "PUBLIC",
    publishedAt: "2026-09-20T10:00:00.000Z",
    skills: [{ skillId: "s1", name: "React", slug: "react" }],
    screeningQuestions: [],
    attachments: [],
    proposalCount: 3,
    createdAt: "2026-09-20T10:00:00.000Z",
    updatedAt: "2026-09-20T10:00:00.000Z",
  };

  const mockCreatedProposal = {
    id: "prop-501",
    jobId: "job-101",
    job: { id: "job-101", title: "Fullstack Next.js Developer for Campus Portal", slug: "fullstack-nextjs-developer" },
    freelancerId: "free-303",
    coverLetter: "I have 3+ years experience in React and Node.js with successful campus projects.",
    proposedAmount: "200000.00",
    currency: "NGN",
    estimatedDeliveryDays: 14,
    status: "SUBMITTED",
    submittedAt: "2026-09-29T23:50:00.000Z",
    withdrawnAt: null,
    reviewedAt: null,
    createdAt: "2026-09-29T23:50:00.000Z",
    updatedAt: "2026-09-29T23:50:00.000Z",
  };

  const mockFreelancerProfile = {
    id: "free-303",
    userId: "user-999",
    username: "alex_dev",
    fullName: "Alex Rivera",
    professionalTitle: "Fullstack Software Engineer",
    bio: "Passionate developer building university solutions.",
    hourlyRate: 15000,
    currency: "NGN",
    availabilityStatus: "AVAILABLE",
    verificationStatus: "VERIFIED",
    skills: [{ skillId: "s1", name: "React", slug: "react" }],
    isPublic: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes the full end-to-end freelancer journey seamlessly", async () => {
    // ----------------------------------------------------
    // STEP 1: Freelancer browses available opportunities
    // ----------------------------------------------------
    mocks.get.mockResolvedValueOnce({
      data: {
        items: [mockJob],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      },
      error: null,
    });

    const jobListResult = await listPublicJobs({ search: "Next.js" });
    expect(jobListResult.error).toBeNull();
    expect(jobListResult.jobs).toHaveLength(1);
    expect(jobListResult.jobs[0].title).toBe("Fullstack Next.js Developer for Campus Portal");
    expect(jobListResult.jobs[0].budgetMin).toBe(150000);

    // ----------------------------------------------------
    // STEP 2: Freelancer opens job details page
    // ----------------------------------------------------
    mocks.get.mockResolvedValueOnce({
      data: mockJob,
      error: null,
    });

    const { job: jobDetail, error: jobError } = await getJobById("job-101");
    expect(jobError).toBeNull();
    expect(jobDetail).not.toBeNull();
    expect(jobDetail?.id).toBe("job-101");
    expect(jobDetail?.skills[0].name).toBe("React");
    expect(jobDetail?.employer.displayName).toBe("Campus Innovations Ltd");

    // ----------------------------------------------------
    // STEP 3: Freelancer saves a draft proposal
    // ----------------------------------------------------
    mocks.post.mockResolvedValueOnce({
      data: {
        ...mockCreatedProposal,
        status: "DRAFT",
      },
      error: null,
    });

    const draftResult = await saveProposalDraftApi({
      opportunityId: "job-101",
      coverLetter: "Working on draft proposal...",
      proposedAmount: 200000,
      delivery: { value: 2, unit: "weeks" },
      screeningAnswers: [],
      attachments: [],
    });
    expect(draftResult.error).toBeNull();
    expect(draftResult.proposal).not.toBeNull();
    expect(draftResult.proposal?.status).toBe("draft");

    // ----------------------------------------------------
    // STEP 4: Freelancer submits the final proposal
    // ----------------------------------------------------
    mocks.post.mockResolvedValueOnce({
      data: mockCreatedProposal,
      error: null,
    });

    const submitResult = await submitProposalApi({
      opportunityId: "job-101",
      coverLetter: "I have 3+ years experience in React and Node.js with successful campus projects.",
      proposedAmount: 200000,
      delivery: { value: 2, unit: "weeks" },
      screeningAnswers: [],
      attachments: [],
    });
    expect(submitResult.error).toBeNull();
    expect(submitResult.proposal).not.toBeNull();
    expect(submitResult.proposal?.proposedAmount).toBe(200000);
    expect(submitResult.proposal?.status).toBe("submitted");

    // ----------------------------------------------------
    // STEP 5: Freelancer checks their proposals tracker
    // ----------------------------------------------------
    mocks.get.mockResolvedValueOnce({
      data: {
        items: [mockCreatedProposal],
        meta: {
          total: 1,
          page: 1,
          limit: 50,
          totalPages: 1,
        },
      },
      error: null,
    });

    const myProposals = await getMyProposalsApi();
    expect(myProposals.error).toBeNull();
    expect(myProposals.proposals).toHaveLength(1);
    expect(myProposals.proposals[0].status).toBe("submitted");
    expect(myProposals.proposals[0].jobTitle).toBe("Fullstack Next.js Developer for Campus Portal");

    // ----------------------------------------------------
    // STEP 6: Freelancer Dashboard KPI & metrics calculation
    // ----------------------------------------------------
    // GET /freelancers/me
    mocks.get.mockResolvedValueOnce({
      data: mockFreelancerProfile,
      error: null,
    });
    // GET /engagements/freelancer/me (contracts)
    mocks.get.mockResolvedValueOnce({
      data: [],
      error: null,
    });
    // GET /proposals/me (dashboard aggregator)
    mocks.get.mockResolvedValueOnce({
      data: {
        items: [mockCreatedProposal],
        meta: {
          total: 1,
          page: 1,
          limit: 50,
          totalPages: 1,
        },
      },
      error: null,
    });
    // experience, education, certifications, portfolio, wallet
    for (const data of [[], [], [], { items: [], meta: { total: 0 } }, { balance: 0 }]) {
      mocks.get.mockResolvedValueOnce({ data, error: null });
    }

    const dashboard = await getFreelancerDashboardApi();
    expect(dashboard).not.toBeNull();
    expect(dashboard?.profile.headline).toBe("Fullstack Software Engineer");
    expect(dashboard?.proposals.submitted).toBe(1);

    const activeProposalsMetric = dashboard?.metrics.find((m) => m.key === "active_proposals");
    expect(activeProposalsMetric?.valueLabel).toBe("1");
  });
});
