// ============================================================
// PROFILE REVIEWS SERVICE (Module 33)
// ============================================================
// Frontend service mirroring the future reviews API. The UI never decides
// eligibility: every write is gated on (a) an authenticated user, (b) a
// resolved target profile, (c) a COMPLETED contract between the parties
// (from data/contracts.ts), (d) the one-review-per-pair rule and (e) the
// store's rate limit. Notifications are emitted here (backend surrogate),
// never from components.

import { apiClient } from "@/lib/api-client";
import type {
  ProfileReview,
  ProfileReviewActionResult,
  ProfileReviewEligibility,
  ProfileReviewFilter,
  ProfileReviewInput,
  ProfileReviewListResult,
  ProfileReviewReportInput,
  ProfileReviewResultCode,
  ProfileReviewSummary,
  ProfileReviewTargetKind,
} from "@/types/platform-reviews";
import {
  PROFILE_REVIEW_COMMENT_MAX,
  PROFILE_REVIEW_COMMENT_MIN,
  PROFILE_REVIEW_NOTIFICATION,
} from "@/config/platform-reviews";
import { getCurrentUser, getUserById } from "@/services/users";
import { getAllCompletedContracts } from "@/data/contracts";
import { getEmployerOnboardingDraft } from "@/data/employer";
import {
  createProfileReviewRecord,
  deleteProfileReviewRecord,
  getProfileReviewByIdData,
  getProfileReviewByReviewerData,
  getProfileReviewsData,
  getProfileReviewSummaryData,
  profileReviewMutationAllowed,
  reportProfileReviewRecord,
  updateProfileReviewRecord,
} from "@/data/profile-reviews";
import { pushUserNotification } from "@/services/notifications";
import type { ReviewReportReason } from "@/types";

const REPORT_REASONS = new Set<ReviewReportReason>([
  "spam",
  "fake",
  "inappropriate",
  "offensive",
  "irrelevant",
  "other",
]);

// ── Target resolution ───────────────────────────────────────

function isFreelancerTarget(userId: string): boolean {
  return Boolean(getUserById(userId));
}

function isEmployerTarget(userId: string): boolean {
  const draft = getEmployerOnboardingDraft(userId);
  return Boolean(draft && draft.status === "APPROVED");
}

function targetExists(userId: string, kind: ProfileReviewTargetKind): boolean {
  return kind === "freelancer"
    ? isFreelancerTarget(userId)
    : isEmployerTarget(userId);
}

/**
 * The eligibility source of truth: a COMPLETED contract between the two
 * parties. Accepted proposals and jobs are NOT completed work — only
 * contracts the backend surrogate recorded as COMPLETED count.
 */
function hasCompletedEngagement(aUserId: string, bUserId: string): boolean {
  return getAllCompletedContracts().some(
    ({ contract, freelancerId }) =>
      (freelancerId === aUserId && contract.client.id === bUserId) ||
      (freelancerId === bUserId && contract.client.id === aUserId)
  );
}

function isRatedRating(value: number): value is 1 | 2 | 3 | 4 | 5 {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

function validateInput(input: ProfileReviewInput): string | null {
  if (!isRatedRating(input.rating)) {
    return "Please select a star rating between 1 and 5.";
  }
  const comment = input.comment?.trim() ?? "";
  if (comment.length < PROFILE_REVIEW_COMMENT_MIN) {
    return `Your review needs at least ${PROFILE_REVIEW_COMMENT_MIN} characters.`;
  }
  if (comment.length > PROFILE_REVIEW_COMMENT_MAX) {
    return `Your review must be ${PROFILE_REVIEW_COMMENT_MAX} characters or fewer.`;
  }
  return null;
}

// ── Read API ────────────────────────────────────────────────

export function getProfileReviewSummary(
  revieweeId: string,
  kind: ProfileReviewTargetKind
): ProfileReviewSummary {
  return getProfileReviewSummaryData(revieweeId, kind);
}

export function getProfileReviews(
  revieweeId: string,
  kind: ProfileReviewTargetKind,
  filter: ProfileReviewFilter
): ProfileReviewListResult {
  return getProfileReviewsData(revieweeId, kind, filter);
}

// ── Eligibility ─────────────────────────────────────────────

export function getProfileReviewEligibility(
  targetUserId: string,
  kind: ProfileReviewTargetKind
): ProfileReviewEligibility {
  const user = getCurrentUser();
  if (!user) return { eligible: false, reasonCode: "unauth" };
  if (!targetExists(targetUserId, kind)) {
    return { eligible: false, reasonCode: "target_not_found" };
  }
  if (user.id === targetUserId) return { eligible: false, reasonCode: "self" };
  if (!hasCompletedEngagement(user.id, targetUserId)) {
    return { eligible: false, reasonCode: "no_completed_engagement" };
  }
  const existing = getProfileReviewByReviewerData(user.id, targetUserId, kind);
  if (existing) {
    return {
      eligible: false,
      reasonCode: "already_reviewed",
      existingReviewId: existing.id,
    };
  }
  return { eligible: true };
}

// ── Write API ───────────────────────────────────────────────

export function createProfileReview(
  targetUserId: string,
  kind: ProfileReviewTargetKind,
  input: ProfileReviewInput,
  targetSlug?: string
): ProfileReviewActionResult {
  const user = getCurrentUser();
  if (!user) {
    return result("UNAUTHENTICATED", "You need to be signed in to review this profile.");
  }
  if (!targetExists(targetUserId, kind)) {
    return result("NOT_FOUND", "This profile does not exist.");
  }
  if (user.id === targetUserId) {
    return result("SELF_REVIEW", "You can't review your own profile.");
  }
  if (!hasCompletedEngagement(user.id, targetUserId)) {
    return result(
      "NOT_ELIGIBLE",
      "You can review a freelancer or employer after a contract you both worked on is marked complete."
    );
  }
  if (getProfileReviewByReviewerData(user.id, targetUserId, kind)) {
    return result("ALREADY_REVIEWED", "You've already reviewed this profile.");
  }
  if (!profileReviewMutationAllowed(user.id)) {
    return result(
      "RATE_LIMITED",
      "You're doing that too often. Please try again in a few minutes."
    );
  }
  const invalidReason = validateInput(input);
  if (invalidReason) return result("INVALID_INPUT", invalidReason);

  const review = createProfileReviewRecord({
    author: {
      userId: user.id,
      name: user.name,
      avatar: user.avatar,
      verified: true,
    },
    revieweeId: targetUserId,
    revieweeKind: kind,
    review: { rating: input.rating, comment: input.comment },
  });

  notifyReviewee(review, targetSlug);

  return {
    ok: true,
    code: "OK",
    message: "Your review has been published.",
    review,
    summary: getProfileReviewSummaryData(targetUserId, kind),
  };
}

export function updateProfileReview(
  reviewId: string,
  input: ProfileReviewInput
): ProfileReviewActionResult {
  const user = getCurrentUser();
  if (!user) {
    return result("UNAUTHENTICATED", "You need to be signed in to edit your review.");
  }
  const current = getProfileReviewByIdData(reviewId);
  if (!current) return result("NOT_FOUND", "This review no longer exists.");
  if (!profileReviewMutationAllowed(user.id)) {
    return result(
      "RATE_LIMITED",
      "You're doing that too often. Please try again in a few minutes."
    );
  }
  const invalidReason = validateInput(input);
  if (invalidReason) return result("INVALID_INPUT", invalidReason);

  const updated = updateProfileReviewRecord(
    reviewId,
    { rating: input.rating, comment: input.comment },
    user.id
  );
  if (!updated) {
    return result("FORBIDDEN", "You can only edit your own reviews.");
  }
  return {
    ok: true,
    code: "OK",
    message: "Your review has been updated.",
    review: updated,
    summary: getProfileReviewSummaryData(current.revieweeId, current.revieweeKind),
  };
}

export function deleteProfileReview(reviewId: string): ProfileReviewActionResult {
  const user = getCurrentUser();
  if (!user) {
    return result("UNAUTHENTICATED", "You need to be signed in to delete your review.");
  }
  const current = getProfileReviewByIdData(reviewId);
  if (!current) return result("NOT_FOUND", "This review no longer exists.");
  if (!profileReviewMutationAllowed(user.id)) {
    return result(
      "RATE_LIMITED",
      "You're doing that too often. Please try again in a few minutes."
    );
  }
  if (!deleteProfileReviewRecord(reviewId, user.id)) {
    return result("FORBIDDEN", "You can only delete your own reviews.");
  }
  return {
    ok: true,
    code: "OK",
    message: "Your review has been removed.",
    summary: getProfileReviewSummaryData(current.revieweeId, current.revieweeKind),
  };
}

export function reportProfileReview(
  reviewId: string,
  input: ProfileReviewReportInput
): ProfileReviewActionResult {
  const user = getCurrentUser();
  if (!user) {
    return result("UNAUTHENTICATED", "You need to be signed in to report a review.");
  }
  const current = getProfileReviewByIdData(reviewId);
  if (!current) return result("NOT_FOUND", "This review no longer exists.");
  if (!REPORT_REASONS.has(input.reason)) {
    return result("INVALID_INPUT", "Please choose a valid report reason.");
  }
  const outcome = reportProfileReviewRecord({
    reviewId,
    userId: user.id,
    reason: input.reason,
    details: input.details,
  });
  if (outcome.code === "ALREADY_REPORTED") {
    return result("ALREADY_REPORTED", "You've already reported this review.");
  }
  return {
    ok: true,
    code: "OK",
    message: "Your report has been submitted. We'll review it shortly.",
  };
}

// ── Helpers ─────────────────────────────────────────────────

function result(
  code: ProfileReviewResultCode,
  message: string
): ProfileReviewActionResult {
  return { ok: code === "OK", code, message };
}

function notifyReviewee(review: ProfileReview, targetSlug?: string): void {
  const reviewee = getUserById(review.revieweeId);
  if (!reviewee) return;
  const base =
    review.revieweeKind === "freelancer" ? "/freelancers" : "/employers";
  pushUserNotification({
    userId: review.revieweeId,
    type: PROFILE_REVIEW_NOTIFICATION.type as "marketplace",
    category: PROFILE_REVIEW_NOTIFICATION.category as "marketplace",
    title: PROFILE_REVIEW_NOTIFICATION.title,
    message: `${review.author.name} rated you ${review.rating} of 5.`,
    actionUrl: targetSlug ? `${base}/${targetSlug}` : undefined,
  });
}