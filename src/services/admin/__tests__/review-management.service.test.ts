// ============================================================
// ADMIN REVIEW MANAGEMENT — SERVICE TESTS (Module 41)
// ============================================================
// Read-only service tested against the REAL review seeds.
// No mocks, no fabricated fixtures — every assertion either reads
// the same stores the console renders or pins the known seed
// (40 storefront + 8 profile reviews = 48 admin rows).
// ============================================================

import { describe, expect, it } from "vitest";
import { createReviewManagementService } from "@/services/admin/review-management.service";
import { reviews } from "@/data/reviews";
import { getAllProfileReviewsData } from "@/data/profile-reviews";

// Tested directly against the mock factory (not the `@/services/admin`
// barrel) so this suite keeps pinning the mock dataset regardless of which
// implementation `index.ts` wires up for the live /admin/reviews console.
const reviewManagementService = createReviewManagementService();

// ---- Seed facts (computed live so tests can never contradict the store) ----
const profileRows = getAllProfileReviewsData();
const storefrontCount = reviews.length;
const productCount = reviews.filter((r) => r.target === "product").length;
const vendorCount = reviews.filter((r) => r.target === "vendor").length;
const freelancerCount = profileRows.filter((p) => p.revieweeKind === "freelancer").length;
const employerCount = profileRows.filter((p) => p.revieweeKind === "employer").length;
const total = storefrontCount + profileRows.length;
const imagesCount = reviews.filter((r) => (r.images?.length ?? 0) > 0).length;
const responseCount = reviews.filter((r) => Boolean(r.vendorResponse)).length;

describe("reviewManagementService", () => {
  it("exposes the pinned real seed", () => {
    expect(storefrontCount).toBe(40);
    expect(productCount).toBe(28);
    expect(vendorCount).toBe(12);
    expect(profileRows.length).toBe(8);
    expect(freelancerCount).toBe(7);
    expect(employerCount).toBe(1);
    expect(total).toBe(48);
  });

  describe("list", () => {
    it("returns every review, newest first, when no query is given", async () => {
      const pageOne = await reviewManagementService.list();
      expect(pageOne.total).toBe(total);
      expect(pageOne.items.length).toBe(10); // default page size
      expect(pageOne.page).toBe(1);
      expect(pageOne.totalPages).toBe(5);

      // Pull the full set to verify global newest-first ordering.
      const result = await reviewManagementService.list({ pageSize: total });
      expect(result.items.length).toBe(total);
      expect(result.totalPages).toBe(1);

      const sorted = [...result.items].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      );
      expect(result.items.map((r) => r.id)).toEqual(sorted.map((r) => r.id));
    });

    it("treats 'all' status / target as no filter", async () => {
      const status = await reviewManagementService.list({ status: "all" });
      expect(status.total).toBe(total);
      const target = await reviewManagementService.list({ targetType: "all" });
      expect(target.total).toBe(total);
    });

    it("filters by derived target type", async () => {
      const product = await reviewManagementService.list({ targetType: "product" });
      expect(product.total).toBe(productCount);
      expect(product.items.every((r) => r.targetType === "product")).toBe(true);

      const vendor = await reviewManagementService.list({ targetType: "vendor" });
      expect(vendor.total).toBe(vendorCount);
      expect(vendor.items.every((r) => r.targetType === "vendor")).toBe(true);

      const freelancer = await reviewManagementService.list({ targetType: "freelancer" });
      expect(freelancer.total).toBe(freelancerCount);
      expect(freelancer.items.every((r) => r.statusSource === "store")).toBe(true);

      const employer = await reviewManagementService.list({ targetType: "employer" });
      expect(employer.total).toBe(employerCount);
      expect(employer.items.every((r) => r.targetType === "employer")).toBe(true);
    });

    it("reports publish/pending/hidden/removed honestly", async () => {
      const published = await reviewManagementService.list({ status: "published" });
      expect(published.total).toBe(total);
      expect(published.items.every((r) => r.status === "published")).toBe(true);

      for (const status of ["pending", "hidden", "removed"] as const) {
        const result = await reviewManagementService.list({ status });
        expect(result.total).toBe(0);
      }
    });

    it("filters by exact rating", async () => {
      const fiveStars = await reviewManagementService.list({ rating: 5 });
      const liveFive =
        reviews.filter((r) => r.rating === 5).length +
        profileRows.filter((p) => p.rating === 5).length;
      expect(fiveStars.total).toBe(liveFive);
      expect(fiveStars.items.every((r) => r.rating === 5)).toBe(true);
    });

    it("filters by vendor response presence", async () => {
      const answered = await reviewManagementService.list({ response: "answered" });
      expect(answered.total).toBe(responseCount);
      expect(answered.items.every((r) => r.hasResponse)).toBe(true);

      const unanswered = await reviewManagementService.list({ response: "unanswered" });
      expect(unanswered.total).toBe(total - responseCount);
      expect(unanswered.items.every((r) => !r.hasResponse)).toBe(true);
    });

    it("respects the 'reported only' toggle against the real (empty) report store", async () => {
      const reported = await reviewManagementService.list({ reportedOnly: true });
      expect(reported.total).toBe(0);
    });

    it("filters by vendor id", async () => {
      const vendorIds = [
        ...new Set(reviews.map((r) => r.vendorId).filter((id): id is string => Boolean(id))),
      ];
      expect(vendorIds.length).toBeGreaterThan(0);
      const first = vendorIds[0];
      const result = await reviewManagementService.list({ vendorId: first });
      expect(result.total).toBe(reviews.filter((r) => r.vendorId === first).length);
      expect(result.items.every((r) => r.vendorId === first)).toBe(true);
    });

    it("searches across id, reviewer, target and comment", async () => {
      const firstId = reviews[0].id;
      const byId = await reviewManagementService.list({ search: firstId });
      // Short storefront ids ("r1"…) also appear inside other ids and comments,
      // so the search is substring-based — assert the row is hit, not an exact 1.
      expect(byId.total).toBeGreaterThanOrEqual(1);
      expect(byId.items.some((r) => r.id === firstId)).toBe(true);

      const byProfile = await reviewManagementService.list({ search: "prv_" });
      expect(byProfile.total).toBe(profileRows.length);
      expect(byProfile.items.every((r) => r.id.startsWith("prv_"))).toBe(true);
    });

    it("sorts by every managed sort field", async () => {
      const byRating = await reviewManagementService.list({ sortBy: "rating", sortDir: "desc" });
      const ratings = byRating.items.map((r) => r.rating);
      expect([...ratings]).toEqual([...ratings].sort((a, b) => b - a));

      const byHelpful = await reviewManagementService.list({ sortBy: "helpful", sortDir: "desc" });
      const helpful = byHelpful.items.map((r) => r.helpfulCount);
      expect([...helpful]).toEqual([...helpful].sort((a, b) => b - a));

      const byCreated = await reviewManagementService.list({ sortBy: "createdAt", sortDir: "asc" });
      const created = byCreated.items.map((r) => r.createdAt);
      expect([...created]).toEqual([...created].sort());

      const byReported = await reviewManagementService.list({ sortBy: "reported", sortDir: "desc" });
      expect(byReported.items.every((r) => r.reportedCount === 0)).toBe(true);
    });

    it("paginates", async () => {
      const result = await reviewManagementService.list({ page: 1, pageSize: 10 });
      expect(result.items.length).toBe(10);
      expect(result.total).toBe(total);
      expect(result.totalPages).toBe(5);

      const page2 = await reviewManagementService.list({ page: 2, pageSize: 10 });
      expect(page2.items.length).toBe(10);
      expect(page2.page).toBe(2);
    });
  });

  describe("getCounts", () => {
    it("matches the real stores exactly", async () => {
      const counts = await reviewManagementService.getCounts();
      expect(counts.all).toBe(total);
      expect(counts.byStatus.published).toBe(total);
      expect(counts.byStatus.pending).toBe(0);
      expect(counts.byStatus.hidden).toBe(0);
      expect(counts.byStatus.removed).toBe(0);
      expect(counts.byTargetType.product).toBe(productCount);
      expect(counts.byTargetType.vendor).toBe(vendorCount);
      expect(counts.byTargetType.freelancer).toBe(freelancerCount);
      expect(counts.byTargetType.employer).toBe(employerCount);
      expect(counts.reported).toBe(0);
      expect(counts.needsAttention).toBe(0);
      expect(counts.withImages).toBe(imagesCount);
      expect(counts.withResponse).toBe(responseCount);
    });
  });

  describe("getFacets / getVendorOptions", () => {
    it("builds facet options from the live rows", async () => {
      const facets = await reviewManagementService.getFacets();
      const targetByName = Object.fromEntries(
        facets.targetTypes.map((t) => [t.name, t.count])
      );
      expect(targetByName.Product).toBe(productCount);
      expect(targetByName.Vendor).toBe(vendorCount);
      expect(targetByName.Freelancer).toBe(freelancerCount);
      expect(targetByName.Employer).toBe(employerCount);

      const options = await reviewManagementService.getVendorOptions();
      expect(options.length).toBe(facets.vendors.length);
      expect(options.every((v) => v.name.length > 0)).toBe(true);
    });
  });

  describe("getById", () => {
    it("returns a storefront review with derived status and entity links", async () => {
      const firstStorefront = reviews.find((r) => r.target === "product")!;
      const detail = await reviewManagementService.getById(firstStorefront.id);
      expect(detail).not.toBeNull();
      expect(detail!.review.statusSource).toBe("derived");
      expect(detail!.review.status).toBe("published");
      expect(detail!.entity.targetType).toBe("product");
      expect(detail!.entity.href).toBe(`/marketplace/${firstStorefront.targetId}`);
      expect(detail!.entity.adminHref).toBe(`/admin/products/${firstStorefront.targetId}`);
      expect(detail!.statusNote.length).toBeGreaterThan(0);
    });

    it("returns a profile review with its real store status", async () => {
      const firstProfile = profileRows[0];
      const detail = await reviewManagementService.getById(firstProfile.id);
      expect(detail).not.toBeNull();
      expect(detail!.review.statusSource).toBe("store");
      expect(detail!.entity.targetType).toBe(
        firstProfile.revieweeKind === "freelancer" ? "freelancer" : "employer"
      );
    });

    it("returns null for unknown ids", async () => {
      const detail = await reviewManagementService.getById("does-not-exist");
      expect(detail).toBeNull();
    });
  });
});