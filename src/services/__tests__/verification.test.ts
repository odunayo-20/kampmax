import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();
const uploadFileDirect = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
    patch: (...a: unknown[]) => patch(...a),
  },
}));
vi.mock("@/services/media", () => ({
  uploadFileDirect: (...a: unknown[]) => uploadFileDirect(...a),
}));

import {
  fetchFreelancerVerification,
  fetchVendorVerification,
  requestFreelancerVerification,
  setVendorBusinessType,
  submitVendorVerification,
  uploadVendorDocument,
  vendorStatusFrom,
} from "../verification";

const ok = <T>(data: T) => Promise.resolve({ data, error: null });
const failure = (message: string) => Promise.resolve({ data: null, error: { message } });

const doc = (over: Record<string, unknown> = {}) => ({
  id: "d1",
  type: "ADDRESS_PROOF",
  filename: "bill.pdf",
  status: "SUBMITTED",
  rejectionReason: null,
  submittedAt: "2026-02-01T10:00:00Z",
  ...over,
});

function serve(opts: { status?: string; required?: string[]; docs?: unknown[]; businessType?: string } = {}) {
  get.mockImplementation((path: string) => {
    if (path === "/vendors/me/verification/status")
      return ok({
        verificationStatus: opts.status ?? "PENDING",
        requiredDocuments: opts.required ?? ["GOVERNMENT_ID", "ADDRESS_PROOF"],
      });
    if (path === "/vendors/me/documents") return ok({ items: opts.docs ?? [] });
    if (path === "/vendors/me/profile") return ok({ profile: { businessType: opts.businessType ?? "INDIVIDUAL" } });
    return failure("unexpected " + path);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  post.mockImplementation(() => ok({}));
  patch.mockImplementation(() => ok({}));
  uploadFileDirect.mockResolvedValue({ data: { id: "media-1" }, error: null });
});

describe("vendor verification", () => {
  it("maps the backend's status words", () => {
    expect(vendorStatusFrom("PENDING")).toBe("unverified");
    expect(vendorStatusFrom("SUBMITTED")).toBe("pending_review");
    expect(vendorStatusFrom("UNDER_REVIEW")).toBe("pending_review");
    expect(vendorStatusFrom("VERIFIED")).toBe("verified");
    expect(vendorStatusFrom("REJECTED")).toBe("rejected");
    expect(vendorStatusFrom("SUSPENDED")).toBe("suspended");
  });

  it("lists the required documents with the newest upload of each", async () => {
    serve({
      docs: [
        doc({ id: "old", type: "GOVERNMENT_ID", status: "REJECTED", rejectionReason: "Blurry", submittedAt: "2026-01-01T00:00:00Z" }),
        doc({ id: "new", type: "GOVERNMENT_ID", status: "SUBMITTED", submittedAt: "2026-02-02T00:00:00Z" }),
      ],
    });

    const v = await fetchVendorVerification();

    expect(v.required.map((r) => [r.type, r.latest?.id])).toEqual([
      ["GOVERNMENT_ID", "new"],
      ["ADDRESS_PROOF", undefined],
    ]);
    expect(v.required[0].label).toBe("Government-issued ID");
    expect(v.businessType).toBe("INDIVIDUAL");
  });

  it("can only be submitted once every required document is in and not rejected", async () => {
    serve({ docs: [doc({ type: "GOVERNMENT_ID" })] });
    expect((await fetchVendorVerification()).canSubmit).toBe(false);

    serve({ docs: [doc({ type: "GOVERNMENT_ID" }), doc({ id: "d2", type: "ADDRESS_PROOF" })] });
    expect((await fetchVendorVerification()).canSubmit).toBe(true);

    serve({
      docs: [doc({ type: "GOVERNMENT_ID" }), doc({ id: "d2", type: "ADDRESS_PROOF", status: "REJECTED" })],
    });
    expect((await fetchVendorVerification()).canSubmit).toBe(false);
  });

  it("does not offer submission while under review, verified or suspended", async () => {
    const docs = [doc({ type: "GOVERNMENT_ID" }), doc({ id: "d2", type: "ADDRESS_PROOF" })];
    for (const status of ["UNDER_REVIEW", "VERIFIED", "SUSPENDED"]) {
      serve({ status, docs });
      const v = await fetchVendorVerification();
      expect(v.documentsComplete).toBe(true);
      expect(v.canSubmit).toBe(false);
    }
  });

  it("fails instead of showing demo data when the server can't be reached", async () => {
    get.mockImplementation(() => failure("down"));
    await expect(fetchVendorVerification()).rejects.toThrow("down");
  });

  it("uploads the file first, then attaches it by its media id", async () => {
    const file = new File(["x"], "id.pdf", { type: "application/pdf" });

    await uploadVendorDocument("GOVERNMENT_ID", file);

    expect(uploadFileDirect).toHaveBeenCalledWith(file, "kyc");
    expect(post).toHaveBeenCalledWith("/vendors/me/documents", {
      type: "GOVERNMENT_ID",
      mediaId: "media-1",
    });
  });

  it("does not attach anything if the upload failed, and reports why", async () => {
    uploadFileDirect.mockResolvedValue({ data: null, error: { message: "File too large" } });
    await expect(
      uploadVendorDocument("GOVERNMENT_ID", new File(["x"], "id.pdf"))
    ).rejects.toThrow("File too large");
    expect(post).not.toHaveBeenCalled();
  });

  it("reports a document the server refused instead of calling it saved", async () => {
    post.mockImplementationOnce(() => failure("Media not found"));
    await expect(
      uploadVendorDocument("GOVERNMENT_ID", new File(["x"], "id.pdf"))
    ).rejects.toThrow("Media not found");
  });

  it("changes the business type, and surfaces a rejected submission", async () => {
    await setVendorBusinessType("BUSINESS");
    expect(patch).toHaveBeenCalledWith("/vendors/me/profile", { businessType: "BUSINESS" });

    post.mockImplementationOnce(() => failure("Missing required documents: ADDRESS_PROOF"));
    await expect(submitVendorVerification()).rejects.toThrow("Missing required documents");
  });
});

describe("freelancer verification", () => {
  it("reads the real status", async () => {
    const cases: Array<[string, string]> = [
      ["UNVERIFIED", "unverified"],
      ["PENDING", "pending_review"],
      ["VERIFIED", "verified"],
      ["REJECTED", "rejected"],
    ];
    for (const [raw, expected] of cases) {
      get.mockImplementation(() => ok({ verificationStatus: raw }));
      await expect(fetchFreelancerVerification()).resolves.toEqual({ status: expected });
    }
  });

  it("requests a review, and fails loudly when there is no profile yet", async () => {
    await requestFreelancerVerification();
    expect(post).toHaveBeenCalledWith("/freelancers/me/verification", {});

    post.mockImplementationOnce(() => failure("Freelancer profile not found"));
    await expect(requestFreelancerVerification()).rejects.toThrow("Freelancer profile not found");
  });
});
