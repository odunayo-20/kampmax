// ============================================================
// TRUST & SAFETY DATA (Module 42)
// ============================================================
//
// Aggregates report rows from the REAL platform report stores — no
// fabricated records (never invent severity/assignment/evidence). Sources:
//   - src/data/reviews.ts           — storefront review reports
//                                    (reviewReports; author-facing API in
//                                    services/reviews.ts reportReview)
//   - src/data/profile-reviews.ts   — freelancer/employer review reports
//                                    (Module 33; reportProfileReviewRecord)
//   - src/data/posts.ts             — campus post reports
//                                    (reportedPosts; reportPost in services/posts.ts)
//   - src/data/users.ts, products.ts, vendor drafts, campus names — identity
//
// STATUS MODEL (honest):
// No Kampmax store records report-level state (no triage transitions,
// severity, assignment, notes, history or escalation anywhere). The console
// therefore derives a report status ONLY from the reported target's OWN real
// moderation state where one exists:
//   - profile reviews carry a backend-owned status (published/pending/hidden/
//     removed) — mapped 1:1 and labelled "derived from target state".
//   - storefront reviews and campus posts record no moderation state at all —
//     those reports stay "open" and the note says exactly that.
// Everything else the spec asks for (queues, KPIs, notes) is an honest gap.
// ============================================================

import type {
  TrustSafetyEntity,
  TrustSafetyReportCounts,
  TrustSafetyReportDetail,
  TrustSafetyReportFacets,
  TrustSafetyReportListQuery,
  TrustSafetyReportRow,
  TrustSafetyReportStatus,
  TrustSafetySource,
  TrustSafetyTargetType,
} from "@/types/admin";
import type { ProfileReview } from "@/types/platform-reviews";
import { getUserById, getVendorById } from "@/data/users";
import { getProductById } from "@/data/products";
import { getCampusShortName } from "@/data/admin/campuses";
import { getFreelancerOnboardingDraft } from "@/data/freelancer";
import { getEmployerOnboardingDraft } from "@/data/employer";
import { reviews, reviewReports } from "@/data/reviews";
import {
  getAllProfileReviewsData,
  getProfileReviewReportsData,
} from "@/data/profile-reviews";
import { getCampusPostById, getReportedPosts } from "@/data/posts";

// ------------------------------------------------------------
// STATUS DERIVATION (see module header)
// ------------------------------------------------------------

const STATUS_NOTES: Record<string, string> = {
  storefrontOpen:
    "The storefront review store records reports but no report-level or review-level triage state — this report stays open until a moderator acts in the Reviews & Moderation console.",
  postOpen:
    "The platform post store records reports but no post-level moderation state on the reported row — action happens in the Campus Feed console.",
};

function profileReviewReportStatusOf(
  p: ProfileReview
): { status: TrustSafetyReportStatus; note: string } {
  switch (p.status) {
    case "pending":
      return {
        status: "reviewing",
        note: "Derived from the reported profile review's backend-owned status — the review is pending a moderation decision.",
      };
    case "hidden":
      return {
        status: "resolved",
        note: "Derived from the reported profile review's backend-owned status — the review is hidden.",
      };
    case "removed":
      return {
        status: "resolved",
        note: "Derived from the reported profile review's backend-owned status — the review is removed.",
      };
    case "published":
    default:
      return {
        status: "open",
        note: "Derived from the reported profile review's backend-owned status — the review is published.",
      };
  }
}

// ------------------------------------------------------------
// IDENTITY / LINK RESOLUTION
// ------------------------------------------------------------

function commentPreview(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > 140 ? `${trimmed.slice(0, 140)}…` : trimmed;
}

function campusNameOf(userId: string | null): string | null {
  if (!userId) return null;
  const campusId = getUserById(userId)?.campusId;
  return campusId ? getCampusShortName(campusId) : null;
}

function reporterOfA(userId: string | null): { id: string | null; name: string } {
  if (!userId) return { id: null, name: "Unknown" };
  return { id: userId, name: getUserById(userId)?.name ?? userId };
}

function entityOf(
  targetType: TrustSafetyTargetType,
  targetId: string
): TrustSafetyEntity {
  if (targetType === "product") {
    const product = getProductById(targetId);
    return {
      targetType,
      id: targetId,
      name: product?.title ?? targetId,
      // The product store has no verification field — never invent one.
      verified: false,
      href: `/marketplace/${targetId}`,
      hrefLabel: "View public product",
      adminHref: `/admin/products/${targetId}`,
    };
  }
  if (targetType === "vendor") {
    const vendor = getVendorById(targetId);
    return {
      targetType,
      id: targetId,
      name: vendor?.storeName ?? targetId,
      verified: vendor?.verified ?? false,
      href: vendor?.slug ? `/store/${vendor.slug}` : null,
      hrefLabel: "View public store",
      adminHref: `/admin/vendors/${targetId}`,
    };
  }
  if (targetType === "freelancer") {
    const user = getUserById(targetId);
    const slug = getFreelancerOnboardingDraft(targetId)?.approvedSlug ?? null;
    return {
      targetType,
      id: targetId,
      name: user?.name ?? targetId,
      verified: user?.isVerified ?? false,
      href: slug ? `/freelancers/${slug}` : null,
      hrefLabel: "View public profile",
      adminHref: `/admin/freelancers/${targetId}`,
    };
  }
  if (targetType === "employer") {
    const user = getUserById(targetId);
    const draft = getEmployerOnboardingDraft(targetId);
    return {
      targetType,
      id: targetId,
      name: draft?.organization.name ?? user?.name ?? targetId,
      verified:
        draft?.verification.status === "verified" || (user?.isVerified ?? false),
      href: draft?.approvedSlug ? `/employers/${draft.approvedSlug}` : null,
      hrefLabel: "View public profile",
      adminHref: `/admin/employers/${targetId}`,
    };
  }
  // post
  const post = getCampusPostById(targetId);
  return {
    targetType,
    id: targetId,
    name: post?.title ?? targetId,
    verified: false,
    href: `/community/${targetId}`,
    hrefLabel: "View public post",
    adminHref: `/admin/campus`,
  };
}

// ------------------------------------------------------------
// DATASET BUILDER
// ------------------------------------------------------------

export interface TrustSafetyDataset {
  rows: TrustSafetyReportRow[];
  details: Map<string, TrustSafetyReportDetail>;
  fullText: Map<string, string | null>;
  images: Map<string, { id: string; url: string; alt: string | null }[]>;
}

function entityKeyOf(source: TrustSafetySource, targetId: string): string {
  return `${source}:${targetId}`;
}

export function buildTrustSafetyDataset(): TrustSafetyDataset {
  const rows: TrustSafetyReportRow[] = [];
  const details = new Map<string, TrustSafetyReportDetail>();
  const fullText = new Map<string, string | null>();
  const images = new Map<string, { id: string; url: string; alt: string | null }[]>();

  const base: Omit<
    TrustSafetyReportRow,
    "id" | "source" | "reason" | "details" | "createdAt"
  > = {
    status: "open",
    statusNote: STATUS_NOTES.storefrontOpen,
    targetType: "product",
    targetId: "",
    targetName: "",
    targetPreview: "",
    targetStatus: null,
    targetHref: null,
    adminHref: null,
    campusId: null,
    reporterUserId: null,
    reporterName: "",
    entityReportCount: 0,
  };

  // ---- 1. Storefront review reports -------------------------
  for (const r of reviewReports) {
    const review = reviews.find((x) => x.id === r.reviewId);
    const targetType: TrustSafetyTargetType =
      review?.target === "vendor" ? "vendor" : "product";
    const targetId = review?.targetId ?? "";
    const entity = targetId ? entityOf(targetType, targetId) : null;
    const reporter = reporterOfA(r.userId);
    const row: TrustSafetyReportRow = {
      ...base,
      id: r.id,
      source: "review",
      reason: r.reason,
      details: r.details ?? null,
      createdAt: r.createdAt,
      status: "open",
      statusNote: STATUS_NOTES.storefrontOpen,
      targetType,
      targetId,
      targetName: entity?.name ?? review?.id ?? "(unknown)",
      targetPreview: review?.comment ? commentPreview(review.comment) : "",
      targetStatus: null,
      targetHref: entity?.href ?? null,
      adminHref: entity?.adminHref ?? null,
      campusId: getUserById(r.userId)?.campusId ?? null,
      reporterUserId: reporter.id,
      reporterName: reporter.name,
      entityReportCount: 0,
    };
    rows.push(row);
    fullText.set(r.id, review?.comment ?? null);
    images.set(r.id, []);
  }

  // ---- 2. Profile review reports ----------------------------
  for (const p of getAllProfileReviewsData()) {
    const reports = getProfileReviewReportsData(p.id);
    const targetType: TrustSafetyTargetType =
      p.revieweeKind === "freelancer" ? "freelancer" : "employer";
    const entity = entityOf(targetType, p.revieweeId);
    const { status, note } = profileReviewReportStatusOf(p);
    reports.forEach((r, i) => {
      const id = `${p.id}-rep-${i}`;
      const reporter = reporterOfA(r.userId);
      const row: TrustSafetyReportRow = {
        ...base,
        id,
        source: "review",
        reason: r.reason,
        details: r.details ?? null,
        createdAt: r.createdAt,
        status,
        statusNote: note,
        targetType,
        targetId: p.revieweeId,
        targetName: entity.name,
        targetPreview: commentPreview(p.comment),
        targetStatus: p.status,
        targetHref: entity.href,
        adminHref: entity.adminHref,
        campusId: getUserById(r.userId ?? "")?.campusId ?? null,
        reporterUserId: reporter.id,
        reporterName: reporter.name,
        entityReportCount: 0,
      };
      rows.push(row);
      fullText.set(id, p.comment);
      images.set(id, []);
    });
  }

  // ---- 3. Campus post reports -------------------------------
  for (const r of getReportedPosts()) {
    const post = getCampusPostById(r.postId);
    const reporter = reporterOfA(r.userId);
    const row: TrustSafetyReportRow = {
      ...base,
      id: r.id,
      source: "campus_post",
      reason: r.reason,
      details: r.details ?? null,
      createdAt: r.createdAt,
      status: "open",
      statusNote: STATUS_NOTES.postOpen,
      targetType: "post",
      targetId: r.postId,
      targetName: post?.title ?? "(deleted post)",
      targetPreview: post ? commentPreview(post.content) : "(post deleted)",
      targetStatus: null,
      targetHref: `/community/${r.postId}`,
      adminHref: "/admin/campus",
      campusId: post?.campusId ?? getUserById(r.userId)?.campusId ?? null,
      reporterUserId: reporter.id,
      reporterName: reporter.name,
      entityReportCount: 0,
    };
    rows.push(row);
    fullText.set(r.id, post?.content ?? null);
    images.set(r.id, []);
  }

  // ---- Entity-level counts (derived from real rows) ---------
  const perEntity = new Map<string, number>();
  for (const r of rows) {
    const key = entityKeyOf(r.source, r.targetId);
    perEntity.set(key, (perEntity.get(key) ?? 0) + 1);
  }
  for (const r of rows) {
    r.entityReportCount = perEntity.get(entityKeyOf(r.source, r.targetId)) ?? 1;
  }

  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // ---- Detail map --------------------------------------------
  for (const r of rows) {
    details.set(r.id, {
      ...r,
      fullText: fullText.get(r.id) ?? null,
      images: images.get(r.id) ?? [],
      reporter: {
        id: r.reporterUserId,
        name: r.reporterName,
        campusName: campusNameOf(r.reporterUserId),
      },
      entity: entityOfOrDefault(r),
      relatedReports: rows
        .filter(
          (x) => x.id !== r.id && entityKeyOf(x.source, x.targetId) === entityKeyOf(r.source, r.targetId)
        )
        .map((x) => ({
          id: x.id,
          source: x.source,
          reason: x.reason,
          createdAt: x.createdAt,
          reporterName: x.reporterName,
        })),
      // No moderation endpoint exists over this mock dataset — superseded by
      // the live /admin/safety API.
      resolvable: false,
    });
  }

  return { rows, details, fullText, images };
}

function entityOfOrDefault(r: TrustSafetyReportRow): TrustSafetyEntity | null {
  if (!r.targetId) return null;
  return entityOf(r.targetType, r.targetId);
}

// ------------------------------------------------------------
// QUERY HELPERS
// ------------------------------------------------------------

export function filterTrustSafetyReports(
  dataset: TrustSafetyDataset,
  query: TrustSafetyReportListQuery
): {
  items: TrustSafetyReportRow[];
  total: number;
  page: number;
  totalPages: number;
} {
  let filtered = [...dataset.rows];

  const rawSearch = query.search?.trim().toLowerCase();
  if (rawSearch) {
    filtered = filtered.filter((r) =>
      [r.id, r.targetName, r.targetId, r.reason, r.reporterName].some((v) =>
        v.toLowerCase().includes(rawSearch)
      )
    );
  }

  if (query.status && query.status !== "all") {
    filtered = filtered.filter((r) => r.status === query.status);
  }
  if (query.source && query.source !== "all") {
    filtered = filtered.filter((r) => r.source === query.source);
  }
  if (query.reason && query.reason !== "all") {
    filtered = filtered.filter((r) => r.reason === query.reason);
  }
  if (query.targetType && query.targetType !== "all") {
    filtered = filtered.filter((r) => r.targetType === query.targetType);
  }
  if (query.campusId && query.campusId !== "all") {
    filtered = filtered.filter((r) => r.campusId === query.campusId);
  }

  filtered = sortTrustSafetyReports(
    filtered,
    query.sortBy ?? "createdAt",
    query.sortDir ?? "desc"
  );

  const total = filtered.length;
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? 10);
  const start = (page - 1) * pageSize;
  return {
    items: filtered.slice(start, start + pageSize),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function sortTrustSafetyReports(
  list: TrustSafetyReportRow[],
  sortBy: TrustSafetyReportListQuery["sortBy"],
  sortDir: "asc" | "desc"
): TrustSafetyReportRow[] {
  const dir = sortDir === "asc" ? 1 : -1;
  const sorted = [...list];
  if (sortBy === "entityReportCount") {
    sorted.sort((a, b) => (a.entityReportCount - b.entityReportCount) * dir);
  } else {
    sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt) * dir);
  }
  return sorted;
}

// ------------------------------------------------------------
// AGGREGATES (derived from real rows only)
// ------------------------------------------------------------

const STATUSES: TrustSafetyReportStatus[] = ["open", "reviewing", "resolved", "dismissed"];
const SOURCES: TrustSafetySource[] = ["review", "campus_post"];
const TARGET_TYPES: TrustSafetyTargetType[] = [
  "product",
  "vendor",
  "freelancer",
  "service_provider",
  "employer",
  "post",
];

export function computeTrustSafetyCounts(
  rows: TrustSafetyReportRow[]
): TrustSafetyReportCounts {
  const byStatus: Record<TrustSafetyReportStatus, number> = {
    open: 0,
    reviewing: 0,
    resolved: 0,
    dismissed: 0,
  };
  const bySource: Record<TrustSafetySource, number> = {
    review: 0,
    campus_post: 0,
  };
  const byReason = new Map<string, number>();
  const byTargetType: Record<TrustSafetyTargetType, number> = {
    product: 0,
    vendor: 0,
    freelancer: 0,
    service_provider: 0,
    employer: 0,
    post: 0,
  };
  const reporters = new Set<string>();
  const targets = new Set<string>();

  for (const r of rows) {
    byStatus[r.status] += 1;
    bySource[r.source] += 1;
    byReason.set(r.reason, (byReason.get(r.reason) ?? 0) + 1);
    byTargetType[r.targetType] += 1;
    if (r.reporterUserId) reporters.add(r.reporterUserId);
    targets.add(entityKeyOf(r.source, r.targetId));
  }

  return {
    all: rows.length,
    byStatus,
    bySource,
    byReason: Array.from(byReason.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    byTargetType,
    uniqueReporters: reporters.size,
    uniqueTargets: targets.size,
    open: byStatus.open,
  };
}

export function computeTrustSafetyFacets(
  dataset: TrustSafetyDataset
): TrustSafetyReportFacets {
  const rows = dataset.rows;
  const sourceMap = new Map<TrustSafetySource, number>();
  const statusMap = new Map<TrustSafetyReportStatus, number>();
  const reasonMap = new Map<string, number>();
  const targetMap = new Map<TrustSafetyTargetType, number>();
  const entityMap = new Map<string, TrustSafetyReportRow>();

  for (const r of rows) {
    sourceMap.set(r.source, (sourceMap.get(r.source) ?? 0) + 1);
    statusMap.set(r.status, (statusMap.get(r.status) ?? 0) + 1);
    reasonMap.set(r.reason, (reasonMap.get(r.reason) ?? 0) + 1);
    targetMap.set(r.targetType, (targetMap.get(r.targetType) ?? 0) + 1);
    const key = entityKeyOf(r.source, r.targetId);
    const existing = entityMap.get(key);
    if (!existing || existing.entityReportCount < r.entityReportCount) {
      entityMap.set(key, r);
    }
  }

  return {
    sources: SOURCES.map((source) => ({
      source,
      count: sourceMap.get(source) ?? 0,
    })),
    statuses: STATUSES.map((status) => ({
      status,
      count: statusMap.get(status) ?? 0,
    })),
    reasons: Array.from(reasonMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    targetTypes: TARGET_TYPES.map((targetType) => ({
      targetType,
      count: targetMap.get(targetType) ?? 0,
    })),
    topTargets: Array.from(entityMap.values())
      .map((r) => ({
        targetId: r.targetId,
        targetName: r.targetName,
        targetType: r.targetType,
        count: r.entityReportCount,
        adminHref: r.adminHref,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  };
}

export function buildTrustSafetyDetail(
  dataset: TrustSafetyDataset,
  id: string
): TrustSafetyReportDetail | null {
  return dataset.details.get(id) ?? null;
}