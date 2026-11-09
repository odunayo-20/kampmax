import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());
const patchMock = vi.hoisted(() => vi.fn());
const getBlobMock = vi.hoisted(() => vi.fn());
const postMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-client", () => ({
  apiClient: { get: getMock, patch: patchMock, post: postMock, getBlob: getBlobMock },
}));

import { canAdminPerform } from "@/lib/admin/permissions";
import { isRefundable, missingForApproval, type AgentDocument } from "@/types/accommodation";
import { createApiAccommodationService } from "../accommodation.api";

const service = createApiAccommodationService();
const BASE = "/accommodation/admin";

const ok = (data: unknown) => ({ data, error: null });
const failure = (status: number, message = "") => ({
  data: {},
  error: Object.assign(new Error(message), { status }),
});

beforeEach(() => {
  getMock.mockReset();
  patchMock.mockReset();
  getBlobMock.mockReset();
  postMock.mockReset();
});

describe("agents: listing", () => {
  const page = {
    items: [{ id: "a1" }],
    meta: { total: 31, page: 2, limit: 15, totalPages: 3 },
    counts: { pending: 4, approved: 20, rejected: 3, suspended: 2, revoked: 2 },
  };

  it("asks with no query string by default and reshapes the page, keeping the tab counts", async () => {
    getMock.mockResolvedValue(ok(page));
    const result = await service.listAgents();
    expect(getMock).toHaveBeenCalledWith(`${BASE}/agents`);
    expect(result).toEqual({
      items: [{ id: "a1" }],
      page: 2,
      pageSize: 15,
      total: 31,
      totalPages: 3,
      counts: page.counts,
    });
  });

  it("sends the filters, trimming the search and naming the page size 'limit'", async () => {
    getMock.mockResolvedValue(ok(page));
    await service.listAgents({ status: "PENDING", search: "  ada ", page: 2, pageSize: 15 });
    expect(getMock).toHaveBeenCalledWith(`${BASE}/agents?status=PENDING&q=ada&page=2&limit=15`);
  });

  it("leaves a blank search out", async () => {
    getMock.mockResolvedValue(ok(page));
    await service.listAgents({ status: "APPROVED", search: "   " });
    expect(getMock).toHaveBeenCalledWith(`${BASE}/agents?status=APPROVED`);
  });

  it("never reports fewer than one page", async () => {
    getMock.mockResolvedValue(ok({ ...page, items: [], meta: { total: 0, page: 1, limit: 15, totalPages: 0 } }));
    expect((await service.listAgents()).totalPages).toBe(1);
  });

  it("loads one application, encoding the id", async () => {
    getMock.mockResolvedValue(ok({ id: "a/1" }));
    await service.getAgent("a/1");
    expect(getMock).toHaveBeenCalledWith(`${BASE}/agents/a%2F1`);
  });

  it("loads an agent's listing history, paged", async () => {
    getMock.mockResolvedValue(ok({ items: [{ id: "l1" }], meta: { total: 11, page: 2, limit: 10, totalPages: 2 } }));
    const result = await service.agentListings("a1", 2, 10);
    expect(getMock).toHaveBeenCalledWith(`${BASE}/agents/a1/listings?page=2&limit=10`);
    expect(result).toEqual({ items: [{ id: "l1" }], page: 2, pageSize: 10, total: 11, totalPages: 2 });
  });
});

describe("agents: decisions", () => {
  beforeEach(() => patchMock.mockResolvedValue(ok({ id: "a1", status: "APPROVED" })));

  it("approves with an empty body", async () => {
    const result = await service.approveAgent("a1");
    expect(patchMock).toHaveBeenCalledWith(`${BASE}/agents/a1/approve`, {});
    expect(result).toEqual({ id: "a1", status: "APPROVED" });
  });

  it("sends the reason with a rejection, a suspension and a revocation", async () => {
    await service.rejectAgent("a1", "Documents unreadable");
    await service.suspendAgent("a1", "Fake listing reported");
    await service.revokeAgent("a1", "Fraud");
    expect(patchMock).toHaveBeenNthCalledWith(1, `${BASE}/agents/a1/reject`, { reason: "Documents unreadable" });
    expect(patchMock).toHaveBeenNthCalledWith(2, `${BASE}/agents/a1/suspend`, { reason: "Fake listing reported" });
    expect(patchMock).toHaveBeenNthCalledWith(3, `${BASE}/agents/a1/revoke`, { reason: "Fraud" });
  });

  it("asks for more documents with the message as the backend's 'reason' field", async () => {
    await service.requestAgentInfo("a1", "Please add a utility bill");
    expect(patchMock).toHaveBeenCalledWith(`${BASE}/agents/a1/request-info`, { reason: "Please add a utility bill" });
  });

  it("restores with an empty body", async () => {
    await service.restoreAgent("a1");
    expect(patchMock).toHaveBeenCalledWith(`${BASE}/agents/a1/restore`, {});
  });

  it("accepts a document without a reason, and rejects one with it trimmed", async () => {
    await service.reviewAgentDocument("a1", "d1", "ACCEPTED");
    await service.reviewAgentDocument("a1", "d1", "REJECTED", "  Blurry  ");
    expect(patchMock).toHaveBeenNthCalledWith(1, `${BASE}/agents/a1/documents/d1`, { decision: "ACCEPTED" });
    expect(patchMock).toHaveBeenNthCalledWith(2, `${BASE}/agents/a1/documents/d1`, {
      decision: "REJECTED",
      reason: "Blurry",
    });
  });

  it("explains a refusal from the backend in its own words (400/409)", async () => {
    patchMock.mockResolvedValue(failure(400, "An identity document is needed before approval."));
    await expect(service.approveAgent("a1")).rejects.toThrow("An identity document is needed before approval.");
    patchMock.mockResolvedValue(failure(409, "Already decided"));
    await expect(service.restoreAgent("a1")).rejects.toThrow("Already decided");
  });

  it("falls back to a plain sentence when the backend says nothing", async () => {
    patchMock.mockResolvedValue(failure(500, ""));
    await expect(service.rejectAgent("a1", "x")).rejects.toThrow("Couldn't reject the application.");
  });
});

describe("agents: private documents", () => {
  it("fetches the file with the admin's sign-in and returns it with its name", async () => {
    const blob = new Blob(["png"], { type: "image/png" });
    getBlobMock.mockResolvedValue({ blob, filename: "id.png", error: null });
    const file = await service.openAgentDocument("a1", "d/1");
    expect(getBlobMock).toHaveBeenCalledWith(`${BASE}/agents/a1/documents/d%2F1/file`);
    expect(file.blob).toBe(blob);
    expect(file.filename).toBe("id.png");
  });

  it("says plainly when the admin may not open it", async () => {
    getBlobMock.mockResolvedValue({ blob: null, filename: null, error: Object.assign(new Error("Forbidden"), { status: 403 }) });
    await expect(service.openAgentDocument("a1", "d1")).rejects.toThrow("You don't have permission to do that.");
  });

  it("says plainly when the file is gone", async () => {
    getBlobMock.mockResolvedValue({ blob: null, filename: null, error: Object.assign(new Error("nf"), { status: 404 }) });
    await expect(service.openAgentDocument("a1", "d1")).rejects.toThrow("That no longer exists. It may have been removed.");
  });
});

describe("listings", () => {
  const page = {
    items: [{ id: "l1" }],
    meta: { total: 3, page: 1, limit: 15, totalPages: 1 },
    counts: { PENDING_APPROVAL: 3, APPROVED: 10 },
  };

  it("asks for the waiting queue by leaving the status out, and keeps the counts", async () => {
    getMock.mockResolvedValue(ok(page));
    const result = await service.listListings();
    expect(getMock).toHaveBeenCalledWith(`${BASE}/listings`);
    expect(result.counts).toEqual({ PENDING_APPROVAL: 3, APPROVED: 10 });
    expect(result.total).toBe(3);
  });

  it("filters by moderation status and pages", async () => {
    getMock.mockResolvedValue(ok(page));
    await service.listListings({ status: "ADMIN_SUSPENDED", page: 2, pageSize: 15 });
    expect(getMock).toHaveBeenCalledWith(`${BASE}/listings?status=ADMIN_SUSPENDED&page=2&limit=15`);
  });

  it("loads one listing for review", async () => {
    getMock.mockResolvedValue(ok({ id: "l1", location: { address: "12 Road" } }));
    const listing = await service.getListing("l1");
    expect(getMock).toHaveBeenCalledWith(`${BASE}/listings/l1`);
    expect(listing.location.address).toBe("12 Road");
  });

  it("approves and restores with an empty body; rejects and suspends with the reason", async () => {
    patchMock.mockResolvedValue(ok({ id: "l1" }));
    await service.approveListing("l1");
    await service.restoreListing("l1");
    await service.rejectListing("l1", "Photos do not show this room");
    await service.suspendListing("l1", "Reported as misleading");
    expect(patchMock).toHaveBeenNthCalledWith(1, `${BASE}/listings/l1/approve`, {});
    expect(patchMock).toHaveBeenNthCalledWith(2, `${BASE}/listings/l1/restore`, {});
    expect(patchMock).toHaveBeenNthCalledWith(3, `${BASE}/listings/l1/reject`, { reason: "Photos do not show this room" });
    expect(patchMock).toHaveBeenNthCalledWith(4, `${BASE}/listings/l1/suspend`, { reason: "Reported as misleading" });
  });

  it("maps the common failures to plain sentences", async () => {
    getMock.mockResolvedValue(failure(401));
    await expect(service.listListings()).rejects.toThrow("You're signed out. Sign in again to continue.");
    getMock.mockResolvedValue(failure(403));
    await expect(service.listListings()).rejects.toThrow("You don't have permission to do that.");
    getMock.mockResolvedValue(failure(404));
    await expect(service.getListing("gone")).rejects.toThrow("That no longer exists. It may have been removed.");
  });

  it("passes the backend's explanation when approval is refused", async () => {
    patchMock.mockResolvedValue(failure(409, "The agent is not in good standing."));
    await expect(service.approveListing("l1")).rejects.toThrow("The agent is not in good standing.");
  });
});

describe("missingForApproval", () => {
  const doc = (documentType: AgentDocument["documentType"], status: AgentDocument["status"] = "PENDING"): AgentDocument => ({
    id: documentType + status,
    documentType,
    originalFilename: null,
    status,
    rejectionReason: null,
    createdAt: "2026-12-01T00:00:00Z",
  });

  it("asks for both kinds of document when nothing is on file", () => {
    expect(missingForApproval([])).toEqual([
      "an identity document",
      "proof of ownership or a letter of authorization",
    ]);
  });

  it("is satisfied by an identity document plus ownership proof OR an authorization letter", () => {
    expect(missingForApproval([doc("IDENTITY"), doc("OWNERSHIP_PROOF")])).toEqual([]);
    expect(missingForApproval([doc("IDENTITY"), doc("AUTHORIZATION_LETTER", "ACCEPTED")])).toEqual([]);
  });

  it("does not count a rejected document", () => {
    expect(missingForApproval([doc("IDENTITY", "REJECTED"), doc("OWNERSHIP_PROOF")])).toEqual(["an identity document"]);
    expect(missingForApproval([doc("IDENTITY"), doc("OWNERSHIP_PROOF", "REJECTED")])).toEqual([
      "proof of ownership or a letter of authorization",
    ]);
  });

  it("does not let other document types stand in", () => {
    expect(missingForApproval([doc("BUSINESS_REGISTRATION"), doc("OTHER")])).toHaveLength(2);
  });
});

describe("who sees the decision buttons", () => {
  it("follows the live session's exact backend permissions", () => {
    const reviewer = { role: "ADMIN" as const, permissions: ["accommodation.agents.review"] };
    expect(canAdminPerform(reviewer, "accommodation", "reviewAgents")).toBe(true);
    expect(canAdminPerform(reviewer, "accommodation", "moderateListings")).toBe(false);
    const moderator = { role: "ADMIN" as const, permissions: ["accommodation.listings.moderate"] };
    expect(canAdminPerform(moderator, "accommodation", "moderateListings")).toBe(true);
    expect(canAdminPerform(moderator, "accommodation", "reviewAgents")).toBe(false);
  });

  it("falls back to the role table when the session carries no permission list", () => {
    expect(canAdminPerform({ role: "SUPER_ADMIN" }, "accommodation", "reviewAgents")).toBe(true);
    expect(canAdminPerform({ role: "ADMIN" }, "accommodation", "moderateListings")).toBe(true);
    expect(canAdminPerform({ role: "CAMPUS_ADMIN" }, "accommodation", "reviewAgents")).toBe(false);
    expect(canAdminPerform({ role: "CAMPUS_ADMIN" }, "accommodation", "moderateListings")).toBe(false);
  });
});

describe("payments", () => {
  const page = {
    items: [{ id: "p1" }],
    meta: { total: 31, page: 2, limit: 15, totalPages: 3 },
    counts: { REFUND_PENDING: 2, SUCCESS: 40, FAILED: 5 },
  };

  it("lists with no query string by default, keeping the per-status counts", async () => {
    getMock.mockResolvedValue(ok(page));
    const result = await service.listPayments();
    expect(getMock).toHaveBeenCalledWith(`${BASE}/payments`);
    expect(result).toEqual({
      items: [{ id: "p1" }],
      page: 2,
      pageSize: 15,
      total: 31,
      totalPages: 3,
      counts: { REFUND_PENDING: 2, SUCCESS: 40, FAILED: 5 },
    });
  });

  it("filters by status and names the page size 'limit'", async () => {
    getMock.mockResolvedValue(ok(page));
    await service.listPayments({ status: "REFUND_PENDING", page: 2, pageSize: 15 });
    expect(getMock).toHaveBeenCalledWith(`${BASE}/payments?status=REFUND_PENDING&page=2&limit=15`);
  });

  it("marks a payment for refund with the reason, and returns nothing", async () => {
    patchMock.mockResolvedValue(ok({ id: "p1", status: "REFUND_PENDING" }));
    await expect(service.flagPaymentForRefund("p/1", "Charged twice")).resolves.toBeUndefined();
    expect(patchMock).toHaveBeenCalledWith(`${BASE}/payments/p%2F1/flag-refund`, { reason: "Charged twice" });
  });

  it("sends a refund as a POST with an empty body", async () => {
    postMock.mockResolvedValue(ok({ id: "p1", status: "REFUNDED" }));
    await expect(service.refundPayment("p1")).resolves.toBeUndefined();
    expect(postMock).toHaveBeenCalledWith(`${BASE}/payments/p1/refund`, {});
  });

  it("explains a refusal in the backend's words, and when the gateway is down", async () => {
    postMock.mockResolvedValue(failure(502, "The payment gateway did not accept the refund. Try again shortly."));
    await expect(service.refundPayment("p1")).rejects.toThrow("The payment gateway did not accept the refund. Try again shortly.");
    postMock.mockResolvedValue(failure(400, "Only a payment waiting for refund can be refunded."));
    await expect(service.refundPayment("p1")).rejects.toThrow("Only a payment waiting for refund can be refunded.");
  });

  it("falls back to a plain sentence for a refund with no explanation", async () => {
    postMock.mockResolvedValue(failure(500, ""));
    await expect(service.refundPayment("p1")).rejects.toThrow("Couldn't send the refund.");
  });

  it("maps the common failures to plain sentences", async () => {
    getMock.mockResolvedValue(failure(403));
    await expect(service.listPayments()).rejects.toThrow("You don't have permission to do that.");
    getMock.mockResolvedValue(failure(401));
    await expect(service.paymentReconciliation()).rejects.toThrow("You're signed out. Sign in again to continue.");
  });

  it("loads the reconciliation report", async () => {
    const report = { generatedAt: "2026-12-01T00:00:00Z", payments: {}, subscriptions: {} };
    getMock.mockResolvedValue(ok(report));
    expect(await service.paymentReconciliation()).toBe(report);
    expect(getMock).toHaveBeenCalledWith(`${BASE}/payments/reconciliation`);
  });

  describe("CSV export", () => {
    const file = { blob: new Blob(["csv"], { type: "text/csv" }), filename: "accommodation-payments.csv", error: null };

    it("asks for the default range when no dates are chosen", async () => {
      getBlobMock.mockResolvedValue(file);
      const result = await service.exportPayments();
      expect(getBlobMock).toHaveBeenCalledWith(`${BASE}/payments/export`);
      expect(result.filename).toBe("accommodation-payments.csv");
      expect(result.blob).toBe(file.blob);
    });

    it("includes the last day chosen by sending the day after as the exclusive end", async () => {
      getBlobMock.mockResolvedValue(file);
      await service.exportPayments({ from: "2026-11-01", to: "2026-11-30" });
      expect(getBlobMock).toHaveBeenCalledWith(`${BASE}/payments/export?from=2026-11-01&to=2026-12-01`);
    });

    it("rolls the end day over a month and a year correctly", async () => {
      getBlobMock.mockResolvedValue(file);
      await service.exportPayments({ to: "2026-12-31" });
      expect(getBlobMock).toHaveBeenCalledWith(`${BASE}/payments/export?to=2027-01-01`);
      await service.exportPayments({ to: "2028-02-28" });
      expect(getBlobMock).toHaveBeenLastCalledWith(`${BASE}/payments/export?to=2028-02-29`);
    });

    it("leaves out an end date that is not a date", async () => {
      getBlobMock.mockResolvedValue(file);
      await service.exportPayments({ from: "2026-11-01", to: "not-a-date" });
      expect(getBlobMock).toHaveBeenCalledWith(`${BASE}/payments/export?from=2026-11-01`);
    });

    it("says so plainly when the export is refused, or the range is too big", async () => {
      getBlobMock.mockResolvedValue({ blob: null, filename: null, error: Object.assign(new Error("Forbidden"), { status: 403 }) });
      await expect(service.exportPayments()).rejects.toThrow("You don't have permission to do that.");
      getBlobMock.mockResolvedValue({ blob: null, filename: null, error: Object.assign(new Error("Choose a range of at most 366 days."), { status: 400 }) });
      await expect(service.exportPayments({ from: "2020-01-01" })).rejects.toThrow("Choose a range of at most 366 days.");
    });
  });
});

describe("isRefundable", () => {
  it("is true for a real charge with a gateway reference", () => {
    expect(isRefundable({ amount: 2000, gatewayReference: "12345" })).toBe(true);
  });

  it("is false when nothing was charged, or there is nothing to refund against", () => {
    expect(isRefundable({ amount: 0, gatewayReference: "12345" })).toBe(false);
    expect(isRefundable({ amount: 2000, gatewayReference: "FREE" })).toBe(false);
    expect(isRefundable({ amount: 2000, gatewayReference: null })).toBe(false);
    expect(isRefundable({ amount: 2000, gatewayReference: "" })).toBe(false);
  });
});
