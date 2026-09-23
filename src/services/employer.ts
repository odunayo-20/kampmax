// ============================================================
// EMPLOYER / CLIENT ONBOARDING SERVICE  (Module 26)
// ============================================================
//
// SECURITY: All operations are owner-scoped via the authenticated user
// (getCurrentUser().id) — never a client-supplied id (IDOR/BOLA). Status,
// completion %, approval, verification and public visibility are
// backend-owned. The frontend only collects editable user input; it never
// sets status, verification, approval or public flags.
//
// This service mirrors the freelancer/service-provider onboarding service
// pattern (sync, in-memory store, localStorage-synced draft for resilience).
//
// Expected future NestJS endpoints (documented in MODULE-26-REPORT.md):
//   POST   /employer/profile            → create application
//   GET    /employer/profile            → get draft (owner-scoped)
//   PATCH  /employer/profile            → save draft
//   GET    /employer/profile/status     → onboarding status
//   GET    /employer/profile/verification -> verification status
//   POST   /employer/profile/submit     → submit for review

import { getCurrentUser } from "@/services/users";
import { getCampuses, getCampusById } from "@/services/campus";
import { pushUserNotification } from "@/services/notifications";
import { apiClient } from "@/lib/api-client";
import type { ApiError } from "@/lib/api-client";
import {
  createEmployerApplication,
  getEmployerOnboardingDraft,
  saveEmployerDraft,
  getEmployerOnboardingStatus,
  getEmployerVerificationStatus,
  submitEmployerApplication,
  getEmployerByApprovedSlug,
} from "@/data/employer";
import { getOpenJobsForEmployer } from "@/data/opportunity";
import type {
  EmployerOnboardingDraft,
  EmployerOnboardingStatus,
  EmployerVerificationStatus,
  EmployerProfileUpdatePayload,
} from "@/types/employer";
import {
  EMPLOYER_ONBOARDING_STEPS,
  isEmployerBlockingStatus,
} from "@/types/employer";
import {
  EMPLOYER_HIRING_CATEGORIES,
  EMPLOYER_EXPERIENCE_LEVELS,
  EMPLOYER_WORK_TYPES,
  EMPLOYER_PROJECT_DURATIONS,
  EMPLOYER_BUSINESS_TYPES,
  EMPLOYER_ORG_SIZES,
  EMPLOYER_WORK_PREFERENCES,
  EMPLOYER_CONTACT_METHODS,
} from "@/config/employer";
import { isValidEmail } from "@/lib/utils";
import { EMPLOYER_DASHBOARD_SECTIONS } from "@/config/employer-dashboard";
import { EMPLOYER_GATE_EXEMPT_PATHS } from "@/config/employer-dashboard";

// ── Owner context ───────────────────────────────────────────

function currentUserId(): string | null {
  const user = getCurrentUser();
  return user?.id ?? null;
}

// ── Access gate (role activation) ───────────────────────────
// Mirrors getFreelancerDashboardAccess / getVendorAccess.

export const EMPLOYER_DASHBOARD_GATE = {
  APPROVED: "approved",
  PENDING_REVIEW: "pending_review",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
  IN_PROGRESS: "in_progress",
  NO_EMPLOYER: "no_employer",
} as const;

export type EmployerDashboardGateKind =
  (typeof EMPLOYER_DASHBOARD_GATE)[keyof typeof EMPLOYER_DASHBOARD_GATE];

export interface EmployerAccess {
  kind: EmployerDashboardGateKind;
  status: EmployerOnboardingStatus | null;
  canUseDashboard: boolean;
  message: string | null;
  displayName?: string;
}

export function getEmployerDashboardAccess(): EmployerAccess {
  const user = getCurrentUser();
  const draft = getEmployerOnboardingDraft(user.id);
  const status = getEmployerOnboardingStatus(user.id);

  if (!draft) {
    return {
      kind: EMPLOYER_DASHBOARD_GATE.NO_EMPLOYER,
      status: null,
      canUseDashboard: false,
      message: "You don't have an employer profile yet.",
      displayName: user.name,
    };
  }

  const base = { displayName: user.name };

  switch (status) {
    case "APPROVED":
      return {
        kind: EMPLOYER_DASHBOARD_GATE.APPROVED,
        status,
        canUseDashboard: true,
        message: null,
        ...base,
      };
    case "PENDING_REVIEW":
      return {
        kind: EMPLOYER_DASHBOARD_GATE.PENDING_REVIEW,
        status,
        canUseDashboard: false,
        message: "Your employer profile is under review.",
        ...base,
      };
    case "REJECTED":
      return {
        kind: EMPLOYER_DASHBOARD_GATE.REJECTED,
        status,
        canUseDashboard: false,
        message: "Your employer profile requires changes before going live.",
        ...base,
      };
    case "SUSPENDED":
      return {
        kind: EMPLOYER_DASHBOARD_GATE.SUSPENDED,
        status,
        canUseDashboard: false,
        message: "Your employer profile is currently unavailable.",
        ...base,
      };
    default:
      return {
        kind: EMPLOYER_DASHBOARD_GATE.IN_PROGRESS,
        status,
        canUseDashboard: false,
        message: "Complete your employer profile to start hiring.",
        ...base,
      };
  }
}

// ── Async Backend API (NestJS /employers) ───────────────────
//
// Every function calls apiClient and returns backend errors to the onboarding UI.

export interface EmployerBackendProfile {
  id: string;
  userId: string;
  companyName: string;
  verificationStatus: "not_started" | "pending" | "verified" | "rejected";
  onboardingStatus: EmployerOnboardingStatus;
  [key: string]: unknown;
}

/**
 * Create employer profile on the backend.
 * Endpoint: POST /employers/me
 */
export async function createEmployerProfileApi(
  dto: Partial<EmployerOnboardingDraft>
): Promise<{ profile: EmployerBackendProfile | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<
    Partial<EmployerOnboardingDraft>,
    EmployerBackendProfile
  >("/employers/me", dto);
  if (!error && data) return { profile: data, error: null };
  return { profile: null, error };
}

/**
 * Fetch the authenticated user's own employer profile.
 * Endpoint: GET /employers/me
 */
export async function getEmployerProfileApi(): Promise<{
  profile: EmployerBackendProfile | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.get<EmployerBackendProfile>("/employers/me");
  if (!error && data) return { profile: data, error: null };
  return { profile: null, error };
}

/**
 * Determine dashboard access gate state from the live backend.
 *
 * The gate is profile EXISTENCE, not verification status: an EmployerProfile
 * (POST /employers/me) is the explicit activation step for the Employer
 * capability — the backend never blocks job creation on verification, so
 * "unverified" must not lock the dashboard. A 404 on GET /employers/me means
 * the capability was never activated (NO_EMPLOYER); the profile's real
 * verificationStatus enum (UNVERIFIED/PENDING/VERIFIED/REJECTED) is only
 * used to label the badge shown inside the dashboard.
 */
export async function getEmployerDashboardAccessApi(): Promise<EmployerAccess> {
  const user = getCurrentUser();
  const displayName = user?.name;
  const { profile, error } = await getEmployerProfileApi();

  if (error) {
    if (error.status === 404) {
      return {
        kind: EMPLOYER_DASHBOARD_GATE.NO_EMPLOYER,
        status: null,
        canUseDashboard: false,
        message: "You don't have an employer profile yet.",
        displayName,
      };
    }
    throw error;
  }
  if (!profile) {
    throw new Error("Unable to load employer profile.");
  }

  const vs = String(profile.verificationStatus).toUpperCase();
  if (vs === "REJECTED") {
    return { kind: EMPLOYER_DASHBOARD_GATE.REJECTED, status: "REJECTED" as any, canUseDashboard: true, message: "Your employer verification requires changes.", displayName };
  }
  if (vs === "PENDING") {
    return { kind: EMPLOYER_DASHBOARD_GATE.PENDING_REVIEW, status: "PENDING_REVIEW" as any, canUseDashboard: true, message: "Your employer verification is under review.", displayName };
  }
  return { kind: EMPLOYER_DASHBOARD_GATE.APPROVED, status: "APPROVED" as any, canUseDashboard: true, message: null, displayName };
}

/**
 * Update the authenticated user's employer profile.
 * Endpoint: PATCH /employers/me
 */
export async function updateEmployerProfileApi(
  patch: Partial<EmployerOnboardingDraft>
): Promise<{ profile: EmployerBackendProfile | null; error: ApiError | null }> {
  const { data, error } = await apiClient.patch<
    Partial<EmployerOnboardingDraft>,
    EmployerBackendProfile
  >("/employers/me", patch);
  if (!error && data) return { profile: data, error: null };
  return { profile: null, error };
}

/**
 * Get a public employer profile by ID.
 * Endpoint: GET /employers/:id
 */
export async function getEmployerPublicProfileApi(
  id: string
): Promise<{ profile: EmployerBackendProfile | null; error: ApiError | null }> {
  const { data, error } = await apiClient.get<EmployerBackendProfile>(`/employers/${id}`);
  if (!error && data) return { profile: data, error: null };
  return { profile: null, error };
}

/**
 * Submit employer profile for review (DRAFT → PENDING_REVIEW).
 * Endpoint: PATCH /employers/me (with status field) — backend transitions the state.
 */
export async function submitEmployerApplicationApi(): Promise<{
  success: boolean;
  profile: EmployerBackendProfile | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.patch<
    { status: "PENDING_REVIEW" },
    EmployerBackendProfile
  >("/employers/me", { status: "PENDING_REVIEW" });
  if (!error && data) return { success: true, profile: data, error: null };
  return { success: false, profile: null, error };
}

// ── Sync/Local API ──────────────────────────────────────────

/**
 * Ensures an application record exists for the current user.
 */
export function createEmployerApplicationForUser(): { created: boolean } {
  const uid = currentUserId();
  if (!uid) return { created: false };
  const { created } = createEmployerApplication(uid);
  return { created };
}

/**
 * Returns the current draft for the authenticated user, or null.
 */
export function getEmployerOnboardingDraftForUser(): EmployerOnboardingDraft | null {
  const uid = currentUserId();
  if (!uid) return null;
  return getEmployerOnboardingDraft(uid);
}

/**
 * Persists draft changes (called on every step update + save-draft).
 */
export function saveEmployerDraftForUser(draft: EmployerOnboardingDraft): void {
  saveEmployerDraft(draft);
}

/**
 * Returns the current onboarding status for the authenticated user.
 */
export function getEmployerOnboardingStatusForUser(): EmployerOnboardingStatus {
  const uid = currentUserId();
  if (!uid) return "DRAFT" as EmployerOnboardingStatus;
  return getEmployerOnboardingStatus(uid);
}

/**
 * Returns the verification status for the authenticated user.
 * Verification is backend-owned — the frontend only displays it.
 */
export function getEmployerVerificationStatusForUser(): EmployerVerificationStatus {
  const uid = currentUserId();
  if (!uid) return "not_started";
  return getEmployerVerificationStatus(uid);
}

/**
 * Submits the employer profile for review. Backend-authoritative: the
 * store (backend) sets the status to PENDING_REVIEW on success.
 */
export function submitEmployerProfileForUser(): { success: boolean; message: string } {
  const uid = currentUserId();
  if (!uid) return { success: false, message: "Not authenticated." };
  const res = submitEmployerApplication(uid);
  if (res.success) {
    pushUserNotification({
      userId: uid,
      type: "account",
      category: "account",
      title: "Employer profile submitted",
      message: "Your employer profile has been submitted for review. You'll be notified once it's approved.",
      actionUrl: "/onboarding/employer",
    });
  }
  return res;
}

/**
 * Computes a simple completion percentage from the draft.
 * Backend would compute this; here we approximate for the UI.
 * Completion is NOT the same as verification — the backend owns both.
 */
export function computeEmployerCompletion(
  draft: EmployerOnboardingDraft | null
): number {
  if (!draft) return 0;

  // Number of meaningful sections contributing to completeness.
  let filled = 0;
  const total = 5;

  // Step 1 — Identity
  const identityOk =
    !!draft.clientType &&
    !!draft.profile.displayName?.trim() &&
    !!draft.profile.headline?.trim();
  if (identityOk) filled++;

  // Step 2 — Organization (required for org-like types)
  const isOrgLike =
    draft.clientType === "business" ||
    draft.clientType === "organization" ||
    draft.clientType === "campus_group";
  const orgOk = isOrgLike
    ? !!draft.organization.name?.trim() &&
      !!draft.organization.businessType?.trim()
    : true;
  if (orgOk) filled++;

  // Step 3 — Contact & location
  const contactOk = !!draft.contact.email?.trim() && !!draft.contact.phone?.trim();
  if (contactOk) filled++;

  // Step 4 — Hiring preferences
  const prefOk = draft.preferences.categories.length > 0;
  if (prefOk) filled++;

  // Step 5 — Reachable once in review
  filled++;

  return Math.round((filled / total) * 100);
}

// ── URL validation (security: reject javascript:/data:/vbscript:) ──

const SAFE_URL_SCHEMES = ["http:", "https:", "mailto:", "tel:"];

export function isSafeUrlCandidate(input: string | undefined | null): boolean {
  if (!input || !input.trim()) return true; // empty is fine (optional)
  let value = input.trim();
  // Reject obvious script injection even without a scheme prefix.
  if (/^\s*(javascript|vbscript|data)\s*:/i.test(value)) return false;
  if (value.indexOf(":") > -1) {
    const scheme = value.slice(0, value.indexOf(":")).toLowerCase();
    if (!SAFE_URL_SCHEMES.includes(scheme)) return false;
  }
  return true;
}

/**
 * Public-facing employer profile preview — only surfaces fields the backend
 * considers public. Contact details, internal notes and verification artifacts
 * are never included here.
 */
export function getEmployerPublicPreview(
  draft: EmployerOnboardingDraft | null
): {
  name: string;
  descriptor: string;
  about: string;
  location: string;
  verified: boolean;
} | null {
  if (!draft) return null;

  const isOrgLike =
    draft.clientType === "business" ||
    draft.clientType === "organization" ||
    draft.clientType === "campus_group";

  const name =
    (isOrgLike && draft.organization.name?.trim()) ||
    draft.profile.displayName?.trim() ||
    getCurrentUser().name;

  const industry = draft.organization.industry?.trim() || draft.profile.industry?.trim();
  const campus = draft.location.campusId ? getCampusById(draft.location.campusId) : undefined;

  const descriptor = [industry, campus?.name].filter(Boolean).join(" • ");

  const about =
    draft.organization.description?.trim() ||
    draft.profile.about?.trim() ||
    "";

  const location =
    [draft.location.city?.trim(), draft.location.state?.trim()]
      .filter(Boolean)
      .join(", ") || campus?.name || "";

  const verified = draft.verification.status === "verified";

  return { name, descriptor, about, location, verified };
}

/**
 * Campus options for the location step — reused from the existing campus
 * selection system (no duplicate dataset).
 */
export function getEmployerCampusOptions() {
  return getCampuses();
}

// ── Profile update (mass-assignment safe) ────────────────────

const VALID_CATEGORY_IDS = new Set<string>(EMPLOYER_HIRING_CATEGORIES.map((c) => c.id));
const VALID_EXPERIENCE = new Set<string>(EMPLOYER_EXPERIENCE_LEVELS.map((e) => e.value));
const VALID_WORK_TYPES = new Set<string>(EMPLOYER_WORK_TYPES.map((w) => w.value));
const VALID_DURATIONS = new Set<string>(EMPLOYER_PROJECT_DURATIONS.map((d) => d.value));
const VALID_BIZ_TYPES = new Set<string>(EMPLOYER_BUSINESS_TYPES.map((b) => b.value));
const VALID_ORG_SIZES = new Set<string>(EMPLOYER_ORG_SIZES.map((s) => s.value));
const VALID_WORK_PREFS = new Set<string>(EMPLOYER_WORK_PREFERENCES.map((w) => w.value));
const VALID_CONTACT_METHODS = new Set<string>(EMPLOYER_CONTACT_METHODS.map((c) => c.value));

function cap(input: string | undefined | null, max: number): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed.slice(0, max) : undefined;
}

function capOrNull(input: string | undefined | null, max: number): string | null | undefined {
  if (input === null) return null;
  return cap(input, max);
}

/**
 * Updates the authenticated employer's profile. Only allow-listed fields are
 * applied; admin-owned fields (status, verification, userId, applicationId,
 * approvedSlug, currentStep, submittedAt, adminMessage, reviewReason,
 * clientType) are never modified.
 */
export function updateEmployerProfileForUser(
  payload: EmployerProfileUpdatePayload
): { success: boolean; error?: string } {
  const uid = currentUserId();
  if (!uid) return { success: false, error: "Not authenticated." };

  const draft = getEmployerOnboardingDraft(uid);
  if (!draft) return { success: false, error: "No employer profile found." };

  // Build the merged draft — only apply allowed fields.
  const next: EmployerOnboardingDraft = { ...draft };

  if (payload.profile) {
    next.profile = {
      displayName: cap(payload.profile.displayName, 80),
      headline: cap(payload.profile.headline, 100),
      about: cap(payload.profile.about, 800),
      industry: cap(payload.profile.industry, 60),
      website: cap(payload.profile.website, 200),
      logoUrl: payload.profile.logoUrl,
    };
  }

  if (payload.organization) {
    next.organization = {
      name: cap(payload.organization.name, 100),
      businessType: cap(payload.organization.businessType, 40),
      industry: cap(payload.organization.industry, 60),
      description: cap(payload.organization.description, 800),
      size: cap(payload.organization.size, 40),
      website: cap(payload.organization.website, 200),
    };
  }

  if (payload.contact) {
    next.contact = {
      email: cap(payload.contact.email, 200),
      phone: cap(payload.contact.phone, 40),
      preferredContact: cap(payload.contact.preferredContact, 40),
    };
  }

  if (payload.location) {
    next.location = {
      campusId: capOrNull(payload.location.campusId, 60) ?? undefined,
      city: cap(payload.location.city, 60),
      state: cap(payload.location.state, 60),
      workPreference: payload.location.workPreference || "",
      remoteAvailable: !!payload.location.remoteAvailable,
    };
  }

  if (payload.preferences) {
    const rawCats = Array.isArray(payload.preferences.categories)
      ? payload.preferences.categories
      : [];
    const categories = rawCats.filter((c) => VALID_CATEGORY_IDS.has(c)).slice(0, 12);

    next.preferences = {
      categories,
      experience: cap(payload.preferences.experience, 40),
      workType: cap(payload.preferences.workType, 40),
      projectDuration: cap(payload.preferences.projectDuration, 40),
      budgetMin:
        typeof payload.preferences.budgetMin === "number" &&
        Number.isFinite(payload.preferences.budgetMin) &&
        payload.preferences.budgetMin >= 0
          ? payload.preferences.budgetMin
          : undefined,
      budgetMax:
        typeof payload.preferences.budgetMax === "number" &&
        Number.isFinite(payload.preferences.budgetMax) &&
        payload.preferences.budgetMax >= 0
          ? payload.preferences.budgetMax
          : undefined,
    };
    // Enforce min ≤ max when both present
    if (
      typeof next.preferences.budgetMin === "number" &&
      typeof next.preferences.budgetMax === "number" &&
      next.preferences.budgetMin > next.preferences.budgetMax
    ) {
      const swap = next.preferences.budgetMin;
      next.preferences.budgetMin = next.preferences.budgetMax;
      next.preferences.budgetMax = swap;
    }
  }

  // Validate optional URLs
  if (next.profile.website && !isSafeUrlCandidate(next.profile.website)) {
    next.profile.website = undefined;
  }
  if (next.organization.website && !isSafeUrlCandidate(next.organization.website)) {
    next.organization.website = undefined;
  }

  // Validate contact email
  if (next.contact.email && !isValidEmail(next.contact.email)) {
    next.contact.email = draft.contact.email; // revert to original
  }

  // Sanitize select values
  if (next.organization.businessType && !VALID_BIZ_TYPES.has(next.organization.businessType)) {
    next.organization.businessType = draft.organization.businessType;
  }
  if (next.organization.size && !VALID_ORG_SIZES.has(next.organization.size)) {
    next.organization.size = draft.organization.size;
  }
  if (next.contact.preferredContact && !VALID_CONTACT_METHODS.has(next.contact.preferredContact)) {
    next.contact.preferredContact = draft.contact.preferredContact;
  }
  if (next.location.workPreference && !VALID_WORK_PREFS.has(next.location.workPreference as string)) {
    next.location.workPreference = draft.location.workPreference;
  }
  if (next.preferences.experience && !VALID_EXPERIENCE.has(next.preferences.experience)) {
    next.preferences.experience = draft.preferences.experience;
  }
  if (next.preferences.workType && !VALID_WORK_TYPES.has(next.preferences.workType)) {
    next.preferences.workType = draft.preferences.workType;
  }
  if (next.preferences.projectDuration && !VALID_DURATIONS.has(next.preferences.projectDuration)) {
    next.preferences.projectDuration = draft.preferences.projectDuration;
  }

  // Preserve all admin/immutable fields
  next.userId = draft.userId;
  next.status = draft.status;
  next.currentStep = draft.currentStep;
  next.createdAt = draft.createdAt;
  next.submittedAt = draft.submittedAt;
  next.applicationId = draft.applicationId;
  next.adminMessage = draft.adminMessage;
  next.reviewReason = draft.reviewReason;
  next.approvedSlug = draft.approvedSlug;
  next.clientType = draft.clientType;
  next.verification = draft.verification;

  // If this is a DRAFT user, advance to IN_PROGRESS on first meaningful edit
  if (next.status === "DRAFT" && next.profile.displayName?.trim()) {
    next.status = "IN_PROGRESS" as EmployerOnboardingStatus;
    next.currentStep = Math.max(next.currentStep, 1) as 1;
  }

  saveEmployerDraft(next);

  return { success: true };
}

// ── Public employer profile lookup (by slug) ────────────────

/**
 * Returns the public employer profile for a given slug, plus their open jobs.
 * Used by the public /employers/[slug] page. No auth derivation — purely
 * a store lookup, identical to how a backend endpoint would work.
 */
export function getEmployerPublicProfileBySlug(slug: string) {
  const draft = getEmployerByApprovedSlug(slug);
  if (!draft) return null;

  const preview = getEmployerPublicPreview(draft);
  if (!preview) return null;

  const openJobs = getOpenJobsForEmployer(draft.userId);

  return {
    ...preview,
    userId: draft.userId,
    logoUrl: draft.profile.logoUrl ?? null,
    website: draft.profile.website?.trim() || draft.organization.website?.trim() || "",
    organizationSize: draft.organization.size?.trim() || "",
    slug: draft.approvedSlug ?? slug,
    openJobs,
  };
}

/** True when the pathname belongs to the full-screen Employer dashboard shell. */
export function isEmployerDashboardPath(pathname: string): boolean {
  return EMPLOYER_DASHBOARD_SECTIONS.some(
    (section) => pathname === section || pathname.startsWith(`${section}/`)
  );
}

/** True when the path is inside the employer shell but exempt from the access gate. */
export function isEmployerGateExemptPath(pathname: string): boolean {
  return EMPLOYER_GATE_EXEMPT_PATHS.some(
    (section) => pathname === section || pathname.startsWith(`${section}/`)
  );
}

export { EMPLOYER_ONBOARDING_STEPS, isEmployerBlockingStatus };
