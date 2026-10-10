// ============================================================
// EMPLOYER / CLIENT ONBOARDING TYPES  (Module 26)
// ============================================================
//
// Backend-authoritative projections for the employer/client onboarding flow.
// The frontend collects editable user input; the backend owns status,
// completion %, approval, verification and public visibility.
//
// This mirrors the freelancer / service-provider onboarding type pattern:
// const-object enum + derived union, step ids, step labels/descriptions,
// blocking statuses, and a draft (form data model) that maps 1:1 to the
// fields a future NestJS employer-profile DTO would accept.

import type { Opportunity } from "./opportunity";

// ── Onboarding status ───────────────────────────────────────

export const EMPLOYER_ONBOARDING_STATUS = {
  DRAFT: "DRAFT",
  IN_PROGRESS: "IN_PROGRESS",
  PENDING_REVIEW: "PENDING_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  SUSPENDED: "SUSPENDED",
} as const;

export type EmployerOnboardingStatus =
  (typeof EMPLOYER_ONBOARDING_STATUS)[keyof typeof EMPLOYER_ONBOARDING_STATUS];

// ── Steps ───────────────────────────────────────────────────

export const EMPLOYER_ONBOARDING_STEP = {
  IDENTITY: 1,
  ORGANIZATION: 2,
  CONTACT: 3,
  PREFERENCES: 4,
  REVIEW: 5,
} as const;

export type EmployerOnboardingStepId = 1 | 2 | 3 | 4 | 5;

export const EMPLOYER_ONBOARDING_STEPS = 5;

// ── Step labels & descriptions ──────────────────────────────

export const EMPLOYER_ONBOARDING_STEP_LABELS: Record<EmployerOnboardingStepId, string> = {
  1: "Identity",
  2: "Organization",
  3: "Contact",
  4: "Hiring Preferences",
  5: "Review & Submit",
};

export const EMPLOYER_ONBOARDING_STEP_DESCRIPTIONS: Record<EmployerOnboardingStepId, string> = {
  1: "Who are you hiring as? Your name and professional profile.",
  2: "Information about your business or organization.",
  3: "How should freelancers reach you, and where are you hiring?",
  4: "What kind of freelancers are you looking for?",
  5: "Review everything and submit your profile.",
};

// ── Blocking statuses ───────────────────────────────────────

export const BLOCKING_EMPLOYER_STATUSES: EmployerOnboardingStatus[] = [
  EMPLOYER_ONBOARDING_STATUS.PENDING_REVIEW,
  EMPLOYER_ONBOARDING_STATUS.APPROVED,
  EMPLOYER_ONBOARDING_STATUS.REJECTED,
  EMPLOYER_ONBOARDING_STATUS.SUSPENDED,
];

export function isEmployerBlockingStatus(
  status: EmployerOnboardingStatus | null | undefined
): boolean {
  if (!status) return false;
  return BLOCKING_EMPLOYER_STATUSES.includes(status);
}

// ── Client type ─────────────────────────────────────────────

export const EMPLOYER_CLIENT_TYPE = {
  INDIVIDUAL: "individual",
  BUSINESS: "business",
  ORGANIZATION: "organization",
  CAMPUS_GROUP: "campus_group",
} as const;

export type EmployerClientType =
  (typeof EMPLOYER_CLIENT_TYPE)[keyof typeof EMPLOYER_CLIENT_TYPE];

// ── Verification status ─────────────────────────────────────

export const EMPLOYER_VERIFICATION_STATUS = {
  NOT_STARTED: "not_started",
  PENDING: "pending",
  VERIFIED: "verified",
  REJECTED: "rejected",
  ACTION_REQUIRED: "action_required",
} as const;

export type EmployerVerificationStatus =
  (typeof EMPLOYER_VERIFICATION_STATUS)[keyof typeof EMPLOYER_VERIFICATION_STATUS];

// ── Work preference ─────────────────────────────────────────

export const EMPLOYER_WORK_PREFERENCE = {
  REMOTE: "remote",
  ON_SITE: "on_site",
  HYBRID: "hybrid",
} as const;

export type EmployerWorkPreference =
  (typeof EMPLOYER_WORK_PREFERENCE)[keyof typeof EMPLOYER_WORK_PREFERENCE];

// ── Draft (form data model) ─────────────────────────────────
// Mirrors what the future backend employer-profile API would accept.
// Backend owns status, completion %, verification and publication.
// Sensitive fields (e.g. phone, business contact) are private and only
// surfaced where the backend explicitly allows them publicly.

export interface EmployerOnboardingDraft {
  applicationId?: string;
  userId: string;
  status: EmployerOnboardingStatus;
  currentStep: EmployerOnboardingStepId;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  adminMessage?: string;
  reviewReason?: string;
  approvedSlug?: string;

  clientType: EmployerClientType | "";

  profile: {
    displayName?: string;
    headline?: string;
    about?: string;
    industry?: string;
    website?: string;
    logoUrl?: string | null;
  };

  organization: {
    name?: string;
    businessType?: string;
    industry?: string;
    description?: string;
    size?: string;
    website?: string;
  };

  contact: {
    email?: string;
    phone?: string;
    preferredContact?: string;
  };

  location: {
    campusId?: string;
    city?: string;
    state?: string;
    workPreference?: EmployerWorkPreference | "";
    remoteAvailable?: boolean;
  };

  preferences: {
    categories: string[];
    experience?: string;
    workType?: string;
    projectDuration?: string;
    budgetMin?: number;
    budgetMax?: number;
  };

  verification: {
    status: EmployerVerificationStatus;
    type?: string;
    note?: string;
  };
}

// ── Submission result ───────────────────────────────────────

export const EMPLOYER_SUBMIT_RESULT = {
  SUBMITTED: "submitted",
  MISSING_INFORMATION: "missing_information",
  ALREADY_SUBMITTED: "already_submitted",
  CONFLICT: "conflict",
} as const;

export type EmployerSubmitResult =
  (typeof EMPLOYER_SUBMIT_RESULT)[keyof typeof EMPLOYER_SUBMIT_RESULT];

// ── Profile update payload (mass-assignment safe) ────────────
// Only editable fields are included. Never send status, verification,
// userId, applicationId, approvedSlug, adminMessage, reviewReason,
// currentStep, submittedAt, or clientType — those are backend-owned.

export interface EmployerProfileUpdatePayload {
  /** A new logo to upload; null removes it; undefined leaves it unchanged. */
  logoFile?: File | null;
  profile?: {
    displayName?: string;
    headline?: string;
    about?: string;
    industry?: string;
    website?: string;
    logoUrl?: string | null;
  };
  organization?: {
    name?: string;
    businessType?: string;
    industry?: string;
    description?: string;
    size?: string;
    website?: string;
  };
  contact?: {
    email?: string;
    phone?: string;
    preferredContact?: string;
  };
  location?: {
    campusId?: string;
    city?: string;
    state?: string;
    workPreference?: EmployerWorkPreference | "";
    remoteAvailable?: boolean;
  };
  preferences?: {
    categories?: string[];
    experience?: string;
    workType?: string;
    projectDuration?: string;
    budgetMin?: number;
    budgetMax?: number;
  };
}

// ── Public employer profile (server-side store lookup) ───────
// Only fields the backend deems public. Contact details and internal
// notes are never part of this projection. openJobs mirrors the
// Opportunity "public pick" returned by the data layer.

export interface EmployerPublicProfile {
  userId: string;
  name: string;
  descriptor: string;
  about: string;
  location: string;
  logoUrl?: string | null;
  website?: string;
  organizationSize?: string;
  verified: boolean;
  slug: string;
  openJobs: Pick<
    Opportunity,
    "id" | "title" | "summary" | "budget" | "duration" | "experienceLevel" | "postedAt" | "location"
  >[];
}
