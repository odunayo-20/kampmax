// ============================================================
// REVIEW MANAGEMENT DATA (Module 41)
// ============================================================
//
// Aggregates from the REAL platform review stores — no fabricated
// records (spec §45/§42). Sources:
//   - src/data/reviews.ts          — storefront reviews (product/vendor)
//   - src/data/reviews.ts          — reviewReports (read-only, empty today)
//   - src/data/profile-reviews.ts  — freelancer/employer profile reviews
//                                    (Module 33, carries the REAL status)
//   - src/data/users.ts            — reviewer / vendor identity
//   - src/data/products.ts         — product titles for product targets
//   - src/data/freelancer.ts / employer.ts — public slugs for entity links
//   - src/data/admin/campuses.ts   — campus short names
//
// SECURITY: this module only ever READS the stores. No moderation
// transitions exist anywhere: storefront reviews have no status field
// (their presence in the public store IS their publication) and the
// profile-review store exposes no admin transitions. The console is
// deliberately read-only and every unsupported surface is honest-empty.
// ============================================================

import type {
  ManagedReviewCounts,
  ManagedReviewDetail,
  ManagedReviewFacets,
  ManagedReviewListQuery,
  ManagedReviewReportView,
  ManagedReviewRow,
  ManagedReviewStatus,
  ManagedReviewTargetType,
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

// ------------------------------------------------------------
// DERIVED STATUS CONCEPT (honest)
// ------------------------------------------------------------
// Storefront reviews have NO moderation state in the store. Their presence
// in the public reviews array is their publication, so the console derives
// "published" and says so with statusSource: "derived". Profile reviews
// carry a real backend-owned status field surfaced 1:1 ("store").

export function statusOfStorefrontReview(): {
  status: ManagedReviewStatus;
  source: ManagedReviewRow["statusSource"];
} {
  return { status: "published", source: "derived" };
}

function profileStatusOf(p: ProfileReview): ManagedReviewStatus {
  switch (p.status) {
    case "pending":
      return "pending";
    case "hidden":
      return "hidden";
    case "removed":
      return "removed";
    case "published":
    default:
      return "published";
  }
}

function statusNoteOf(row: ManagedReviewRow): string {
  if (row.statusSource === "derived") {
    return "Storefront reviews carry no moderation state in the store — being present in the public store IS their publication. “Published” here is derived from that fact, never invented.";
  }
  switch (row.status) {
    case "pending":
      return "Backend-owned pending state — the review awaits a moderation decision that the profile-review store does not provide.";
    case "hidden":
      return "Backend-owned hidden state recorded by the profile-review store.";
    case "removed":
      return "Backend-owned removed state recorded by the profile-review store.";
    case "published":
    default:
      return "Backend-owned published state recorded by the profile-review store.";
  }
}

// ------------------------------------------------------------
// NAME / LINK RESOLUTION
// ------------------------------------------------------------

const MOCK_ACTIONS = {
  moderatable: false,
  note: "No moderation endpoint exists over these mock stores — this is the frontend-only dataset superseded by the live /admin/reviews API.",
};

function commentPreview(comment: string): string {
  const trimmed = comment.trim();
  return trimmed.length > 140 ? `${trimmed.slice(0, 140)}…` : trimmed;
}

function avatarOf(avatar: string | undefined): string | null {
  return avatar && avatar.length > 0 ? avatar : null;
}

function campusNameOf(userId: string | null): string | null {
  if (!userId) return null;
  const campusId = getUserById(userId)?.campusId;
  return campusId ? getCampusShortName(campusId) : null;
}

function reviewerNameOf(userId: string | null, fallback: string): string {
  return userId ? (getUserById(userId)?.name ?? fallback) : fallback;
}

function storefrontReportsOf(reviewId: string): ManagedReviewReportView[] {
  return reviewReports
    .filter((r) => r.reviewId === reviewId)
    .map((r) => ({
      id: r.id,
      reporterUserId: r.userId,
      reporterName: getUserById(r.userId)?.name ?? r.userId,
      reason: r.reason,
      details: r.details ?? null,
      createdAt: r.createdAt,
    }));
}

function profileReportsOf(reviewId: string): ManagedReviewReportView[] {
  return getProfileReviewReportsData(reviewId).map((r, i) => ({
    id: `${reviewId}-rep-${i}`,
    reporterUserId: r.userId,
    reporterName: getUserById(r.userId)?.name ?? r.userId,
    reason: r.reason,
    details: r.details ?? null,
    createdAt: r.createdAt,
  }));
}

// ------------------------------------------------------------
// DATASET BUILDER
// ------------------------------------------------------------

export interface ReviewDataset {
  rows: ManagedReviewRow[];
  details: Map<string, ManagedReviewDetail>;
  /** Full comment lookup so search and previews agree. */
  fullComments: Map<string, string>;
}

function entityOf(
  targetType: ManagedReviewTargetType,
  targetId: string
): ManagedReviewDetail["entity"] {
  if (targetType === "product") {
    const product = getProductById(targetId);
    return {
      targetType,
      id: targetId,
      name: product?.title ?? targetId,
      // The product store has no verification field — preserve that (never
      // decorate a product with a "Verified" badge the store does not carry).
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
    const slug = user ? getFreelancerOnboardingDraft(targetId)?.approvedSlug : null;
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
  const user = getUserById(targetId);
  const draft = getEmployerOnboardingDraft(targetId);
  return {
    targetType,
    id: targetId,
    name: draft?.organization.name ?? user?.name ?? targetId,
    verified: draft?.verification.status === "verified" || (user?.isVerified ?? false),
    href: draft?.approvedSlug ? `/employers/${draft.approvedSlug}` : null,
    hrefLabel: "View public profile",
    adminHref: `/admin/employers/${targetId}`,
  };
}

export function buildReviewDataset(): ReviewDataset {
  const rows: ManagedReviewRow[] = [];
  const details = new Map<string, ManagedReviewDetail>();
  const fullComments = new Map<string, string>();

  // ---- 1. Storefront reviews (product / vendor) -------------
  for (const r of reviews) {
    const targetType: ManagedReviewTargetType =
      r.target === "product" ? "product" : "vendor";
    const targetName =
      targetType === "product"
        ? (getProductById(r.targetId)?.title ?? r.targetId)
        : (getVendorById(r.targetId)?.storeName ?? r.targetId);
    const { status, source } = statusOfStorefrontReview();
    const reports = storefrontReportsOf(r.id);

    const row: ManagedReviewRow = {
      id: r.id,
      targetType,
      targetId: r.targetId,
      targetName,
      reviewerId: r.userId,
      reviewerName: reviewerNameOf(r.userId, r.userId),
      reviewerAvatar: avatarOf(getUserById(r.userId)?.avatar),
      rating: r.rating as ManagedReviewRow["rating"],
      helpfulCount: r.helpfulCount,
      title: r.title ?? null,
      commentPreview: commentPreview(r.comment),
      status,
      statusSource: source,
      reportedCount: reports.length,
      verifiedPurchase: r.verifiedPurchase,
      withImages: (r.images?.length ?? 0) > 0,
      hasResponse: Boolean(r.vendorResponse),
      orderId: r.orderId ?? null,
      vendorId: r.vendorId ?? null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt ?? null,
    };

    fullComments.set(r.id, r.comment);
    details.set(r.id, {
      review: row,
      fullComment: r.comment,
      images:
        r.images?.map((i) => ({ id: i.id, url: i.url, alt: i.alt ?? null })) ?? [],
      vendorResponse: r.vendorResponse ?? null,
      reviewer: {
        id: row.reviewerId,
        name: row.reviewerName,
        avatar: row.reviewerAvatar,
        campusName: campusNameOf(row.reviewerId),
      },
      entity: entityOf(row.targetType, row.targetId),
      reports,
      statusNote: statusNoteOf(row),
      actions: MOCK_ACTIONS,
    });
    rows.push(row);
  }

  // ---- 2. Profile reviews (freelancer / employer) -----------
  for (const p of getAllProfileReviewsData()) {
    const targetType: ManagedReviewTargetType =
      p.revieweeKind === "freelancer" ? "freelancer" : "employer";
    const user = getUserById(p.revieweeId);
    const targetName =
      targetType === "freelancer"
        ? (user?.name ?? p.revieweeId)
        : (getEmployerOnboardingDraft(p.revieweeId)?.organization.name ??
          user?.name ??
          p.revieweeId);
    const reports = profileReportsOf(p.id);

    const row: ManagedReviewRow = {
      id: p.id,
      targetType,
      targetId: p.revieweeId,
      targetName,
      reviewerId: p.author.userId ?? null,
      reviewerName: p.author.name,
      reviewerAvatar: avatarOf(p.author.avatar),
      rating: p.rating,
      helpfulCount: 0,
      title: null,
      commentPreview: commentPreview(p.comment),
      status: profileStatusOf(p),
      statusSource: "store",
      reportedCount: p.reportCount,
      verifiedPurchase: true,
      withImages: false,
      hasResponse: false,
      orderId: null,
      vendorId: null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };

    fullComments.set(p.id, p.comment);
    details.set(p.id, {
      review: row,
      fullComment: p.comment,
      images: [],
      vendorResponse: null,
      reviewer: {
        id: row.reviewerId,
        name: row.reviewerName,
        avatar: row.reviewerAvatar,
        campusName: campusNameOf(row.reviewerId),
      },
      entity: entityOf(targetType, row.targetId),
      reports,
      statusNote: statusNoteOf(row),
      actions: MOCK_ACTIONS,
    });
    rows.push(row);
  }

  // Chronological within each source, newest first keeps list defaults sane.
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { rows, details, fullComments };
}

// ------------------------------------------------------------
// QUERY HELPERS
// ------------------------------------------------------------

export function filterReviews(
  dataset: ReviewDataset,
  query: ManagedReviewListQuery
): { items: ManagedReviewRow[]; total: number; page: number; totalPages: number } {
  let filtered = [...dataset.rows];

  const rawSearch = query.search?.trim().toLowerCase();
  if (rawSearch) {
    filtered = filtered.filter((r) => {
      const fullComment = dataset.fullComments.get(r.id) ?? "";
      return [r.id, r.targetName, r.reviewerName, r.title ?? "", fullComment].some(
        (v) => v.toLowerCase().includes(rawSearch)
      );
    });
  }

  if (query.status && query.status !== "all") {
    filtered = filtered.filter((r) => r.status === query.status);
  }
  if (query.rating && query.rating !== "all") {
    filtered = filtered.filter((r) => r.rating === query.rating);
  }
  if (query.targetType && query.targetType !== "all") {
    filtered = filtered.filter((r) => r.targetType === query.targetType);
  }
  if (query.vendorId && query.vendorId !== "all") {
    filtered = filtered.filter((r) => r.vendorId === query.vendorId);
  }
  if (query.response && query.response !== "all") {
    filtered = filtered.filter((r) =>
      query.response === "answered" ? r.hasResponse : !r.hasResponse
    );
  }
  if (query.reportedOnly) {
    filtered = filtered.filter((r) => r.reportedCount > 0);
  }

  filtered = sortReviews(filtered, query.sortBy ?? "createdAt", query.sortDir ?? "desc");

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

export function sortReviews(
  list: ManagedReviewRow[],
  sortBy: ManagedReviewListQuery["sortBy"],
  sortDir: "asc" | "desc"
): ManagedReviewRow[] {
  const dir = sortDir === "asc" ? 1 : -1;
  const compareNum = (a: number, b: number) => (a - b) * dir;
  const compareStr = (a: string, b: string) => a.localeCompare(b) * dir;

  const sorted = [...list];
  switch (sortBy) {
    case "rating":
      sorted.sort((a, b) => compareNum(a.rating, b.rating));
      break;
    case "helpful":
      sorted.sort((a, b) => compareNum(a.helpfulCount, b.helpfulCount));
      break;
    case "reported":
      sorted.sort((a, b) => compareNum(a.reportedCount, b.reportedCount));
      break;
    case "createdAt":
    default:
      sorted.sort((a, b) => compareStr(a.createdAt, b.createdAt));
      break;
  }
  return sorted;
}

export function computeReviewCounts(rows: ManagedReviewRow[]): ManagedReviewCounts {
  const byStatus: Record<ManagedReviewStatus, number> = {
    published: 0,
    pending: 0,
    hidden: 0,
    flagged: 0,
    removed: 0,
  };
  const byTargetType: Record<ManagedReviewTargetType, number> = {
    product: 0,
    vendor: 0,
    freelancer: 0,
    service_provider: 0,
    employer: 0,
  };
  let reported = 0;
  let withImages = 0;
  let withResponse = 0;

  for (const r of rows) {
    byStatus[r.status] += 1;
    byTargetType[r.targetType] += 1;
    if (r.reportedCount > 0) reported += 1;
    if (r.withImages) withImages += 1;
    if (r.hasResponse) withResponse += 1;
  }

  return {
    all: rows.length,
    byStatus,
    byTargetType,
    reported,
    // No moderation transitions exist in any review store, so attention is
    // honestly the reported set (zero today) — never a fabricated queue.
    needsAttention: reported,
    withImages,
    withResponse,
  };
}

const TARGET_TYPE_LABELS: Record<ManagedReviewTargetType, string> = {
  product: "Product",
  vendor: "Vendor",
  freelancer: "Freelancer",
  service_provider: "Service provider",
  employer: "Employer",
};

export function computeReviewFacets(rows: ManagedReviewRow[]): ManagedReviewFacets {
  const targetMap = new Map<ManagedReviewTargetType, number>();
  const vendorMap = new Map<string, number>();

  for (const r of rows) {
    targetMap.set(r.targetType, (targetMap.get(r.targetType) ?? 0) + 1);
    if (r.vendorId) vendorMap.set(r.vendorId, (vendorMap.get(r.vendorId) ?? 0) + 1);
  }

  const targetTypes = Array.from(targetMap.entries())
    .map(([id, count]) => ({
      id,
      name: TARGET_TYPE_LABELS[id] ?? id,
      count,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const vendors = Array.from(vendorMap.entries())
    .map(([id, count]) => {
      const sourceRow = rows.find((r) => r.vendorId === id);
      const vendor = getVendorById(id);
      return { id, name: vendor?.storeName ?? sourceRow?.targetName ?? id, count };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return { targetTypes, vendors };
}