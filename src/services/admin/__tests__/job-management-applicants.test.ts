import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-client", () => ({ apiClient: { get: getMock, post: vi.fn() } }));

import { createApiJobManagementService } from "../job-management.api";

const service = createApiJobManagementService();

beforeEach(() => getMock.mockReset());

describe("admin job applicants", () => {
  it("asks for one page of a posting's applicants and reshapes the page", async () => {
    getMock.mockResolvedValue({
      data: {
        items: [{ id: "a1", name: "Tolu Bello" }],
        meta: { total: 25, page: 2, limit: 10, totalPages: 3 },
      },
      error: null,
    });

    const result = await service.getApplicants("job-1", { page: 2, pageSize: 10 });

    expect(getMock).toHaveBeenCalledWith("/admin/jobs/job-1/applicants?page=2&limit=10");
    expect(result).toEqual({
      items: [{ id: "a1", name: "Tolu Bello" }],
      page: 2,
      pageSize: 10,
      total: 25,
      totalPages: 3,
    });
  });

  it("sends no query string when no page is given", async () => {
    getMock.mockResolvedValue({
      data: { items: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } },
      error: null,
    });
    const result = await service.getApplicants("job-1");
    expect(getMock).toHaveBeenCalledWith("/admin/jobs/job-1/applicants");
    expect(result.totalPages).toBe(1);
  });

  it("explains a refusal in plain words", async () => {
    getMock.mockResolvedValue({ data: {}, error: { status: 403, message: "Forbidden" } });
    await expect(service.getApplicants("job-1")).rejects.toThrow("You don't have permission to do that.");

    getMock.mockResolvedValue({ data: {}, error: { status: 404, message: "Job not found" } });
    await expect(service.getApplicants("job-1")).rejects.toThrow("Job not found");
  });
});
