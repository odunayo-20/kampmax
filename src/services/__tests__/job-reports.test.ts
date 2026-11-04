import { beforeEach, describe, expect, it, vi } from "vitest";

const postMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-client", () => ({ apiClient: { post: postMock } }));

import { reportApplicant, reportPosting } from "../job-reports";

beforeEach(() => postMock.mockReset());

const receipt = { id: "rep-1", targetType: "POSTING", status: "OPEN", createdAt: "2026-11-04T10:00:00Z" };

describe("reportPosting", () => {
  it("posts the reason and trimmed details to the posting's report route", async () => {
    postMock.mockResolvedValue({ data: receipt, error: null });

    const out = await reportPosting("job-1", { reason: "SCAM", details: "  asks for money  " });

    expect(postMock).toHaveBeenCalledWith("/jobs/job-1/report", {
      reason: "SCAM",
      details: "asks for money",
    });
    expect(out).toEqual({ receipt, error: null });
  });

  it("leaves out details that are blank", async () => {
    postMock.mockResolvedValue({ data: receipt, error: null });
    await reportPosting("job-1", { reason: "SPAM", details: "   " });
    expect(postMock).toHaveBeenCalledWith("/jobs/job-1/report", { reason: "SPAM" });
  });

  it("hands back the error, such as having already reported", async () => {
    const error = { status: 409, message: "You already reported this. Our team will review it." };
    postMock.mockResolvedValue({ data: null, error });
    expect(await reportPosting("job-1", { reason: "SCAM" })).toEqual({ receipt: null, error });
  });
});

describe("reportApplicant", () => {
  it("posts to the application's report route", async () => {
    postMock.mockResolvedValue({ data: { ...receipt, targetType: "APPLICANT" }, error: null });

    const out = await reportApplicant("app-1", { reason: "ABUSIVE" });

    expect(postMock).toHaveBeenCalledWith("/applications/app-1/report", { reason: "ABUSIVE" });
    expect(out.receipt?.targetType).toBe("APPLICANT");
    expect(out.error).toBeNull();
  });

  it("hands back the error when it is refused", async () => {
    const error = { status: 404, message: "Application not found" };
    postMock.mockResolvedValue({ data: null, error });
    expect(await reportApplicant("app-1", { reason: "ABUSIVE" })).toEqual({ receipt: null, error });
  });
});
