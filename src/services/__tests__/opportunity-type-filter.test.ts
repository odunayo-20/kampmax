import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-client", () => ({ apiClient: { get: getMock } }));

import { getOpportunitiesPageApi } from "../opportunity";
import { jobListFiltersToQuery } from "@/lib/job-api-mapping";

beforeEach(() => {
  getMock.mockReset();
  getMock.mockResolvedValue({
    data: { items: [], meta: { total: 0, page: 1, limit: 9, totalPages: 1 } },
    error: null,
  });
});

describe("filtering the public job list by kind of posting", () => {
  it("asks the server for only that kind", async () => {
    await getOpportunitiesPageApi({ type: "internship" });
    expect(getMock.mock.calls[0][0]).toContain("opportunityType=INTERNSHIP");
  });

  it("asks only for gigs when Find Work says so", async () => {
    await getOpportunitiesPageApi({ type: "gig", search: "logo" });
    const url = getMock.mock.calls[0][0] as string;
    expect(url).toContain("opportunityType=GIG");
    expect(url).toContain("search=logo");
  });

  it("asks for every kind when no kind is chosen", async () => {
    await getOpportunitiesPageApi({});
    expect(getMock.mock.calls[0][0]).not.toContain("opportunityType");
  });

  it("maps each UI kind to the server's name", () => {
    const query = (type: Parameters<typeof jobListFiltersToQuery>[0]["type"]) =>
      jobListFiltersToQuery({ type }).opportunityType;
    expect(query("full_time")).toBe("FULL_TIME");
    expect(query("part_time")).toBe("PART_TIME");
    expect(query("contract")).toBe("CONTRACT");
    expect(query(undefined)).toBeUndefined();
  });
});
