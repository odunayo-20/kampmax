import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: getMock,
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
      "/jobs?search=figma&categoryId=ec1&experienceLevel=MIDLEVEL&locationType=ONSITE&sort=newest&page=2&limit=9"
    );
  });
});
