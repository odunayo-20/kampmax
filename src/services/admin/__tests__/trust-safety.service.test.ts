// ============================================================
// ADMIN TRUST & SAFETY — SERVICE TESTS (Module 42)
// ============================================================
// The live stores are empty by default (no fabricated seeds), so the
// factory is asserted for its honest empty contract and NEVER mutates
// global report stores. Deterministic filter / sort / aggregate / detail
// behaviour is covered with explicit synthetic rows typed exactly like the
// real dataset — proving the pipeline, not inventing platform data.
// ============================================================

import { describe, expect, it } from "vitest";
import {
  buildTrustSafetyDataset,
  buildTrustSafetyDetail,
  computeTrustSafetyCounts,
  computeTrustSafetyFacets,
  filterTrustSafetyReports,
  sortTrustSafetyReports,
  type TrustSafetyDataset,
} from "@/data/admin/report-management";
import { createTrustSafetyService } from "@/services/admin/report-management.service";
import { reviewReports } from "@/data/reviews";
import { getReportedPosts } from "@/data/posts";
import type { TrustSafetyReportRow } from "@/types/admin";

// Tested directly against the mock factory (not the `@/services/admin`
// barrel) so this suite keeps pinning the mock dataset regardless of which
// implementation `index.ts` wires up for the live /admin/safety console.
const trustSafetyService = createTrustSafetyService();

function makeRow(
  partial: Partial<TrustSafetyReportRow> &
    Pick<
      TrustSafetyReportRow,
      "id" | "source" | "status" | "reason" | "createdAt"
    >
): TrustSafetyReportRow {
  return {
    statusNote: "note",
    details: null,
    targetType: "product",
    targetId: "",
    targetName: "",
    targetPreview: "",
    targetStatus: null,
    targetHref: null,
    adminHref: null,
    campusId: null,
    reporterUserId: null,
    reporterName: "Unknown",
    entityReportCount: 1,
    ...partial,
  };
}

const rows: TrustSafetyReportRow[] = [
  makeRow({
    id: "rr1",
    source: "review",
    status: "open",
    reason: "fake",
    createdAt: "2025-01-01T00:00:00Z",
    targetType: "product",
    targetId: "prd-1",
    targetName: "Textbook",
    reporterName: "Ada",
    reporterUserId: "u-ada",
    entityReportCount: 2,
  }),
  makeRow({
    id: "rr2",
    source: "review",
    status: "open",
    reason: "fake",
    createdAt: "2025-01-02T00:00:00Z",
    targetType: "product",
    targetId: "prd-1",
    targetName: "Textbook",
    reporterName: "Ben",
    reporterUserId: "u-ben",
    entityReportCount: 2,
  }),
  makeRow({
    id: "prv-1-rep-0",
    source: "review",
    status: "reviewing",
    reason: "inappropriate",
    createdAt: "2025-01-03T00:00:00Z",
    targetType: "freelancer",
    targetId: "fl-1",
    targetName: "Chidi",
    reporterName: "Dara",
    reporterUserId: "u-dara",
    targetStatus: "pending",
  }),
  makeRow({
    id: "prv-2-rep-0",
    source: "review",
    status: "resolved",
    reason: "spam",
    createdAt: "2025-01-04T00:00:00Z",
    targetType: "employer",
    targetId: "em-1",
    targetName: "Acme",
    reporterName: "Kemi",
    reporterUserId: "u-kemi",
    targetStatus: "removed",
  }),
  makeRow({
    id: "rp1",
    source: "campus_post",
    status: "open",
    reason: "spam",
    createdAt: "2025-01-05T00:00:00Z",
    targetType: "post",
    targetId: "cp9",
    targetName: "Sell post",
    targetPreview: "Buying a calculator…",
    reporterName: "Obi",
    reporterUserId: "u-obi",
    adminHref: "/admin/campus",
  }),
  makeRow({
    id: "rp2",
    source: "campus_post",
    status: "open",
    reason: "harassment",
    createdAt: "2025-01-06T00:00:00Z",
    targetType: "post",
    targetId: "cp2",
    targetName: "Event post",
    reporterName: "Tobi",
    reporterUserId: "u-tobi",
  }),
  makeRow({
    id: "rp1-b",
    source: "campus_post",
    status: "open",
    reason: "spam",
    createdAt: "2025-01-07T00:00:00Z",
    targetType: "post",
    targetId: "cp9",
    targetName: "Sell post",
    reporterName: "Ngozi",
    reporterUserId: "u-ngozi",
    adminHref: "/admin/campus",
    entityReportCount: 2,
  }),
];

function datasetOf(dataRows: TrustSafetyReportRow[]): TrustSafetyDataset {
  const details = new Map(
    dataRows.map((r) => [
      r.id,
      {
        ...r,
        fullText: "Reported content",
        images: [],
        reporter: { id: r.reporterUserId, name: r.reporterName, campusName: null },
        entity: null,
        relatedReports: [],
        resolvable: r.source === "campus_post",
      },
    ])
  );
  return {
    rows: dataRows,
    details,
    fullText: new Map(dataRows.map((r) => [r.id, "Reported content"])),
    images: new Map(dataRows.map((r) => [r.id, []])),
  };
}

describe("trustSafetyService (live stores)", () => {
  it("surfaces the honest empty store state without fabricating reports", async () => {
    expect(reviewReports.length).toBe(0);
    expect(getReportedPosts().length).toBe(0);

    const counts = await trustSafetyService.getCounts();
    expect(counts.all).toBe(0);
    expect(counts.open).toBe(0);
    expect(counts.byStatus).toEqual({
      open: 0,
      reviewing: 0,
      resolved: 0,
      dismissed: 0,
    });
    expect(counts.bySource).toEqual({
      review: 0,
      campus_post: 0,
    });

    const list = await trustSafetyService.list();
    expect(list.total).toBe(0);
    expect(list.totalPages).toBe(1);

    expect(await trustSafetyService.getById("rr1")).toBeNull();
    expect(await trustSafetyService.getReasonOptions()).toEqual([]);
  });
});

describe("filterTrustSafetyReports", () => {
  it("returns all rows newest-first when no query is given", () => {
    const result = filterTrustSafetyReports(datasetOf(rows), {});
    expect(result.total).toBe(rows.length);
    const sorted = [...rows].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
    expect(result.items.map((r) => r.id)).toEqual(sorted.map((r) => r.id));
  });

  it("searches across id, target, reason and reporter", () => {
    const byTarget = filterTrustSafetyReports(datasetOf(rows), {
      search: "textbook",
    });
    expect(byTarget.total).toBe(2);

    const byReporter = filterTrustSafetyReports(datasetOf(rows), {
      search: "kemi",
    });
    expect(byReporter.total).toBe(1);
    expect(byReporter.items[0].id).toBe("prv-2-rep-0");

    const byReason = filterTrustSafetyReports(datasetOf(rows), {
      search: "harassment",
    });
    expect(byReason.total).toBe(1);
    expect(byReason.items[0].id).toBe("rp2");
  });

  it("filters by status, source, reason and target type", () => {
    const open = filterTrustSafetyReports(datasetOf(rows), { status: "open" });
    expect(open.total).toBe(5);
    expect(open.items.every((r) => r.status === "open")).toBe(true);

    const review = filterTrustSafetyReports(datasetOf(rows), {
      source: "review",
    });
    expect(review.total).toBe(4);
    expect(review.items.every((r) => r.source === "review")).toBe(true);

    const spam = filterTrustSafetyReports(datasetOf(rows), { reason: "spam" });
    expect(spam.total).toBe(3);

    const posts = filterTrustSafetyReports(datasetOf(rows), {
      targetType: "post",
    });
    expect(posts.total).toBe(3);
    expect(posts.items.every((r) => r.targetType === "post")).toBe(true);
  });

  it("paginates with the requested page size", () => {
    const page2 = filterTrustSafetyReports(datasetOf(rows), {
      page: 2,
      pageSize: 2,
    });
    expect(page2.page).toBe(2);
    expect(page2.items.length).toBe(2);
    expect(page2.totalPages).toBe(4);
  });
});

describe("sortTrustSafetyReports", () => {
  it("sorts ascending and descending by created date", () => {
    const asc = sortTrustSafetyReports(rows, "createdAt", "asc");
    expect(asc[0].createdAt).toBe("2025-01-01T00:00:00Z");
    const desc = sortTrustSafetyReports(rows, "createdAt", "desc");
    expect(desc[0].createdAt).toBe("2025-01-07T00:00:00Z");
  });

  it("sorts by entity report count", () => {
    const called = sortTrustSafetyReports(rows, "entityReportCount", "desc");
    expect(called[0].entityReportCount).toBe(2);
    const asc = sortTrustSafetyReports(rows, "entityReportCount", "asc");
    expect(asc[asc.length - 1].entityReportCount).toBe(2);
  });
});

describe("computeTrustSafetyCounts", () => {
  it("derives honest metrics from real rows", () => {
    const counts = computeTrustSafetyCounts(rows);
    expect(counts.all).toBe(7);
    expect(counts.byStatus).toEqual({
      open: 5,
      reviewing: 1,
      resolved: 1,
      dismissed: 0,
    });
    expect(counts.bySource).toEqual({
      review: 4,
      campus_post: 3,
    });
    expect(counts.byTargetType).toEqual({
      product: 2,
      vendor: 0,
      freelancer: 1,
      service_provider: 0,
      employer: 1,
      post: 3,
    });
    expect(counts.uniqueReporters).toBe(7);
    expect(counts.uniqueTargets).toBe(5); // prd-1, fl-1, em-1, cp9, cp2
  });
});

describe("computeTrustSafetyFacets", () => {
  it("derives facets from real rows, top target first", () => {
    const facets = computeTrustSafetyFacets(datasetOf(rows));
    expect(facets.sources.find((s) => s.source === "campus_post")?.count).toBe(3);
    expect(facets.statuses.find((s) => s.status === "open")?.count).toBe(5);
    expect(facets.reasons[0].reason).toBe("spam");
    expect(facets.reasons[0].count).toBe(3);
    expect(facets.topTargets[0].targetName).toBe("Textbook");
    expect(facets.topTargets[0].count).toBe(2);
  });
});

describe("buildTrustSafetyDetail", () => {
  it("returns the detail seed for a known id", () => {
    const dataset = datasetOf(rows);
    const detail = buildTrustSafetyDetail(dataset, "rp1");
    expect(detail).not.toBeNull();
    expect(detail?.source).toBe("campus_post");
    expect(detail?.fullText).toBe("Reported content");
    expect(detail?.targetPreview).toBe("Buying a calculator…");
  });

  it("returns null for an unknown id", () => {
    expect(buildTrustSafetyDetail(datasetOf(rows), "nope")).toBeNull();
    expect(buildTrustSafetyDetail(buildTrustSafetyDataset(), "nope")).toBeNull();
  });
});