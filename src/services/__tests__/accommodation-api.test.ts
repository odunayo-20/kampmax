import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());
const postMock = vi.hoisted(() => vi.fn());
const patchMock = vi.hoisted(() => vi.fn());
const deleteMock = vi.hoisted(() => vi.fn());
const uploadMock = vi.hoisted(() => vi.fn());
const getApiBaseUrlMock = vi.hoisted(() => vi.fn());
const getAccessTokenMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: getMock,
    post: postMock,
    patch: patchMock,
    delete: deleteMock,
  },
}));
vi.mock("@/services/media", () => ({ uploadFileDirect: uploadMock }));
vi.mock("@/lib/api-config", () => ({ getApiBaseUrl: getApiBaseUrlMock }));
vi.mock("@/lib/auth-storage", () => ({ getAccessToken: getAccessTokenMock }));

import { accommodationApi } from "@/services/accommodation";

const ok = (data: unknown) => ({ data, error: null });

beforeEach(() => {
  getMock.mockReset();
  postMock.mockReset();
  patchMock.mockReset();
  deleteMock.mockReset();
  uploadMock.mockReset();
  getApiBaseUrlMock.mockReturnValue("https://api.kampmax.test");
  getAccessTokenMock.mockReturnValue("test-access-token");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("public accommodation API", () => {
  it("encodes search filters using the backend query names", async () => {
    getMock.mockResolvedValue(ok({ items: [], meta: { total: 0, page: 2, limit: 12, totalPages: 0 } }));

    await accommodationApi.search({
      q: "near campus",
      city: "Ugbokolo",
      maxRent: 100000,
      amenities: ["water", "security"],
      page: 2,
      limit: 12,
    });

    expect(getMock).toHaveBeenCalledWith(
      "/accommodation/listings?q=near+campus&city=Ugbokolo&maxRent=100000&page=2&limit=12&amenities=water%2Csecurity",
      { signal: undefined }
    );
  });

  it("creates an enquiry on the selected listing", async () => {
    postMock.mockResolvedValue(ok({ id: "enquiry-1" }));

    await accommodationApi.createEnquiry("listing/1", {
      message: "Is this room still available?",
      preferredContactMethod: "IN_APP",
    });

    expect(postMock).toHaveBeenCalledWith(
      "/accommodation/listings/listing%2F1/enquiries",
      { message: "Is this room still available?", preferredContactMethod: "IN_APP" }
    );
  });
});

describe("private agent document upload", () => {
  it("sends a multipart request with auth without overriding the browser boundary", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "doc-1", status: "PENDING" } }), { status: 201 })
    );
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["identity"], "identity.pdf", { type: "application/pdf" });

    const result = await accommodationApi.uploadAgentDocument(file, "IDENTITY");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.kampmax.test/api/v1/accommodation/agents/documents",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer test-access-token" },
      })
    );
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(request.headers).not.toHaveProperty("Content-Type");
    expect(request.body).toBeInstanceOf(FormData);
    expect((request.body as FormData).get("documentType")).toBe("IDENTITY");
    expect(result.id).toBe("doc-1");
  });

  it("surfaces the backend validation message when an upload is rejected", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "Choose a PDF, JPEG or PNG file to upload" }), { status: 400 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      accommodationApi.uploadAgentDocument(
        new File(["bad"], "bad.txt", { type: "text/plain" }),
        "IDENTITY"
      )
    ).rejects.toThrow("Choose a PDF, JPEG or PNG file to upload");
  });
});
