import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());
const postMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-client", () => ({ apiClient: { get: getMock, post: postMock } }));

import { createApiJobModerationService } from "../job-moderation.api";

const service = createApiJobModerationService();

beforeEach(() => {
  getMock.mockReset();
  postMock.mockReset();
});

describe("admin job reports", () => {
  it("asks for open reports by default and reshapes the page, keeping the tab counts", async () => {
    getMock.mockResolvedValue({
      data: {
        items: [{ id: "r1" }],
        meta: { total: 25, page: 2, limit: 10, totalPages: 3 },
        counts: { open: 25, resolved: 4 },
      },
      error: null,
    });

    const result = await service.listReports({
      status: "OPEN",
      targetType: "APPLICANT",
      jobId: "job-1",
      page: 2,
      pageSize: 10,
    });

    expect(getMock).toHaveBeenCalledWith(
      "/admin/job-reports?status=OPEN&targetType=APPLICANT&jobId=job-1&page=2&limit=10"
    );
    expect(result).toEqual({
      items: [{ id: "r1" }],
      page: 2,
      pageSize: 10,
      total: 25,
      totalPages: 3,
      counts: { open: 25, resolved: 4 },
    });
  });

  it("sends no query string when nothing is asked", async () => {
    getMock.mockResolvedValue({
      data: {
        items: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
        counts: { open: 0, resolved: 0 },
      },
      error: null,
    });
    const result = await service.listReports();
    expect(getMock).toHaveBeenCalledWith("/admin/job-reports");
    expect(result.totalPages).toBe(1);
  });

  it("gets one report, and treats an unknown one as missing", async () => {
    getMock.mockResolvedValue({ data: { id: "r1" }, error: null });
    expect(await service.getReport("r1")).toEqual({ id: "r1" });
    expect(getMock).toHaveBeenCalledWith("/admin/job-reports/r1");

    getMock.mockResolvedValue({ data: null, error: { status: 404, message: "Report not found" } });
    expect(await service.getReport("nope")).toBeNull();
  });

  it("resolves a report with what the admin chose", async () => {
    postMock.mockResolvedValue({
      data: { report: { id: "r1" }, refundedAmount: 5000, alsoResolved: 2 },
      error: null,
    });

    const result = await service.resolveReport("r1", {
      action: "TAKE_DOWN",
      note: "Asks for fees",
      refund: true,
    });

    expect(postMock).toHaveBeenCalledWith("/admin/job-reports/r1/resolve", {
      action: "TAKE_DOWN",
      note: "Asks for fees",
      refund: true,
    });
    expect(result.refundedAmount).toBe(5000);
    expect(result.alsoResolved).toBe(2);
  });

  it("explains a refusal in plain words", async () => {
    getMock.mockResolvedValue({ data: {}, error: { status: 403, message: "Forbidden" } });
    await expect(service.listReports()).rejects.toThrow("You don't have permission to do that.");

    getMock.mockResolvedValue({ data: {}, error: { status: 401, message: "Unauthorized" } });
    await expect(service.listReports()).rejects.toThrow("You're signed out. Sign in again to continue.");

    postMock.mockResolvedValue({
      data: null,
      error: { status: 409, message: "This report has already been resolved." },
    });
    await expect(service.resolveReport("r1", { action: "DISMISS" })).rejects.toThrow(
      "This report has already been resolved."
    );
  });
});

describe("admin application review", () => {
  it("reads an application through the admin route", async () => {
    getMock.mockResolvedValue({ data: { id: "app-1", coverNote: "Hi" }, error: null });
    expect(await service.getApplication("app-1")).toEqual({ id: "app-1", coverNote: "Hi" });
    expect(getMock).toHaveBeenCalledWith("/admin/applications/app-1");
  });

  it("asks the admin route for a CV link, not the applicant's or employer's", async () => {
    postMock.mockResolvedValue({
      data: { path: "/cv-files/tok", expiresAt: "2026-11-04T10:05:00Z" },
      error: null,
    });
    const link = await service.getApplicationCvLink("app-1");
    expect(postMock).toHaveBeenCalledWith("/admin/applications/app-1/cv-link");
    expect(link.path).toBe("/cv-files/tok");
  });

  it("fails clearly when the application or CV cannot be opened", async () => {
    getMock.mockResolvedValue({ data: null, error: { status: 404, message: "Application not found" } });
    await expect(service.getApplication("nope")).rejects.toThrow("Application not found");

    postMock.mockResolvedValue({
      data: null,
      error: { status: 404, message: "This CV is no longer available." },
    });
    await expect(service.getApplicationCvLink("app-1")).rejects.toThrow("This CV is no longer available.");
  });
});
