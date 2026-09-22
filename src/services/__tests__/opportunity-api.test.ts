import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.fn();

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
        data: [],
        total: 0,
        page: 1,
        limit: 9,
        totalPages: 1,
      },
      error: null,
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
      "/jobs?search=figma&categoryId=ec1&experienceLevel=intermediate&locationType=ONSITE&sort=newest&page=2&limit=9"
    );
  });
});
