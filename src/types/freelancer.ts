// ============================================================
// FREELANCER ONBOARDING TYPES  (Module 22)
// ============================================================
//
// Backend-authoritative projections for the freelancer onboarding flow.
// The frontend collects user input; the backend owns status, completion %,
// approval, and verification. This file defines the data model, step IDs,
// labels, and type guards.

// ── Onboarding status ───────────────────────────────────────

export const FREELANCER_ONBOARDING_STATUS = {
  DRAFT: "DRAFT",
  IN_PROGRESS: "IN_PROGRESS",
  PENDING_REVIEW: "PENDING_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  SUSPENDED: "SUSPENDED",
} as const;

export type FreelancerOnboardingStatus =
  (typeof FREELANCER_ONBOARDING_STATUS)[keyof typeof FREELANCER_ONBOARDING_STATUS];

// ── Steps ───────────────────────────────────────────────────

export const FREELANCER_ONBOARDING_STEP = {
  PROFILE: 1,
  SKILLS: 2,
  EXPERIENCE: 3,
  EDUCATION: 4,
  CERTIFICATIONS: 5,
  PORTFOLIO: 6,
  RATES: 7,
  AVAILABILITY: 8,
  PREFERENCES: 9,
  REVIEW: 10,
} as const;

export type FreelancerOnboardingStepId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const FREELANCER_ONBOARDING_STEPS = 10;

// ── Step labels & descriptions ──────────────────────────────

export const FL_ONBOARDING_STEP_LABELS: Record<FreelancerOnboardingStepId, string> = {
  1: "Profile",
  2: "Skills & Categories",
  3: "Experience",
  4: "Education",
  5: "Certifications",
  6: "Portfolio",
  7: "Rates",
  8: "Availability",
  9: "Work Preferences",
  10: "Review & Submit",
};

export const FL_ONBOARDING_STEP_DESCRIPTIONS: Record<FreelancerOnboardingStepId, string> = {
  1: "Your professional headline, bio and photo.",
  2: "What work do you do and which skills do you have?",
  3: "Show clients what you've done before.",
  4: "Your educational background (optional).",
  5: "Certifications that strengthen your profile.",
  6: "Showcase projects you've worked on.",
  7: "Your hourly and project rates.",
  8: "When are you available to work?",
  9: "How do you prefer to work?",
  10: "Review everything and submit your profile.",
};

// ── Blocking statuses ───────────────────────────────────────

export const BLOCKING_FREELANCER_STATUSES: FreelancerOnboardingStatus[] = [
  FREELANCER_ONBOARDING_STATUS.PENDING_REVIEW,
  FREELANCER_ONBOARDING_STATUS.APPROVED,
  FREELANCER_ONBOARDING_STATUS.REJECTED,
  FREELANCER_ONBOARDING_STATUS.SUSPENDED,
];

export function isFlBlockingStatus(status: FreelancerOnboardingStatus | null | undefined): boolean {
  if (!status) return false;
  return BLOCKING_FREELANCER_STATUSES.includes(status);
}

// ── Availability ────────────────────────────────────────────

export const FREELANCER_AVAILABILITY_STATUS = {
  AVAILABLE_NOW: "available_now",
  AVAILABLE_LATER: "available_later",
  NOT_AVAILABLE: "not_available",
} as const;

export type FreelancerAvailabilityStatus =
  (typeof FREELANCER_AVAILABILITY_STATUS)[keyof typeof FREELANCER_AVAILABILITY_STATUS];

// ── Sub-types ───────────────────────────────────────────────

export interface FreelancerExperience {
  id: string;
  jobTitle: string;
  company: string;
  startDate: string; // "YYYY-MM"
  endDate?: string;
  currentlyWorking: boolean;
  location?: string;
  employmentType: string;
  description: string;
}

export interface FreelancerEducation {
  id: string;
  institution: string;
  qualification: string;
  fieldOfStudy: string;
  startYear: string;
  endYear?: string;
  description?: string;
}

export interface FreelancerCertification {
  id: string;
  name: string;
  issuingOrganization: string;
  issueDate: string; // "YYYY-MM"
  expirationDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export interface FreelancerPortfolioItem {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  skills: string[];
  externalUrl?: string;
  completionDate?: string;
  visible: boolean;
  /** Optional category this project belongs to (Module 23B portfolio manager). */
  categoryId?: string;
}

// ── Onboarding draft (form data model) ──────────────────────
// Mirrors what the future backend API accepts. Backend owns status,
// completion %, approval and publication.

export interface FreelancerOnboardingDraft {
  applicationId?: string;
  userId: string;
  status: FreelancerOnboardingStatus;
  currentStep: FreelancerOnboardingStepId;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  adminMessage?: string;
  approvedSlug?: string;

  profile: {
    headline?: string;
    bio?: string;
    photoUrl?: string | null;
    /** The uploaded image behind `photoUrl`. */
    photoMediaId?: string | null;
    campusId?: string;
    city?: string;
    remoteAvailable?: boolean;
  };

  categories: string[];
  skills: string[];

  experience: FreelancerExperience[];
  education: FreelancerEducation[];
  certifications: FreelancerCertification[];
  portfolio: FreelancerPortfolioItem[];

  rates: {
    hourlyRate?: number;
    projectRate?: number;
    negotiable: boolean;
  };

  availability: {
    status: FreelancerAvailabilityStatus;
    workingDays: string[];
    workingHoursStart: string;
    workingHoursEnd: string;
    timezone: string;
  };

  preferences: {
    workArrangements: string[];
    projectTypes: string[];
  };
}

// ── Submission result ───────────────────────────────────────

export const FREELANCER_SUBMIT_RESULT = {
  SUBMITTED: "submitted",
  MISSING_INFORMATION: "missing_information",
  ALREADY_SUBMITTED: "already_submitted",
} as const;

export type FreelancerSubmitResult =
  (typeof FREELANCER_SUBMIT_RESULT)[keyof typeof FREELANCER_SUBMIT_RESULT];

type ValuesOf<T> = T[keyof T];
