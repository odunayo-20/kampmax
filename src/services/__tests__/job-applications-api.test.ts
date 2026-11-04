import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());
const postMock = vi.hoisted(() => vi.fn());
const patchMock = vi.hoisted(() => vi.fn());
const deleteMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  apiClient: { get: getMock, post: postMock, patch: patchMock, delete: deleteMock },
}));
vi.mock("@/lib/auth-storage", () => ({ getAccessToken: () => "token-123" }));

import {
  applyToJob,
  cvLinkUrl,
  deleteCv,
  downloadCv,
  getApplicationCvLink,
  getCvLink,
  listCvs,
  listJobApplicants,
  listMyApplications,
  renameCv,
  setApplicationStatus,
  uploadCv,
  withdrawApplication,
} from "../job-applications";

const ok = <T>(data: T) => ({ data, error: null });
const failure = (message: string, status = 400) => ({ data: {}, error: { message, status } });

beforeEach(() => {
  getMock.mockReset();
  postMock.mockReset();
  patchMock.mockReset();
  deleteMock.mockReset();
});

describe("CV library", () => {
  it("lists my CVs", async () => {
    getMock.mockResolvedValue(ok([{ id: "cv-1", label: "Design CV" }]));
    const { cvs, error } = await listCvs();
    expect(getMock).toHaveBeenCalledWith("/cvs");
    expect(cvs).toEqual([{ id: "cv-1", label: "Design CV" }]);
    expect(error).toBeNull();
  });

  it("returns an empty list, not a crash, when it cannot load", async () => {
    getMock.mockResolvedValue(failure("down", 500));
    const { cvs, error } = await listCvs();
    expect(cvs).toEqual([]);
    expect(error?.message).toBe("down");
  });

  it("renames a CV", async () => {
    patchMock.mockResolvedValue(ok({ id: "cv-1", label: "General" }));
    const { cv } = await renameCv("cv-1", "General");
    expect(patchMock).toHaveBeenCalledWith("/cvs/cv-1", { label: "General" });
    expect(cv?.label).toBe("General");
  });

  it("deletes a CV and says whether an application still holds the file", async () => {
    deleteMock.mockResolvedValue(ok({ fileKept: true }));
    await expect(deleteCv("cv-1")).resolves.toEqual({ fileKept: true, error: null });
    expect(deleteMock).toHaveBeenCalledWith("/cvs/cv-1");

    deleteMock.mockResolvedValue(failure("not found", 404));
    const { fileKept, error } = await deleteCv("cv-2");
    expect(fileKept).toBe(false);
    expect(error?.status).toBe(404);
  });

  it("asks for a fresh download link for one of my CVs", async () => {
    postMock.mockResolvedValue(ok({ path: "/cv-files/abc.def", expiresAt: "2026-11-04T10:05:00Z" }));
    const { link } = await getCvLink("cv-1");
    expect(postMock).toHaveBeenCalledWith("/cvs/cv-1/link");
    expect(link?.path).toBe("/cv-files/abc.def");
  });
});

describe("uploadCv", () => {
  afterEach(() => vi.unstubAllGlobals());

  const file = new File([new Uint8Array(10)], "ada.pdf", { type: "application/pdf" });
  const respond = (status: number, body: unknown) => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  };

  it("sends the file and name as multipart with the sign-in token, and returns the saved CV", async () => {
    const fetchMock = respond(201, { data: { id: "cv-9", label: "Design CV" } });

    const { cv, error } = await uploadCv(file, "  Design CV ");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/cvs$/);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ Authorization: "Bearer token-123" });
    const body = init.body as FormData;
    expect(body.get("file")).toBeInstanceOf(File);
    expect(body.get("label")).toBe("Design CV");
    expect(cv).toEqual({ id: "cv-9", label: "Design CV" });
    expect(error).toBeNull();
  });

  it("sends no label when none is given", async () => {
    const fetchMock = respond(201, { data: { id: "cv-9" } });
    await uploadCv(file);
    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBeInstanceOf(FormData);
    expect(((fetchMock.mock.calls[0][1] as RequestInit).body as FormData).has("label")).toBe(false);
  });

  it("reports the server's own reason for a bad file", async () => {
    respond(400, {
      message: "File validation failed",
      errors: [{ field: "content", message: "This file is not a real PDF or Word (.docx) document" }],
    });
    const { cv, error } = await uploadCv(file);
    expect(cv).toBeNull();
    expect(error?.message).toBe("This file is not a real PDF or Word (.docx) document");
    expect(error?.status).toBe(400);
  });

  it("reports a full library", async () => {
    respond(409, { message: "You can keep up to 3 CVs. Delete one to add another." });
    const { error } = await uploadCv(file);
    expect(error?.message).toBe("You can keep up to 3 CVs. Delete one to add another.");
    expect(error?.status).toBe(409);
  });

  it("joins a list of validation messages", async () => {
    respond(400, { message: ["a", "b"] });
    expect((await uploadCv(file)).error?.message).toBe("a, b");
  });

  it("explains an offline failure instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const { cv, error } = await uploadCv(file);
    expect(cv).toBeNull();
    expect(error?.message).toMatch(/Couldn't reach the server/);
  });
});

describe("applying", () => {
  it("applies with a saved CV, a note and answers", async () => {
    postMock.mockResolvedValue(ok({ id: "app-1", status: "SUBMITTED" }));
    const input = { cvId: "cv-1", coverNote: "Hi", screeningAnswers: [{ questionId: "q1", answer: "A" }] };

    const { application } = await applyToJob("job-1", input);

    expect(postMock).toHaveBeenCalledWith("/jobs/job-1/apply", input);
    expect(application?.id).toBe("app-1");
  });

  it("returns the refusal rather than an application", async () => {
    postMock.mockResolvedValue(failure("You already applied to this posting.", 409));
    const { application, error } = await applyToJob("job-1", { cvId: "cv-1" });
    expect(application).toBeNull();
    expect(error?.message).toBe("You already applied to this posting.");
  });

  it("lists my applications, optionally for one posting", async () => {
    getMock.mockResolvedValue(
      ok({ items: [{ id: "app-1" }], meta: { total: 1, page: 1, limit: 5, totalPages: 1 } })
    );

    const result = await listMyApplications({ page: 2, limit: 5, jobId: "job-1" });

    expect(getMock).toHaveBeenCalledWith("/applications/me?page=2&limit=5&jobId=job-1");
    expect(result).toMatchObject({ total: 1, page: 1, totalPages: 1 });
    expect(result.applications).toEqual([{ id: "app-1" }]);
  });

  it("asks for no query string when there is nothing to filter", async () => {
    getMock.mockResolvedValue(ok({ items: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } }));
    await listMyApplications();
    expect(getMock).toHaveBeenCalledWith("/applications/me");
  });

  it("withdraws an application", async () => {
    postMock.mockResolvedValue(ok({ id: "app-1", status: "WITHDRAWN" }));
    const { application } = await withdrawApplication("app-1");
    expect(postMock).toHaveBeenCalledWith("/applications/app-1/withdraw");
    expect(application?.status).toBe("WITHDRAWN");
  });
});

describe("employer", () => {
  it("lists the applicants to a posting, filtered by status", async () => {
    getMock.mockResolvedValue(ok({ items: [], meta: {}, counts: {}, job: {} }));
    await listJobApplicants("job-1", { status: "SHORTLISTED", page: 2, limit: 20 });
    expect(getMock).toHaveBeenCalledWith("/jobs/me/job-1/applications?status=SHORTLISTED&page=2&limit=20");
  });

  it("returns the refusal when the posting is not theirs", async () => {
    getMock.mockResolvedValue(failure("Job not found", 404));
    const { result, error } = await listJobApplicants("job-9");
    expect(result).toBeNull();
    expect(error?.status).toBe(404);
  });

  it("sets a decision with a trimmed message, and leaves it out when blank", async () => {
    patchMock.mockResolvedValue(ok({ id: "app-1", status: "HIRED" }));

    await setApplicationStatus("app-1", "HIRED", "  Welcome aboard  ");
    expect(patchMock).toHaveBeenLastCalledWith("/applications/app-1/status", {
      status: "HIRED",
      note: "Welcome aboard",
    });

    await setApplicationStatus("app-1", "REJECTED", "   ");
    expect(patchMock).toHaveBeenLastCalledWith("/applications/app-1/status", { status: "REJECTED" });
  });

  it("asks for a fresh link to an applicant's CV", async () => {
    postMock.mockResolvedValue(ok({ path: "/cv-files/x.y", expiresAt: "2026-11-04T10:05:00Z" }));
    await getApplicationCvLink("app-1");
    expect(postMock).toHaveBeenCalledWith("/applications/app-1/cv-link");
  });
});

describe("downloading", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("builds the full address from the API root, its /api/v1 prefix and the link's path", () => {
    expect(cvLinkUrl({ path: "/cv-files/abc.def", expiresAt: "" })).toMatch(
      /^https?:\/\/[^/]+\/api\/v1\/cv-files\/abc\.def$/
    );
  });

  it("starts the download from a link made at the moment of the click", async () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });
    const getLink = vi.fn().mockResolvedValue({
      link: { path: "/cv-files/abc.def", expiresAt: "2026-11-04T10:05:00Z" },
      error: null,
    });

    await expect(downloadCv(getLink)).resolves.toEqual({ error: null });

    expect(getLink).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith(expect.stringMatching(/\/api\/v1\/cv-files\/abc\.def$/));
  });

  it("starts nothing, and returns the error, when the server will not give a link", async () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });
    const result = await downloadCv(async () => ({
      link: null,
      error: { message: "This CV is no longer available." } as never,
    }));
    expect(result.error?.message).toBe("This CV is no longer available.");
    expect(assign).not.toHaveBeenCalled();
  });

  it("still returns an error when there is neither a link nor an error", async () => {
    const result = await downloadCv(async () => ({ link: null, error: null }));
    expect(result.error?.message).toBe("The CV could not be opened.");
  });
});
