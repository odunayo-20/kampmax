// ============================================================
// ADMIN JOB MANAGEMENT — SERVICE TESTS (Module 40)
// ============================================================
// Read-only service tested against the REAL 10-job seed.
// No mocks, no fabricated fixtures — every assertion reads the
// same stores the console renders.
// ============================================================

import { describe, expect, it } from "vitest";
import { createJobManagementService } from "../job-management.mock";

const jobManagementService = createJobManagementService();

describe("jobManagementService", () => {
  describe("list", () => {
    it("returns every job with correct defaults (postedAt desc, all statuses)", async () => {
      const result = await jobManagementService.list();
      expect(result.total).toBe(10);
      expect(result.items.length).toBe(10);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);

      const sorted = [...result.items].sort((a, b) => b.postedAt.localeCompare(a.postedAt));
      expect(result.items.map((j) => j.id)).toEqual(sorted.map((j) => j.id));

      const ids = result.items.map((j) => j.id);
      expect(ids).toContain("opp_my_open");
      expect(ids).toContain("opp_my_draft");
      expect(ids).toContain("opp_my_pending");
      expect(ids).toContain("opp_my_closed");
    });

    it("paginates", async () => {
      const result = await jobManagementService.list({ page: 1, pageSize: 4 });
      expect(result.items.length).toBe(4);
      expect(result.total).toBe(10);
      expect(result.totalPages).toBe(3);

      const page2 = await jobManagementService.list({ page: 2, pageSize: 4 });
      expect(page2.items.length).toBe(4);
      expect(page2.items[0].id).not.toBe(result.items[0].id);
    });

    it("filters by status", async () => {
      const result = await jobManagementService.list({ status: "open" });
      expect(result.total).toBe(5);
      expect(result.items.every((j) => j.status === "open")).toBe(true);

      const draft = await jobManagementService.list({ status: "draft" });
      expect(draft.total).toBe(1);
      expect(draft.items[0].id).toBe("opp_my_draft");

      const pending = await jobManagementService.list({ status: "pending_review" });
      expect(pending.items[0].id).toBe("opp_my_pending");
    });

    it("treats 'all' status as no filter", async () => {
      const result = await jobManagementService.list({ status: "all" });
      expect(result.total).toBe(10);
    });

    it("filters by derived publication", async () => {
      const published = await jobManagementService.list({ publication: "published" });
      expect(published.total).toBe(5);
      expect(published.items.every((j) => j.publication === "published")).toBe(true);

      const unpublished = await jobManagementService.list({ publication: "unpublished" });
      expect(unpublished.total).toBe(2);

      const ended = await jobManagementService.list({ publication: "ended" });
      expect(ended.total).toBe(3);
    });

    it("filters by category, arrangement and employer", async () => {
      const webDev = await jobManagementService.list({ categoryId: "ec1" });
      expect(webDev.total).toBeGreaterThan(0);
      expect(webDev.items.every((j) => j.categoryId === "ec1")).toBe(true);

      const remote = await jobManagementService.list({ arrangement: "remote" });
      expect(remote.items.every((j) => j.workArrangement === "remote")).toBe(true);

      const u1 = await jobManagementService.list({ employerId: "u1" });
      expect(u1.total).toBe(4);
      expect(u1.items.every((j) => j.employerId === "u1")).toBe(true);
    });

    it("searches across title, id, employer, category and skills", async () => {
      const byId = await jobManagementService.list({ search: "opp_my_pending" });
      expect(byId.total).toBe(1);
      expect(byId.items[0].id).toBe("opp_my_pending");

      const byTitle = await jobManagementService.list({ search: "video editor" });
      expect(byTitle.total).toBe(2);
      expect(byTitle.items.map((j) => j.id).sort()).toEqual(
        ["opp_expired", "opp_my_open"].sort()
      );

      const byEmployer = await jobManagementService.list({ search: "Oluwaseun" });
      expect(byEmployer.total).toBe(4);

      const bySkill = await jobManagementService.list({ search: "Figma" });
      expect(bySkill.total).toBeGreaterThan(0);
    });

    it("sorts by each managed sort field", async () => {
      const byApplications = await jobManagementService.list({ sortBy: "applications", sortDir: "desc" });
      const appCounts = byApplications.items.map((j) => j.applications);
      expect([...appCounts]).toEqual([...appCounts].sort((a, b) => b - a));

      const byViews = await jobManagementService.list({ sortBy: "viewCount", sortDir: "desc" });
      const views = byViews.items.map((j) => j.viewCount);
      expect([...views]).toEqual([...views].sort((a, b) => b - a));

      const byTitle = await jobManagementService.list({ sortBy: "title", sortDir: "asc" });
      const titles = byTitle.items.map((j) => j.title);
      expect([...titles]).toEqual([...titles].sort());

      const byDeadlineDesc = await jobManagementService.list({ sortBy: "deadline", sortDir: "desc" });
      const deadlines = byDeadlineDesc.items.map((j) => +new Date(j.deadline));
      expect([...deadlines]).toEqual([...deadlines].sort((a, b) => b - a));

      const byBudget = await jobManagementService.list({ sortBy: "budget", sortDir: "desc" });
      const budgets = byBudget.items.map((j) => j.budgetMax ?? j.budgetMin ?? 0);
      expect([...budgets]).toEqual([...budgets].sort((a, b) => b - a));
    });

    it("returns empty page for an unknown employer", async () => {
      const result = await jobManagementService.list({ employerId: "does-not-exist" });
      expect(result.total).toBe(0);
      expect(result.items.length).toBe(0);
    });
  });

  describe("getCounts", () => {
    it("matches the real seed distribution", async () => {
      const counts = await jobManagementService.getCounts();
      expect(counts.all).toBe(10);
      expect(counts.open).toBe(5);
      expect(counts.draft).toBe(1);
      expect(counts.pending_review).toBe(1);
      expect(counts.closed).toBe(2);
      expect(counts.expired).toBe(1);
      expect(counts.cancelled).toBe(0);
      expect(counts.reported).toBe(0);
      expect(counts.withApplications).toBe(2);
    });
  });

  describe("getFacets", () => {
    it("mirrors the category taxonomy ids", async () => {
      const facets = await jobManagementService.getFacets();
      const ids = facets.categories.map((c) => c.id);
      expect(ids).toContain("ec1");
      expect(facets.campuses.length).toBeGreaterThan(0);
      expect(facets.employers.map((e) => e.id)).toContain("u1");
    });

    it("counts sum to the full dataset", async () => {
      const facets = await jobManagementService.getFacets();
      const categorySum = facets.categories.reduce((a, c) => a + c.count, 0);
      const employerSum = facets.employers.reduce((a, e) => a + e.count, 0);
      expect(categorySum).toBe(10);
      expect(employerSum).toBe(10);
    });
  });

  describe("getById", () => {
    it("reads the open job with applications (opp_my_open)", async () => {
      const detail = await jobManagementService.getById("opp_my_open");
      expect(detail).not.toBeNull();
      expect(detail!.listing.title).toBeTruthy();
      expect(detail!.listing.status).toBe("open");
      expect(detail!.listing.publication).toBe("published");
      expect(detail!.listing.moderation).toBe("not_applicable");
      // 4 visible proposals (the withdrawn one is excluded)
      expect(detail!.applications.visible).toBe(4);
      expect(detail!.applications.total).toBe(5);
      expect(detail!.applications.byStatus.withdrawn).toBe(1);
      expect(detail!.applications.byStatus.under_review).toBeGreaterThan(0);
      expect(detail!.applications.latestAt).toBeTruthy();
      expect(detail!.contracts.count).toBe(0);
      expect(detail!.listing.employersReported).toBe(0);
      expect(detail!.activity.length).toBeGreaterThanOrEqual(5);
    });

    it("reads the closed job that hired freelancer u4 (opp_my_closed)", async () => {
      const detail = await jobManagementService.getById("opp_my_closed");
      expect(detail).not.toBeNull();
      expect(detail!.listing.status).toBe("closed");
      expect(detail!.listing.publication).toBe("ended");
      expect(detail!.applications.byStatus.accepted).toBe(1);
      expect(
        detail!.activity.some((e) => e.kind === "hiring" && e.meta != null)
      ).toBe(true);
    });

    it("reads the pending-review draft (opp_my_pending)", async () => {
      const detail = await jobManagementService.getById("opp_my_pending");
      expect(detail).not.toBeNull();
      expect(detail!.listing.status).toBe("pending_review");
      expect(detail!.listing.publication).toBe("unpublished");
      expect(detail!.listing.moderation).toBe("pending_review");
      expect(detail!.applications.visible).toBe(0);
    });

    it("reads the draft (opp_my_draft) as unpublished / not submitted", async () => {
      const detail = await jobManagementService.getById("opp_my_draft");
      expect(detail).not.toBeNull();
      expect(detail!.listing.status).toBe("draft");
      expect(detail!.listing.moderation).toBe("not_submitted");
    });

    it("derives employer identity from the u1 onboarding draft", async () => {
      const detail = await jobManagementService.getById("opp_my_open");
      expect(detail!.employer.id).toBe("u1");
      expect(detail!.employer.organizationName).toBeTruthy();
      expect(detail!.employer.verified).toBe(true);
      expect(detail!.employer.accountStatus).toBe("active");
      expect(detail!.employer.jobsTotal).toBe(4);
    });

    it("returns null for an unknown id", async () => {
      expect(await jobManagementService.getById("opp_does_not_exist")).toBeNull();
    });
  });

  describe("getActivity", () => {
    it("is deterministically ordered newest-first", async () => {
      const events = await jobManagementService.getActivity("opp_my_open");
      expect(events.length).toBeGreaterThan(0);
      const times = events.map((e) => +new Date(e.at));
      expect([...times]).toEqual([...times].sort((a, b) => b - a));
    });

    it("returns empty for an unknown job", async () => {
      expect(await jobManagementService.getActivity("nope")).toEqual([]);
    });
  });

  describe("data integrity", () => {
    it("never reports fabricated moderation or report counts", async () => {
      const counts = await jobManagementService.getCounts();
      expect(counts.reported).toBe(0);

      const { items } = await jobManagementService.list();
      for (const job of items) {
        const detail = await jobManagementService.getById(job.id);
        expect(detail!.listing.employersReported).toBe(0);
      }
    });

    it("row counts reconcile with detail summaries", async () => {
      const { items } = await jobManagementService.list({ employerId: "u1" });
      for (const job of items) {
        const detail = await jobManagementService.getById(job.id);
        expect(detail!.applications.visible).toBe(job.applications);
      }
    });
  });
});