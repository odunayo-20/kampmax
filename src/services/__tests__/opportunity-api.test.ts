import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());
const postMock = vi.hoisted(() => vi.fn());
const patchMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: getMock,
    post: postMock,
    patch: patchMock,
  },
}));

import { getOpportunitiesPageApi } from "../opportunity";

describe("getOpportunitiesPageApi", () => {
  beforeEach(() => {
    getMock.mockReset();
    getMock.mockResolvedValue({
      data: {
        items: [],
        meta: { total: 0, page: 1, limit: 9, totalPages: 1 },
      },
      error: null,
    });
  });

  it("maps the backend { items, meta } envelope and job shape", async () => {
    getMock.mockResolvedValue({
      data: {
        items: [
          {
            id: "j1",
            employer: { id: "e1", userId: "u9", displayName: "Acme" },
            title: "Build a site",
            description: "Landing page",
            category: { id: "c1", name: "Web" },
            campus: null,
            budgetType: "FIXED",
            budgetMin: "5000",
            budgetMax: 9000,
            experienceLevel: "MIDLEVEL",
            estimatedDuration: "3 weeks",
            locationType: "REMOTE",
            state: null,
            city: "Owo",
            applicationDeadline: null,
            status: "PUBLISHED",
            publishedAt: "2026-09-01T00:00:00.000Z",
            skills: [{ name: "React" }],
            createdAt: "2026-08-30T00:00:00.000Z",
          },
        ],
        meta: { total: 1, page: 1, limit: 9, totalPages: 1 },
      },
      error: null,
    });

    const { page } = await getOpportunitiesPageApi({});

    expect(page.total).toBe(1);
    expect(page.items[0]).toMatchObject({
      id: "j1",
      status: "open",
      workArrangement: "remote",
      skills: ["React"],
      duration: "few_weeks",
      budget: { type: "project", min: 5000, max: 9000 },
      employer: { name: "Acme" },
      employerUserId: "u9",
    });
  });

  it("serializes filters to the NestJS job query contract", async () => {
    await getOpportunitiesPageApi({
      search: "figma",
      categoryId: "ec1",
      experience: "intermediate",
      arrangement: "on_site",
      sort: "newest",
      page: 2,
      size: 9,
    });

    expect(getMock).toHaveBeenCalledWith(
      "/jobs?search=figma&categoryKey=ec1&experienceLevel=MIDLEVEL&locationType=ONSITE&sort=newest&page=2&limit=9"
    );
  });

  it("drops filters the backend does not support instead of sending a 400", async () => {
    await getOpportunitiesPageApi({ sort: "budget_high", campusId: "rugipo", size: 9 });
    const url = String(getMock.mock.calls[0][0]);
    expect(url).not.toContain("sort=");
    expect(url).not.toContain("campusId=");
  });
});

const backendJob = {
  id: "11111111-1111-4111-8111-111111111111",
  employerId: "e1",
  employer: { id: "e1", userId: "u9", displayName: "Acme" },
  title: "Build a site",
  slug: "build-a-site",
  description: "Landing page",
  requirements: "Must know React",
  categoryKey: "ec1",
  category: null,
  campus: null,
  budgetType: "HOURLY",
  budgetMin: 5000,
  budgetMax: 9000,
  currency: "NGN",
  experienceLevel: "SENIOR",
  estimatedDuration: "1–3 months",
  locationType: "HYBRID",
  country: null,
  state: "Lagos",
  city: "Yaba",
  applicationDeadline: "2026-12-31T23:59:59.000Z",
  status: "DRAFT",
  visibility: "PUBLIC",
  publishedAt: null,
  skills: [{ skillId: "s1", name: "React", slug: "react" }],
  screeningQuestions: [{ id: "q1", question: "Why?", optional: false }],
  attachments: [
    { id: "m1", filename: "brief.pdf", sizeBytes: 2048, mimeType: "application/pdf", url: null },
  ],
  proposalCount: 4,
  createdAt: "2026-08-30T00:00:00.000Z",
  updatedAt: "2026-08-30T00:00:00.000Z",
};

describe("employer job API", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    patchMock.mockReset();
  });

  it("maps every backend job field into the Opportunity model", async () => {
    getMock.mockResolvedValue({ data: backendJob, error: null });
    const { getMyJobByIdApi } = await import("../opportunity");

    const { job, error } = await getMyJobByIdApi(backendJob.id);

    expect(error).toBeNull();
    expect(getMock).toHaveBeenCalledWith(`/jobs/me/${backendJob.id}`);
    expect(job).toMatchObject({
      status: "draft",
      categoryId: "ec1",
      requirements: "Must know React",
      workArrangement: "hybrid",
      budget: { type: "hourly", min: 5000, max: 9000 },
      duration: "one_to_three_months",
      experienceLevel: "experienced",
      deadline: "2026-12-31",
      proposalCount: 4,
      screeningQuestions: [{ id: "q1", question: "Why?", optional: false }],
      attachments: [{ id: "m1", filename: "brief.pdf", sizeBytes: 2048, mimeType: "application/pdf" }],
      location: { city: "Yaba", state: "Lagos", remote: false },
    });
  });

  it("asks the backend for only the statuses behind a UI tab", async () => {
    getMock.mockResolvedValue({
      data: { items: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } },
      error: null,
    });
    const { getMyJobsApi } = await import("../opportunity");

    await getMyJobsApi(1, 20, "closed");
    await getMyJobsApi(1, 20, "all");

    expect(getMock).toHaveBeenNthCalledWith(1, "/jobs/me?page=1&limit=20&status=PAUSED%2CCLOSED");
    expect(getMock).toHaveBeenNthCalledWith(2, "/jobs/me?page=1&limit=20");
  });

  it("creates a job with exactly the fields the backend accepts", async () => {
    postMock.mockResolvedValue({ data: backendJob, error: null });
    const { createJobApi } = await import("../opportunity");

    await createJobApi({
      title: " Build a site ",
      categoryId: "ec1",
      summary: " A landing page for a campus shop ",
      description: "Landing page",
      requirements: "Must know React",
      skills: ["React"],
      workArrangement: "on_campus",
      location: { city: "Yaba", state: "Lagos", campusId: "rugipo" },
      budget: { type: "project", min: 5000, max: 9000, currency: "NGN" },
      duration: "few_weeks",
      experienceLevel: "intermediate",
      deadline: "2026-12-31",
      screeningQuestions: [
        { id: "sq1", question: "Why?", optional: false },
        { id: "22222222-2222-4222-8222-222222222222", question: "Rate?", optional: true },
      ],
      attachments: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          filename: "brief.pdf",
          sizeBytes: 2048,
          mimeType: "application/pdf",
        },
      ],
    });

    const [path, body] = postMock.mock.calls[0];
    expect(path).toBe("/jobs");
    expect(body).toEqual({
      title: "Build a site",
      description: "Landing page",
      summary: "A landing page for a campus shop",
      requirements: "Must know React",
      categoryKey: "ec1",
      budgetType: "FIXED",
      budgetMin: 5000,
      budgetMax: 9000,
      currency: "NGN",
      experienceLevel: "MIDLEVEL",
      estimatedDuration: "A few weeks",
      locationType: "ONSITE",
      state: "Lagos",
      city: "Yaba",
      applicationDeadline: "2026-12-31T23:59:59.000Z",
      skills: ["React"],
      // local ids are dropped so the backend mints real ones; real ids are kept
      screeningQuestions: [
        { id: undefined, question: "Why?", optional: false },
        { id: "22222222-2222-4222-8222-222222222222", question: "Rate?", optional: true },
      ],
      mediaIds: ["33333333-3333-4333-8333-333333333333"],
    });
    // "rugipo" is a mock campus slug, not a backend id, so it must not be sent
    expect(JSON.parse(JSON.stringify(body))).not.toHaveProperty("campusId");
  });

  it("sends null for fields cleared while editing so they actually clear", async () => {
    patchMock.mockResolvedValue({ data: backendJob, error: null });
    const { updateJobApi } = await import("../opportunity");

    await updateJobApi(backendJob.id, {
      title: "Build a site",
      categoryId: "",
      summary: "",
      description: "",
      requirements: "",
      skills: [],
      workArrangement: "remote",
      location: {},
      budget: { type: "hourly", currency: "NGN" },
      duration: "long_term",
      experienceLevel: "any_level",
      deadline: "",
      screeningQuestions: [],
    });

    const [path, body] = patchMock.mock.calls[0];
    expect(path).toBe(`/jobs/${backendJob.id}`);
    expect(body).toMatchObject({
      description: null,
      requirements: null,
      categoryKey: null,
      budgetMin: null,
      budgetMax: null,
      experienceLevel: null,
      applicationDeadline: null,
      budgetType: "HOURLY",
      locationType: "REMOTE",
    });
  });

  it("returns the backend error instead of a job when the request fails", async () => {
    postMock.mockResolvedValue({ data: null, error: { status: 403, message: "An employer profile is required" } });
    const { publishJobApi } = await import("../opportunity");

    const result = await publishJobApi(backendJob.id);

    expect(result.job).toBeNull();
    expect(result.error?.message).toMatch(/employer profile/);
  });
});
