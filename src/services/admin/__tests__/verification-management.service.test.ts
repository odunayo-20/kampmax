import { beforeEach, describe, expect, it } from "vitest";
import { createVerificationManagementService } from "@/services/admin/verification-management.mock";
import { resetVendorAdminState } from "@/data/admin/vendor-management";

// ------------------------------------------------------------
// VERIFICATION MANAGEMENT SERVICE TESTS
//
// Verification rows are re-derived from the real owning stores on
// every call (no fabricated queue): 8 vendor rows (v1-v8), 1 employer
// row (u1/Oluwaseun Labs) and 5 freelancer rows (sp1-sp4, sp6).
// sp5 is unverified and not_started employers are intentionally absent.
//
//   - vrf-vendor-v5        → OAU Merch Shop, awaiting_review (only one)
//   - vrf-employer-u1      → verified, email, documentPolicy null
//   - vrf-freelancer-sp1   → verified, identity
//   - document counts      → 0 everywhere (no storage backend)
//
// Mutations wrap the vendor service; resetVendorAdminState() restores
// the pristine baseline so tests stay deterministic.
// ------------------------------------------------------------

const svc = createVerificationManagementService();

beforeEach(() => {
  resetVendorAdminState();
});

describe("list", () => {
  it("returns every managed verification row (14) with merged fields", async () => {
    const page = await svc.list({ page: 1, pageSize: 25 });
    expect(page.total).toBe(14);
    expect(page.page).toBe(1);
    expect(page.items.length).toBe(14);

    const v5 = page.items.find((v) => v.id === "vrf-vendor-v5");
    expect(v5?.applicantName).toBe("OAU Merch Shop");
    expect(v5?.applicantType).toBe("vendor");
    expect(v5?.verificationType).toBe("business");
    expect(v5?.status).toBe("awaiting_review");

    expect(page.items.filter((v) => v.applicantType === "vendor").length).toBe(8);
    expect(page.items.filter((v) => v.applicantType === "freelancer").length).toBe(5);
    expect(page.items.filter((v) => v.applicantType === "employer").map((v) => v.id)).toEqual([
      "vrf-employer-u1",
    ]);

    for (const item of page.items) {
      expect(item.id).toMatch(/^vrf-(vendor|employer|freelancer)-/);
      expect(["awaiting_review", "verified", "rejected", "action_required"]).toContain(item.status);
      expect(item.submittedAt === null || typeof item.submittedAt === "string").toBe(true);
      expect(item.documentsCount).toBe(0);
    }
  });

  it("buckets by status exactly like the seed state", async () => {
    const awaiting = await svc.list({ status: "awaiting_review" });
    expect(awaiting.items.map((v) => v.id)).toEqual(["vrf-vendor-v5"]);

    const verified = await svc.list({ status: "verified" });
    expect(verified.total).toBe(13);

    const rejected = await svc.list({ status: "rejected" });
    expect(rejected.total).toBe(0);

    const actionRequired = await svc.list({ status: "action_required" });
    expect(actionRequired.total).toBe(0);
  });

  it("filters by applicant type", async () => {
    const vendors = await svc.list({ applicantType: "vendor" });
    expect(vendors.total).toBe(8);
    expect(vendors.items.every((v) => v.applicantType === "vendor")).toBe(true);

    const employers = await svc.list({ applicantType: "employer" });
    expect(employers.items.map((v) => v.id)).toEqual(["vrf-employer-u1"]);

    const freelancers = await svc.list({ applicantType: "freelancer" });
    expect(freelancers.total).toBe(5);
    expect(freelancers.items.every((v) => v.applicantType === "freelancer")).toBe(true);
  });

  it("filters by verification type and campus", async () => {
    const business = await svc.list({ verificationType: "business" });
    expect(business.items.every((v) => v.verificationType === "business")).toBe(true);
    expect(business.total).toBeGreaterThanOrEqual(8);

    const identity = await svc.list({ verificationType: "identity" });
    expect(identity.items.every((v) => v.verificationType === "identity")).toBe(true);

    const oau = await svc.list({ campusId: "oau" });
    expect(oau.total).toBeGreaterThan(0);
    expect(oau.items.every((v) => v.campusId === "oau")).toBe(true);
    expect(oau.items.map((v) => v.id)).toContain("vrf-vendor-v5");
  });

  it("searches identity fields case-insensitively", async () => {
    const byStore = await svc.list({ search: "OAU" });
    expect(byStore.items.map((v) => v.id)).toEqual(["vrf-vendor-v5"]);

    const byName = await svc.list({ search: "Labs" });
    expect(byName.items.map((v) => v.id)).toEqual(["vrf-employer-u1"]);

    const none = await svc.list({ search: "zzz-no-match" });
    expect(none.total).toBe(0);
    expect(none.items).toEqual([]);
  });

  it("sorts by submittedAt (desc, nulls last) and applicantName (asc)", async () => {
    const desc = await svc.list({ sortBy: "submittedAt", sortDir: "desc", pageSize: 25 });
    const nullCount = desc.items.filter((v) => v.submittedAt === null).length;
    const withDates = desc.items.filter((v) => v.submittedAt !== null);
    for (let i = 1; i < withDates.length; i++) {
      expect(withDates[i - 1].submittedAt! >= withDates[i].submittedAt!).toBe(true);
    }
    // nulls cluster at the tail of a desc sort
    expect(desc.items.slice(desc.items.length - nullCount).every((v) => v.submittedAt === null)).toBe(true);

    const byName = await svc.list({ sortBy: "applicantName", sortDir: "asc", pageSize: 25 });
    const names = byName.items.map((v) => v.applicantName.toLowerCase());
    expect([...names].sort()).toEqual(names);
  });

  it("paginates and clamps out-of-range pages", async () => {
    const first = await svc.list({ page: 1, pageSize: 5 });
    expect(first.items.length).toBe(5);
    expect(first.totalPages).toBe(3);

    const second = await svc.list({ page: 2, pageSize: 5 });
    const ids = new Set([...first.items, ...second.items].map((v) => v.id));
    expect(ids.size).toBe(10);

    const clamped = await svc.list({ page: 99, pageSize: 5 });
    expect(clamped.page).toBe(clamped.totalPages);
  });
});

describe("getCounts / getTypes", () => {
  it("matches the list total and the known bucket distribution", async () => {
    const counts = await svc.getCounts();
    expect(counts.all).toBe(14);
    expect(counts.byStatus.awaiting_review).toBe(1);
    expect(counts.byStatus.verified).toBe(13);
    expect(counts.byStatus.rejected).toBe(0);
    expect(counts.byStatus.action_required).toBe(0);
    expect(counts.byStatus).toEqual({
      awaiting_review: 1,
      verified: 13,
      rejected: 0,
      action_required: 0,
    });
    expect(counts.all).toBe(
      counts.byStatus.awaiting_review + counts.byStatus.verified + counts.byStatus.rejected + counts.byStatus.action_required
    );
    expect(counts.byApplicantType).toEqual({ vendor: 8, freelancer: 5, employer: 1 });
    expect(counts.withDocuments).toBe(0);
  });

  it("exposes only verification types present in the dataset", async () => {
    const types = await svc.getTypes();
    expect(types).toContain("business");
    expect(types).toContain("identity");
    expect(types).toContain("email");
  });
});

describe("getById", () => {
  it("returns the full detail payload for a vendor row", async () => {
    const detail = await svc.getById("vrf-vendor-v5");
    expect(detail).not.toBeNull();
    if (!detail) return;

    expect(detail.verification.id).toBe("vrf-vendor-v5");
    expect(detail.verification.applicantId).toBe("v5");
    expect(detail.verification.applicantName).toBe("OAU Merch Shop");
    expect(detail.verification.campusId).toBe("oau");
    expect(detail.verification.status).toBe("awaiting_review");
    expect(detail.verification.reviewedAt).toBeNull();
    expect(detail.documents).toEqual([]);
    expect(detail.documentPolicy).not.toBeNull();
    expect(detail.documentPolicy!.length).toBe(2); // documentRequirements
    expect(detail.history.length).toBe(0);
    expect(detail.decisionSupport.actionable).toBe(true);
    expect(detail.applicant.adminHref).toBe("/admin/vendors/v5");
  });

  it("returns the employer row with a null policy and no documents", async () => {
    const detail = await svc.getById("vrf-employer-u1");
    expect(detail).not.toBeNull();
    if (!detail) return;

    expect(detail.verification.verificationType).toBe("email");
    expect(detail.verification.applicantType).toBe("employer");
    expect(detail.verification.status).toBe("verified");
    expect(detail.documents).toEqual([]);
    expect(detail.documentPolicy).toBeNull();
    expect(detail.decisionSupport.actionable).toBe(false);
  });

  it("returns a freelancer row with the freelancer document policy", async () => {
    const detail = await svc.getById("vrf-freelancer-sp1");
    expect(detail).not.toBeNull();
    if (!detail) return;

    expect(detail.verification.applicantType).toBe("freelancer");
    expect(detail.verification.status).toBe("verified");
    expect(detail.documentPolicy!.length).toBe(4); // spDocumentRequirements
  });

  it("returns null for unknown ids", async () => {
    expect(await svc.getById("vrf-vendor-missing")).toBeNull();
    expect(await svc.getById("v5")).toBeNull();
  });
});

describe("campus scoping (CAMPUS_ADMIN)", () => {
  const campusActor = { actor: { role: "CAMPUS_ADMIN", campusId: "oau" } };

  it("confines list/counts/types to the operator's campus", async () => {
    const page = await svc.list({}, campusActor);
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((v) => v.campusId === "oau")).toBe(true);
    expect(page.items.map((v) => v.id)).toContain("vrf-vendor-v5");

    const counts = await svc.getCounts(campusActor);
    const globalCounts = await svc.getCounts();
    expect(counts.all).toBeLessThan(globalCounts.all);
    expect(counts.byStatus.awaiting_review).toBe(1);
  });

  it("hides rows outside the operator's campus", async () => {
    const detail = await svc.getById("vrf-vendor-v5", campusActor);
    expect(detail).not.toBeNull();

    expect(await svc.getById("vrf-vendor-v1", campusActor)).toBeNull(); // rugipo
    expect(await svc.list({ search: "TechHub" }, campusActor).then((p) => p.total)).toBe(0);
  });

  it("treats super admins as unscoped", async () => {
    const adminActor = { actor: { role: "super_admin" } };
    const page = await svc.list({}, adminActor);
    expect(page.total).toBe(14);
  });
});

describe("mutations (delegated to the vendor service)", () => {
  it("approves the pending vendor store through the shared overlay", async () => {
    const approved = await svc.approve("vrf-vendor-v5");
    expect(approved.status).toBe("verified");

    const page = await svc.list();
    expect(page.items.find((v) => v.id === "vrf-vendor-v5")?.status).toBe("verified");

    const counts = await svc.getCounts();
    expect(counts.byStatus.awaiting_review).toBe(0);
    expect(counts.byStatus.verified).toBe(14);
  });

  it("rejects the pending vendor store with a reason and deactivates it", async () => {
    const rejected = await svc.reject("vrf-vendor-v5", "No BVN provided");
    expect(rejected.status).toBe("rejected");

    const counts = await svc.getCounts();
    expect(counts.byStatus.rejected).toBe(1);
    expect(counts.byStatus.awaiting_review).toBe(0);
  });

  it("rejects approve/reject on rows that are not pending", async () => {
    await expect(svc.approve("vrf-vendor-v1")).rejects.toThrow(/Only pending stores can be approved/);
    await expect(svc.reject("vrf-vendor-v1", "reason")).rejects.toThrow(/Only pending stores can be rejected/);
  });

  it("requires a rejection reason", async () => {
    await expect(svc.reject("vrf-vendor-v5", "   ")).rejects.toThrow(/reason is required/);
    const stillPending = await svc.getById("vrf-vendor-v5");
    expect(stillPending?.verification.status).toBe("awaiting_review");
  });

  it("only supports decisions for vendor verification", async () => {
    await expect(svc.approve("vrf-employer-u1")).rejects.toThrow(/only supported for vendor verification/);
    await expect(svc.reject("vrf-freelancer-sp1", "because")).rejects.toThrow(/only supported for vendor verification/);
  });

  it("respects campus scope on mutations", async () => {
    const campusActor = { actor: { role: "CAMPUS_ADMIN", campusId: "oau" } };
    const approved = await svc.approve("vrf-vendor-v5", campusActor);
    expect(approved.status).toBe("verified");

    await expect(svc.approve("vrf-vendor-v1", campusActor)).rejects.toThrow(/Verification not found/);
  });
});