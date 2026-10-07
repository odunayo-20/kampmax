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
import { apiClient } from "@/lib/api-client";
import type { ApiError } from "@/lib/api-client";
import { listPublicJobs } from "@/services/jobs";
import { jobToOpportunity } from "@/lib/job-api-mapping";
import type { EmployerOnboardingDraft, EmployerOnboardingStatus, EmployerVerificationStatus, EmployerPublicProfile } from "@/types/employer";
import {
  EMPLOYER_ONBOARDING_STEPS,
  isEmployerBlockingStatus,
} from "@/types/employer";
import { EMPLOYER_DASHBOARD_SECTIONS } from "@/config/employer-dashboard";
import { EMPLOYER_GATE_EXEMPT_PATHS } from "@/config/employer-dashboard";

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

/** Flat shape the backend's CreateEmployerProfileDto actually expects —
 * NOT the nested EmployerOnboardingDraft shape used by the onboarding UI. */
export interface CreateEmployerProfileDto {
  displayName: string;
  companyName?: string;
  companyDescription?: string;
  industry?: string;
  websiteUrl?: string;
  location?: string;
  country?: string;
  state?: string;
  city?: string;
  campusId?: string;
}

/**
 * Create employer profile on the backend — this IS the onboarding
 * completion step (POST /employers/me). No NIN/BVN/CAC document is
 * required here; verification is a separate, optional flow.
 */
export async function createEmployerProfileApi(
  dto: CreateEmployerProfileDto
): Promise<{ profile: EmployerBackendProfile | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<
    CreateEmployerProfileDto,
    EmployerBackendProfile
  >("/employers/me", dto);
  if (!error && data) return { profile: data, error: null };
  return { profile: null, error };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Maps the onboarding wizard's nested draft into the flat backend DTO. */
export function employerDraftToCreateDto(
  draft: EmployerOnboardingDraft
): CreateEmployerProfileDto {
  return {
    displayName: draft.profile?.displayName?.trim() || draft.organization?.name?.trim() || "Employer",
    companyName: draft.organization?.name?.trim() || undefined,
    companyDescription: draft.organization?.description?.trim() || draft.profile?.about?.trim() || undefined,
    industry: draft.organization?.industry?.trim() || draft.profile?.industry?.trim() || undefined,
    websiteUrl: draft.organization?.website?.trim() || draft.profile?.website?.trim() || undefined,
    city: draft.location?.city?.trim() || undefined,
    // Backend requires a UUID; ignore mock slug ids (e.g. "rugipo").
    campusId: UUID_RE.test(draft.location?.campusId ?? "") ? draft.location.campusId : undefined,
  };
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
  patch: Partial<EmployerOnboardingDraft> | Record<string, unknown>
): Promise<{ profile: EmployerBackendProfile | null; error: ApiError | null }> {
  const { data, error } = await apiClient.patch<
    Partial<EmployerOnboardingDraft> | Record<string, unknown>,
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

/** The fields of GET /employers/me that the profile screens use. */
interface BackendEmployerFields {
  displayName?: string;
  companyName?: string | null;
  companyDescription?: string | null;
  industry?: string | null;
  websiteUrl?: string | null;
  city?: string | null;
  state?: string | null;
  campusId?: string | null;
  verificationStatus?: string;
  isPublic?: boolean;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

const VERIFICATION_FROM_BACKEND: Record<string, EmployerVerificationStatus> = {
  UNVERIFIED: "not_started",
  PENDING: "pending",
  VERIFIED: "verified",
  REJECTED: "rejected",
};

export function employerVerificationFrom(status: string | undefined): EmployerVerificationStatus {
  return VERIFICATION_FROM_BACKEND[String(status).toUpperCase()] ?? "not_started";
}

/**
 * The profile screens' draft shape, filled from the real backend profile.
 * Fields the backend does not store (headline, contact, preferences) stay empty.
 */
export function backendProfileToDraft(profile: EmployerBackendProfile): EmployerOnboardingDraft {
  const p = profile as unknown as BackendEmployerFields;
  const now = new Date().toISOString();
  return {
    userId: p.userId ?? "",
    status: employerVerificationFrom(p.verificationStatus) === "verified" ? "APPROVED" : "PENDING_REVIEW",
    currentStep: 5,
    createdAt: p.createdAt ?? now,
    updatedAt: p.updatedAt ?? now,
    clientType: p.companyName ? "business" : "individual",
    profile: {
      displayName: p.displayName ?? "",
      about: p.companyDescription ?? "",
      industry: p.industry ?? "",
      website: p.websiteUrl ?? "",
      logoUrl: null,
    },
    organization: {
      name: p.companyName ?? "",
      industry: p.industry ?? "",
      description: p.companyDescription ?? "",
      website: p.websiteUrl ?? "",
    },
    contact: {},
    location: {
      campusId: p.campusId ?? undefined,
      city: p.city ?? "",
      state: p.state ?? "",
    },
    preferences: { categories: [] },
    verification: { status: employerVerificationFrom(p.verificationStatus) },
    approvedSlug: p.isPublic && employerVerificationFrom(p.verificationStatus) === "verified" ? (profile.id as string) : undefined,
  };
}

/** How complete the real profile is: the five things the backend stores. */
export function backendProfileCompletion(profile: EmployerBackendProfile): number {
  const p = profile as unknown as BackendEmployerFields;
  const checks = [
    !!p.displayName?.trim(),
    !!p.companyName?.trim(),
    !!p.companyDescription?.trim(),
    !!p.industry?.trim(),
    !!(p.city?.trim() || p.campusId),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
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

// ── Public employer profile lookup (by slug) ────────────────

/**
 * Returns the public employer profile for a given slug, plus their open jobs.
 * Used by the public /employers/[slug] page. No auth derivation — purely
 * a store lookup, identical to how a backend endpoint would work.
 */
/**
 * A public employer profile from the backend (GET /employers/:id), with the
 * jobs they currently have open. Null when the profile is missing, private or
 * suspended. Fields the backend does not store are left empty, not invented.
 */
export async function getEmployerPublicProfileFromBackend(
  id: string
): Promise<EmployerPublicProfile | null> {
  if (!UUID_RE.test(id)) return null;
  const { profile } = await getEmployerPublicProfileApi(id);
  if (!profile) return null;

  const raw = profile as unknown as {
    id: string;
    userId: string;
    displayName: string;
    companyName: string | null;
    companyDescription: string | null;
    industry: string | null;
    websiteUrl: string | null;
    city: string | null;
    state: string | null;
    verificationStatus: string;
  };

  const { jobs } = await listPublicJobs({ employerId: id, limit: 20 });

  return {
    userId: raw.userId,
    name: raw.companyName?.trim() || raw.displayName,
    descriptor: raw.industry ?? "",
    about: raw.companyDescription ?? "",
    location: [raw.city, raw.state].filter(Boolean).join(", "),
    logoUrl: null,
    website: raw.websiteUrl ?? "",
    organizationSize: "",
    verified: String(raw.verificationStatus).toUpperCase() === "VERIFIED",
    slug: raw.id,
    openJobs: jobs.map(jobToOpportunity).map((o) => ({
      id: o.id,
      title: o.title,
      summary: o.summary,
      budget: o.budget,
      duration: o.duration,
      experienceLevel: o.experienceLevel,
      postedAt: o.postedAt,
      location: o.location,
    })),
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
